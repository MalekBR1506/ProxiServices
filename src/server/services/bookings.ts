import { Prisma } from '@/generated/prisma/client';
import type { BookingStatus, UserRole } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { isSameTunisDay } from '@/lib/time';
import { busyBetween, checkSlot, workingHours } from '@/server/services/availability';
import { ServiceError } from '@/server/services/errors';
import type { BookingAction } from '@/types';

type Db = Prisma.TransactionClient;
export interface Viewer { id: string; role: UserRole }

export type StatusAction = Exclude<BookingAction, 'REVIEW'>;
export const STATUS_ACTIONS = ['ACCEPT', 'REJECT', 'START', 'COMPLETE', 'CANCEL'] as const satisfies readonly StatusAction[];

const ACTION_RESULT: Record<StatusAction, { status: BookingStatus; stamp: 'acceptedAt' | 'rejectedAt' | 'startedAt' | 'completedAt' | 'cancelledAt' }> = {
  ACCEPT: { status: 'ACCEPTED', stamp: 'acceptedAt' },
  REJECT: { status: 'REJECTED', stamp: 'rejectedAt' },
  START: { status: 'IN_PROGRESS', stamp: 'startedAt' },
  COMPLETE: { status: 'COMPLETED', stamp: 'completedAt' },
  CANCEL: { status: 'CANCELLED', stamp: 'cancelledAt' },
};

/** Phone numbers are shared only once the provider has accepted. */
export const PHONE_VISIBLE: BookingStatus[] = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

export interface BookingState { status: BookingStatus; startAt: Date; hasReview: boolean }

/** The single source of truth for what each party may do with a booking right now. */
export function allowedActions(role: UserRole, booking: BookingState, now = new Date()): BookingAction[] {
  const { status, startAt, hasReview } = booking;
  if (role === 'PROVIDER') {
    if (status === 'PENDING') return startAt > now ? ['ACCEPT', 'REJECT'] : ['REJECT'];
    if (status === 'ACCEPTED') return isSameTunisDay(startAt, now) ? ['START'] : [];
    if (status === 'IN_PROGRESS') return ['COMPLETE'];
    return [];
  }
  if (role === 'CLIENT') {
    if (status === 'PENDING' || status === 'ACCEPTED') return ['CANCEL'];
    if (status === 'COMPLETED' && !hasReview) return ['REVIEW'];
  }
  return [];
}

export function isParty(viewer: Viewer, booking: { clientId: string; provider: { userId: string } }) {
  return viewer.role === 'CLIENT' ? booking.clientId === viewer.id : viewer.role === 'PROVIDER' && booking.provider.userId === viewer.id;
}

const userPublic = { select: { id: true, name: true, phone: true } } as const;
export const bookingInclude = {
  client: userPublic,
  provider: { select: { id: true, userId: true, user: userPublic } },
  service: { select: { id: true, title: true, durationMin: true } },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
} satisfies Prisma.BookingInclude;
export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Loads a booking for one of its two parties; 404 if missing, 403 for anyone else. */
export async function getBookingForViewer(viewer: Viewer, id: string, db: Db = prisma) {
  const booking = await db.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new ServiceError(404, 'Booking not found.');
  if (!isParty(viewer, booking)) throw new ServiceError(403, 'You are not part of this booking.');
  return booking;
}

/** Applies a status action; re-checks the rules inside the transaction and guards against concurrent changes. */
export async function performBookingAction(viewer: Viewer, id: string, action: StatusAction, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const booking = await getBookingForViewer(viewer, id, tx);
    const allowed = allowedActions(viewer.role, { status: booking.status, startAt: booking.startAt, hasReview: !!booking.review }, now);
    if (!allowed.includes(action)) throw new ServiceError(400, 'That action is not available for this booking right now.');
    const { status, stamp } = ACTION_RESULT[action];
    const result = await tx.booking.updateMany({ where: { id, status: booking.status }, data: { status, [stamp]: now } });
    if (result.count === 0) throw new ServiceError(409, 'This booking was just updated. Refresh and try again.');
    if (action === 'COMPLETE') await tx.provider.update({ where: { id: booking.providerId }, data: { jobsDone: { increment: 1 } } });
    return tx.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  });
}

