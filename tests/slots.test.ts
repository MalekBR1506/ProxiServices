import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ prisma: {} })); // pure tests: no database
import { checkSlot, computeSlots } from '@/server/services/availability';
import { allowedActions } from '@/server/services/bookings';
import { addDaysToKey, tunisDateKey, tunisInstant, weekdayOfKey } from '@/lib/time';

const MONDAY = '2030-01-07'; // a Monday
const mondayHours = [{ weekday: 1, startTime: '08:00', endTime: '12:00' }];
const at = (time: string, date = MONDAY) => {
  const [h, m] = time.split(':').map(Number);
  return tunisInstant(date, h * 60 + m);
};
const longAgo = new Date('2020-01-01T00:00:00Z');
const slotsFor = (opts: Partial<Parameters<typeof computeSlots>[0]>) =>
  computeSlots({ hours: mondayHours, durationMin: 60, fromDate: MONDAY, days: 1, busy: [], now: longAgo, ...opts })[0].slots;

describe('Tunis time helpers', () => {
  it('treats Africa/Tunis as UTC+1 with no DST', () => {
    expect(at('08:00').toISOString()).toBe('2030-01-07T07:00:00.000Z');
    expect(at('08:00', '2030-07-08').toISOString()).toBe('2030-07-08T07:00:00.000Z');
    expect(tunisDateKey(new Date('2030-01-06T23:30:00Z'))).toBe(MONDAY); // 00:30 Monday in Tunis
    expect(weekdayOfKey(MONDAY)).toBe(1);
  });
});

describe('computeSlots', () => {
  it('splits working hours by the service duration', () => {
    expect(slotsFor({}).map((s) => new Date(s).toISOString())).toEqual(['07:00', '08:00', '09:00', '10:00'].map((t) => `2030-01-07T${t}:00.000Z`));
    expect(slotsFor({ durationMin: 90 })).toHaveLength(2); // 08:00, 09:30 — 11:00 would end after 12:00
    expect(slotsFor({ durationMin: 300 })).toHaveLength(0);
  });

  it('returns nothing on days without hours', () => {
    const days = computeSlots({ hours: mondayHours, durationMin: 60, fromDate: MONDAY, days: 7, busy: [], now: longAgo });
    expect(days.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDaysToKey(MONDAY, i)));
    expect(days.filter((d) => d.slots.length).map((d) => d.weekday)).toEqual([1]);
  });

  it('removes past times', () => {
    expect(slotsFor({ now: at('09:30') })).toEqual([at('10:00').toISOString(), at('11:00').toISOString()]);
  });

  it('removes slots overlapping existing bookings, including partial overlaps', () => {
    expect(slotsFor({ busy: [{ startAt: at('09:00'), endAt: at('10:00') }] })).not.toContain(at('09:00').toISOString());
    const partial = slotsFor({ busy: [{ startAt: at('09:30'), endAt: at('10:30') }] });
    expect(partial).toEqual([at('08:00').toISOString(), at('11:00').toISOString()]);
    // A booking ending exactly when a slot starts does not block it.
    expect(slotsFor({ busy: [{ startAt: at('07:00'), endAt: at('08:00') }] })).toContain(at('08:00').toISOString());
  });
});

describe('checkSlot', () => {
  const base = { hours: mondayHours, durationMin: 60, busy: [], now: longAgo };
  it('accepts a free slot on the grid', () => expect(checkSlot({ ...base, startAt: at('10:00') })).toBe('OK'));
  it('rejects past times', () => expect(checkSlot({ ...base, startAt: at('10:00'), now: at('10:30') })).toBe('PAST'));
  it('rejects times off the grid or outside hours', () => {
    expect(checkSlot({ ...base, startAt: at('10:15') })).toBe('OUTSIDE_HOURS');
    expect(checkSlot({ ...base, startAt: at('12:00') })).toBe('OUTSIDE_HOURS');
    expect(checkSlot({ ...base, startAt: at('10:00', addDaysToKey(MONDAY, 6)) })).toBe('OUTSIDE_HOURS'); // Sunday
  });
  it('rejects a taken slot (double booking)', () => {
    expect(checkSlot({ ...base, startAt: at('10:00'), busy: [{ startAt: at('10:00'), endAt: at('11:00') }] })).toBe('TAKEN');
  });
});

describe('allowedActions', () => {
  const now = at('09:00');
  const state = (status: Parameters<typeof allowedActions>[1]['status'], startAt = at('11:00'), hasReview = false) => ({ status, startAt, hasReview });

  it('provider: accept or reject pending; only reject once the time has passed', () => {
    expect(allowedActions('PROVIDER', state('PENDING'), now)).toEqual(['ACCEPT', 'REJECT']);
    expect(allowedActions('PROVIDER', state('PENDING', at('08:00')), now)).toEqual(['REJECT']);
  });
  it('provider: start only on the day, complete only in progress', () => {
    expect(allowedActions('PROVIDER', state('ACCEPTED'), now)).toEqual(['START']);
    expect(allowedActions('PROVIDER', state('ACCEPTED', at('11:00', addDaysToKey(MONDAY, 1))), now)).toEqual([]);
    expect(allowedActions('PROVIDER', state('IN_PROGRESS'), now)).toEqual(['COMPLETE']);
    expect(allowedActions('PROVIDER', state('COMPLETED'), now)).toEqual([]);
  });
  it('client: cancel pending/accepted; review completed once', () => {
    expect(allowedActions('CLIENT', state('PENDING'), now)).toEqual(['CANCEL']);
    expect(allowedActions('CLIENT', state('ACCEPTED'), now)).toEqual(['CANCEL']);
    expect(allowedActions('CLIENT', state('IN_PROGRESS'), now)).toEqual([]);
    expect(allowedActions('CLIENT', state('COMPLETED'), now)).toEqual(['REVIEW']);
    expect(allowedActions('CLIENT', state('COMPLETED', at('11:00'), true), now)).toEqual([]);
  });
});
