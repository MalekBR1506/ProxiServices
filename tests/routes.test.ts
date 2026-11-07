import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    user: { findUnique: fn(), create: fn(), update: fn() },
    category: { findUnique: fn(), findMany: fn() },
    provider: { findUnique: fn(), findUniqueOrThrow: fn(), update: fn() },
    providerCategory: { deleteMany: fn(), createMany: fn() },
    service: { findUnique: fn(), findMany: fn(), updateMany: fn(), update: fn(), create: fn() },
    portfolioItem: { findMany: fn(), deleteMany: fn(), update: fn(), create: fn() },
    availability: { findMany: fn(), deleteMany: fn(), createMany: fn() },
    booking: { findUnique: fn(), findUniqueOrThrow: fn(), findMany: fn(), create: fn(), updateMany: fn(), count: fn() },
    review: { create: fn(), aggregate: fn() },
    problemAnalysis: { findUnique: fn(), create: fn(), update: fn() },
    $transaction: fn(),
    $queryRaw: fn(),
  };
});

vi.mock('@/server/db', () => ({ prisma: db }));
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(async () => true), hash: vi.fn(async () => 'test-password-hash') } }));

import bcrypt from 'bcrypt';
import { Prisma } from '@/generated/prisma/client';
import { createSession } from '@/server/auth';
import { addDaysToKey, tunisDateKey, tunisInstant, weekdayOfKey } from '@/lib/time';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as register } from '@/app/api/auth/register/route';
import { GET as getBookings, POST as createBooking } from '@/app/api/bookings/route';
import { GET as getBooking, PATCH as patchBooking } from '@/app/api/bookings/[id]/route';
import { PUT as updateProvider } from '@/app/api/providers/[id]/route';
import { GET as getSlots } from '@/app/api/providers/[id]/slots/route';
import { PUT as putAvailability } from '@/app/api/providers/[id]/availability/route';
import { POST as createReview } from '@/app/api/reviews/route';
import { GET as getAnalysis } from '@/app/api/analyses/[id]/route';

const client = { id: 'client_1', name: 'Client One', email: 'client@example.tn', phone: '+216 20 000 001', role: 'CLIENT', lat: 36.8, lng: 10.1, addressLabel: 'Tunis' };
const otherClient = { ...client, id: 'client_2', email: 'other@example.tn' };
const providerUser = { ...client, id: 'provider_user_1', email: 'provider@example.tn', phone: '+216 20 000 002', role: 'PROVIDER' };
const otherProvider = { ...providerUser, id: 'provider_user_2' };
const users = [client, otherClient, providerUser, otherProvider];
type Identity = typeof client;

// A Monday at least a week ahead, so every slot is in the future.
let MONDAY = addDaysToKey(tunisDateKey(new Date()), 7);
while (weekdayOfKey(MONDAY) !== 1) MONDAY = addDaysToKey(MONDAY, 1);
const at = (hour: number, date = MONDAY) => tunisInstant(date, hour * 60);
const HOURS = [{ weekday: 1, startTime: '08:00', endTime: '12:00' }];
const SERVICE = { id: 'svc_1', providerId: 'profile_1', active: true, price: new Prisma.Decimal(75), priceType: 'HOURLY', durationMin: 60, category: { slug: 'plumber' } };

const bookingRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'booking_1', clientId: client.id, providerId: 'profile_1', serviceId: 'svc_1',
  startAt: at(10), endAt: at(11), address: 'Tunis', lat: 36.8, lng: 10.1, notes: '', problemSummary: 'Leak',
  price: new Prisma.Decimal(50), priceType: 'FIXED', status: 'PENDING',
  acceptedAt: null, rejectedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
  createdAt: new Date(), updatedAt: new Date(),
  client: { id: client.id, name: client.name, phone: client.phone },
  provider: { id: 'profile_1', userId: providerUser.id, user: { id: providerUser.id, name: providerUser.name, phone: providerUser.phone } },
  service: { id: 'svc_1', title: 'Leak repair', durationMin: 60 }, review: null,
  ...overrides,
});