export interface NewBooking {
  providerId: string; serviceId: string; startAt: Date; address: string; lat: number; lng: number;
  problemSummary?: string; notes: string; analysisId: string;
}

/** Creates a booking after re-checking the slot inside a transaction that locks the provider row. */
export async function createBooking(client: Viewer, input: NewBooking, now = new Date()) {
  if (client.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can create bookings.');
  return prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({ where: { id: input.serviceId }, include: { category: true } });
    if (!service || !service.active) throw new ServiceError(404, 'Service not found.');
    if (service.providerId !== input.providerId) throw new ServiceError(400, 'This service does not belong to that provider.');
    const analysis = await tx.problemAnalysis.findUnique({ where: { id: input.analysisId } });
    if (!analysis || analysis.clientId !== client.id) throw new ServiceError(404, 'Analysis not found.');
    if (analysis.status !== 'CONFIRMED') throw new ServiceError(400, 'Confirm your problem analysis before booking.');
    if (analysis.expiresAt && analysis.expiresAt <= now) throw new ServiceError(400, 'This analysis has expired. Start a new request.');
    if (analysis.categorySlug !== service.category.slug) throw new ServiceError(400, 'This provider does not match your confirmed request.');
    // Serialise concurrent bookings for the same provider so the overlap check below is reliable.
    await tx.$queryRaw`SELECT id FROM Provider WHERE id = ${service.providerId} FOR UPDATE`;
    const endAt = new Date(input.startAt.getTime() + service.durationMin * 60_000);
    const [hours, busy] = await Promise.all([
      workingHours(tx, service.providerId), busyBetween(tx, service.providerId, input.startAt, endAt),
    ]);
    const check = checkSlot({ hours, durationMin: service.durationMin, startAt: input.startAt, busy, now });
    if (check === 'PAST') throw new ServiceError(400, 'Choose a future time.');
    if (check === 'OUTSIDE_HOURS') throw new ServiceError(400, 'That time is outside the provider\'s working hours.');
    if (check === 'TAKEN') throw new ServiceError(409, 'This time slot was just taken. Please choose another one.');
    return tx.booking.create({ data: {
      clientId: client.id, providerId: service.providerId, serviceId: service.id,
      analysisId: analysis.id,
      startAt: input.startAt, endAt, address: input.address, lat: input.lat, lng: input.lng,
      notes: input.notes, problemSummary: analysis.summary,
      price: service.price, priceType: service.priceType, // snapshot from the DB, never from the client
    }, include: bookingInclude });
  });
}

/** Recomputes a provider's rating from its reviews. */
export async function refreshProviderRating(tx: Db, providerId: string) {
  const stats = await tx.review.aggregate({ where: { providerId }, _avg: { rating: true }, _count: { _all: true } });
  await tx.provider.update({ where: { id: providerId }, data: {
    ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10, ratingCount: stats._count._all,
  } });
}

/** A client reviews their own completed booking, once; the provider's rating is updated in the same transaction. */
export async function createReview(viewer: Viewer, input: { bookingId: string; rating: number; comment: string }) {
  if (viewer.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can leave reviews.');
  try {
    return await prisma.$transaction(async (tx) => {
      const booking = await getBookingForViewer(viewer, input.bookingId, tx);
      if (booking.status !== 'COMPLETED') throw new ServiceError(400, 'Only completed bookings can be reviewed.');
      if (booking.review) throw new ServiceError(409, 'You already reviewed this booking.');
      const review = await tx.review.create({ data: {
        bookingId: booking.id, clientId: viewer.id, providerId: booking.providerId, rating: input.rating, comment: input.comment,
      } });
      await refreshProviderRating(tx, booking.providerId);
      return review;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ServiceError(409, 'You already reviewed this booking.');
    }
    throw error;
  }
}