async function call(path: string, { method = 'GET', body, as }: { method?: string; body?: unknown; as?: Identity } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (as) headers.cookie = `proxiservice_session=${await createSession(as.id, as.role)}`;
  return new NextRequest(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const ctx = (id: string) => ({ params: { id } });
const patch = async (action: string, as: Identity, id = 'booking_1') => patchBooking(await call(`/api/bookings/${id}`, { method: 'PATCH', body: { action }, as }), ctx(id));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SESSION_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
  db.user.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => {
    if (where.id) return users.find((user) => user.id === where.id) ?? null;
    return where.email === client.email ? { ...client, passwordHash: 'hash' } : null;
  });
  db.$transaction.mockImplementation(async (arg: unknown) => (typeof arg === 'function' ? arg(db) : Promise.all(arg as unknown[])));
  db.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 3 } });
  db.availability.findMany.mockResolvedValue(HOURS);
  db.booking.findMany.mockResolvedValue([]);
  db.problemAnalysis.findUnique.mockResolvedValue({ id: 'analysis_1', clientId: client.id, status: 'CONFIRMED', categorySlug: 'plumber', urgency: 'MEDIUM', summary: 'Confirmed leak under the kitchen sink.', messages: [], expiresAt: null });
  db.booking.updateMany.mockResolvedValue({ count: 1 });
});

describe('auth', () => {
  it('logs in, sets an HttpOnly cookie and never returns the token', async () => {
    const response = await login(await call('/api/auth/login', { method: 'POST', body: { email: client.email, password: 'Demo1234' } }));
    expect(response.status).toBe(200);
    expect(response.cookies.get('proxiservice_session')?.httpOnly).toBe(true);
    expect(JSON.stringify(await response.json())).not.toMatch(/token|passwordHash/);
  });

  describe('GET /api/analyses/[id]', () => {
    it('returns an owned analysis for reopening/editing', async () => {
      db.problemAnalysis.findUnique.mockResolvedValue({
        id: 'analysis_1', clientId: client.id, status: 'CONFIRMED', categorySlug: 'plumber',
        urgency: 'MEDIUM', summary: 'Confirmed leak under the kitchen sink.', messages: [{ role: 'user', content: 'sink leak' }],
        expiresAt: null,
      });
      const response = await getAnalysis(await call('/api/analyses/analysis_1', { as: client }), ctx('analysis_1'));
      expect(response.status).toBe(200);
      expect((await response.json()).data.id).toBe('analysis_1');
    });

    it('does not expose another client\'s analysis', async () => {
      db.problemAnalysis.findUnique.mockResolvedValue({ id: 'analysis_1', clientId: otherClient.id, status: 'CONFIRMED' });
      const response = await getAnalysis(await call('/api/analyses/analysis_1', { as: client }), ctx('analysis_1'));
      expect(response.status).toBe(404);
    });
  });

  it('rejects a wrong password with 401 and no cookie', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    const response = await login(await call('/api/auth/login', { method: 'POST', body: { email: client.email, password: 'nope' } }));
    expect(response.status).toBe(401);
    expect(response.cookies.get('proxiservice_session')).toBeUndefined();
  });

  it('rejects malformed login and registration input with 400', async () => {
    expect((await login(await call('/api/auth/login', { method: 'POST', body: { email: 'x' } }))).status).toBe(400);
    expect((await register(await call('/api/auth/register', { method: 'POST', body: { email: 'bad', password: 'x' } }))).status).toBe(400);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a duplicate email', async () => {
    db.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }));
    const response = await register(await call('/api/auth/register', { method: 'POST', body: { name: 'Dup', email: client.email, phone: '+216 20 111 222', password: 'Demo1234' } }));
    expect(response.status).toBe(409);
  });

  it('/me is 401 without a session or with a forged token, 200 with one', async () => {
    expect((await me(await call('/api/auth/me'))).status).toBe(401);
    const forged = new NextRequest('http://localhost/api/auth/me', { headers: { cookie: 'proxiservice_session=eyJhbGciOiJIUzI1NiJ9.e30.forged' } });
    expect((await me(forged)).status).toBe(401);
    expect((await me(await call('/api/auth/me', { as: client }))).status).toBe(200);
  });

  it('clears the cookie on logout', async () => {
    expect((await logout()).cookies.get('proxiservice_session')?.value).toBe('');
  });
});

describe('GET /api/providers/[id]/slots', () => {
  it('returns free slots split by duration, minus held bookings', async () => {
    db.service.findUnique.mockResolvedValue(SERVICE);
    db.booking.findMany.mockResolvedValue([{ startAt: at(9), endAt: at(10) }]);
    const response = await getSlots(await call(`/api/providers/profile_1/slots?serviceId=svc_1&from=${MONDAY}&days=7`), ctx('profile_1'));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.days).toHaveLength(7);
    expect(data.days[0]).toEqual({ date: MONDAY, weekday: 1, slots: [8, 10, 11].map((h) => at(h).toISOString()) });
    expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ providerId: 'profile_1', status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } }),
    }));
  });

  it('400 for bad query, 404 for a service of another provider', async () => {
    expect((await getSlots(await call('/api/providers/profile_1/slots?serviceId=svc_1&days=99'), ctx('profile_1'))).status).toBe(400);
    expect((await getSlots(await call('/api/providers/profile_1/slots'), ctx('profile_1'))).status).toBe(400);
    db.service.findUnique.mockResolvedValue({ ...SERVICE, providerId: 'someone_else' });
    expect((await getSlots(await call('/api/providers/profile_1/slots?serviceId=svc_1'), ctx('profile_1'))).status).toBe(404);
  });
});

describe('POST /api/bookings', () => {
  const body = (hour = 10) => ({
    analysisId: 'analysis_1',
    providerId: 'profile_1', serviceId: 'svc_1', startAt: at(hour).toISOString(),
    address: 'El Menzah 5, Tunis', lat: 36.84, lng: 10.18, problemSummary: 'Leaking pipe',
  });
  const post = async (payload: unknown, as: Identity = client) => createBooking(await call('/api/bookings', { method: 'POST', body: payload, as }));

  it('requires a session (401) and the client role (403)', async () => {
    expect((await createBooking(await call('/api/bookings', { method: 'POST', body: body() }))).status).toBe(401);
    expect((await post(body(), providerUser)).status).toBe(403);
  });

  it('rejects missing or unknown fields with 400', async () => {
    expect((await post({ providerId: 'p', serviceId: 's' })).status).toBe(400);
    expect((await post({ ...body(), price: 1 })).status).toBe(400); // clients cannot send a price
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('creates the booking in a transaction with a provider lock and the DB price', async () => {
    db.service.findUnique.mockResolvedValue(SERVICE);
    db.booking.create.mockResolvedValue(bookingRow());
    const response = await post(body());
    expect(response.status).toBe(201);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1); // SELECT ... FOR UPDATE on the provider row
    const { data } = db.booking.create.mock.calls[0][0];
    expect(Number(data.price)).toBe(75);
    expect(data.priceType).toBe('HOURLY');
    expect(data.clientId).toBe(client.id);
    expect(data.endAt.getTime() - data.startAt.getTime()).toBe(60 * 60_000);
    expect(data.problemSummary).toBe('Confirmed leak under the kitchen sink.');
  });

  it('returns 409 when the slot was taken in the meantime (double booking)', async () => {
    db.service.findUnique.mockResolvedValue(SERVICE);
    db.booking.findMany.mockResolvedValue([{ startAt: at(10), endAt: at(11) }]);
    const response = await post(body());
    expect(response.status).toBe(409);
    expect(db.booking.create).not.toHaveBeenCalled();
  });

  it('returns 400 outside working hours, off the grid, or for another provider\'s service', async () => {
    db.service.findUnique.mockResolvedValue(SERVICE);
    expect((await post(body(14))).status).toBe(400);
    expect((await post({ ...body(), startAt: new Date(at(10).getTime() + 15 * 60_000).toISOString() })).status).toBe(400);
    db.service.findUnique.mockResolvedValue({ ...SERVICE, providerId: 'someone_else' });
    expect((await post(body())).status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/bookings and /api/bookings/[id]', () => {
  it('lists only the caller\'s bookings', async () => {
    await getBookings(await call('/api/bookings', { as: client }));
    expect(db.booking.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { clientId: client.id } }));
    await getBookings(await call('/api/bookings', { as: providerUser }));
    expect(db.booking.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { provider: { userId: providerUser.id } } }));
  });

  it('returns 403 to anyone who is not a party, 404 when missing', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow());
    expect((await getBooking(await call('/api/bookings/booking_1', { as: otherClient }), ctx('booking_1'))).status).toBe(403);
    expect((await getBooking(await call('/api/bookings/booking_1', { as: otherProvider }), ctx('booking_1'))).status).toBe(403);
    db.booking.findUnique.mockResolvedValue(null);
    expect((await getBooking(await call('/api/bookings/nope', { as: client }), ctx('nope'))).status).toBe(404);
  });

  it('hides phone numbers until the provider accepts', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow());
    let { data } = await (await getBooking(await call('/api/bookings/booking_1', { as: client }), ctx('booking_1'))).json();
    expect(data.provider.phone).toBeNull();
    expect(data.actions).toEqual(['CANCEL']);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'ACCEPTED' }));
    ({ data } = await (await getBooking(await call('/api/bookings/booking_1', { as: client }), ctx('booking_1'))).json());
    expect(data.provider.phone).toBe(providerUser.phone);
  });
});

describe('PATCH /api/bookings/[id] transitions', () => {
  it('provider accepts a pending booking with a status-guarded update', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow());
    db.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'ACCEPTED' }));
    const response = await patch('ACCEPT', providerUser);
    expect(response.status).toBe(200);
    expect(db.booking.updateMany).toHaveBeenCalledWith({ where: { id: 'booking_1', status: 'PENDING' }, data: expect.objectContaining({ status: 'ACCEPTED', acceptedAt: expect.any(Date) }) });
  });

  it('returns 409 when the booking changed concurrently', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow());
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    expect((await patch('ACCEPT', providerUser)).status).toBe(409);
  });

  it('rejects actions the role or status does not allow with 400', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow());
    expect((await patch('ACCEPT', client)).status).toBe(400);
    expect((await patch('COMPLETE', providerUser)).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'IN_PROGRESS' }));
    expect((await patch('CANCEL', client)).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'COMPLETED' }));
    expect((await patch('REJECT', providerUser)).status).toBe(400);
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });

  it('allows Start only on the day of the booking', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'ACCEPTED' })); // a week ahead
    expect((await patch('START', providerUser)).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'ACCEPTED', startAt: new Date() }));
    db.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'IN_PROGRESS' }));
    expect((await patch('START', providerUser)).status).toBe(200);
  });

  it('Complete increments jobsDone', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'IN_PROGRESS' }));
    db.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'COMPLETED' }));
    expect((await patch('COMPLETE', providerUser)).status).toBe(200);
    expect(db.provider.update).toHaveBeenCalledWith({ where: { id: 'profile_1' }, data: { jobsDone: { increment: 1 } } });
  });

  it('client cancels their own booking; others get 403', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'ACCEPTED' }));
    db.booking.findUniqueOrThrow.mockResolvedValue(bookingRow({ status: 'CANCELLED' }));
    expect((await patch('CANCEL', client)).status).toBe(200);
    expect((await patch('CANCEL', otherClient)).status).toBe(403);
    expect((await patch('ACCEPT', otherProvider)).status).toBe(403);
  });

  it('400 for an unknown action', async () => {
    expect((await patch('PAY', providerUser)).status).toBe(400);
  });
});

describe('POST /api/reviews', () => {
  const review = async (as: Identity, rating = 4) => createReview(await call('/api/reviews', { method: 'POST', body: { bookingId: 'booking_1', rating, comment: 'Great work' }, as }));

  it('403 for providers and for someone else\'s booking', async () => {
    expect((await review(providerUser)).status).toBe(403);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'COMPLETED' }));
    expect((await review(otherClient)).status).toBe(403);
  });

  it('400 for an out-of-range rating or a booking that is not completed', async () => {
    expect((await review(client, 9)).status).toBe(400);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'ACCEPTED' }));
    expect((await review(client)).status).toBe(400);
  });

  it('409 when the booking was already reviewed', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'COMPLETED', review: { id: 'r1', rating: 5, comment: 'x', createdAt: new Date() } }));
    expect((await review(client)).status).toBe(409);
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'COMPLETED' }));
    db.review.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }));
    expect((await review(client)).status).toBe(409);
  });

  it('creates the review and updates the provider rating in the same transaction', async () => {
    db.booking.findUnique.mockResolvedValue(bookingRow({ status: 'COMPLETED' }));
    db.review.create.mockResolvedValue({ id: 'review_1' });
    expect((await review(client)).status).toBe(201);
    expect(db.provider.update).toHaveBeenCalledWith({ where: { id: 'profile_1' }, data: { ratingAvg: 4, ratingCount: 3 } });
  });
});

describe('provider profile and availability', () => {
  const ownProfile = { id: 'profile_1', userId: providerUser.id, categories: [{ category: { slug: 'plumber' } }] };
  const week = (overrides: Record<number, object> = {}) => [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday, enabled: weekday !== 0, startTime: '08:00', endTime: '17:00', ...overrides[weekday],
  }));

  it('403 when editing another provider\'s profile or as a client', async () => {
    db.provider.findUnique.mockResolvedValue({ ...ownProfile, userId: 'different_user' });
    expect((await updateProvider(await call('/api/providers/profile_1', { method: 'PUT', body: { bio: 'x' }, as: providerUser }), ctx('profile_1'))).status).toBe(403);
    expect((await updateProvider(await call('/api/providers/profile_1', { method: 'PUT', body: { bio: 'x' }, as: client }), ctx('profile_1'))).status).toBe(403);
    expect(db.provider.update).not.toHaveBeenCalled();
  });

  it('400 for non-whitelisted fields', async () => {
    const response = await updateProvider(await call('/api/providers/profile_1', { method: 'PUT', body: { ratingAvg: 5, verified: true }, as: providerUser }), ctx('profile_1'));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('403 when updating a service that belongs to another provider', async () => {
    db.provider.findUnique.mockResolvedValue(ownProfile);
    db.category.findMany.mockResolvedValue([{ id: 'cat_plumber', slug: 'plumber' }]);
    db.service.findMany.mockResolvedValue([]);
    const response = await updateProvider(await call('/api/providers/profile_1', { method: 'PUT', as: providerUser, body: {
      services: [{ id: 'svc_other', title: 'Leak repair', price: 50, priceType: 'FIXED', durationMinutes: 60 }],
    } }), ctx('profile_1'));
    expect(response.status).toBe(403);
    expect(db.service.update).not.toHaveBeenCalled();
  });

  it('replaces weekly hours with only the enabled days', async () => {
    db.provider.findUnique.mockResolvedValue(ownProfile);
    const response = await putAvailability(await call('/api/providers/profile_1/availability', { method: 'PUT', body: { days: week({ 6: { enabled: false } }) }, as: providerUser }), ctx('profile_1'));
    expect(response.status).toBe(200);
    expect(db.availability.deleteMany).toHaveBeenCalledWith({ where: { providerId: 'profile_1' } });
    expect(db.availability.createMany.mock.calls[0][0].data.map((d: { weekday: number }) => d.weekday)).toEqual([1, 2, 3, 4, 5]);
  });

  it('validates hours (400) and ownership (403)', async () => {
    const put = async (days: unknown, as: Identity = providerUser) => putAvailability(await call('/api/providers/profile_1/availability', { method: 'PUT', body: { days }, as }), ctx('profile_1'));
    expect((await put(week().slice(1))).status).toBe(400);
    expect((await put(week({ 1: { startTime: '17:00', endTime: '09:00' } }))).status).toBe(400);
    expect((await put(week({ 1: { startTime: '8am' } }))).status).toBe(400);
    db.provider.findUnique.mockResolvedValue({ ...ownProfile, userId: 'different_user' });
    expect((await put(week())).status).toBe(403);
    expect((await put(week(), client)).status).toBe(403);
    expect(db.availability.deleteMany).not.toHaveBeenCalled();
  });
});
