import type { BookingStatus, Prisma } from '@/generated/prisma/client';
import { addDaysToKey, toMinutes, tunisDateKey, tunisInstant, weekdayOfKey } from '@/lib/time';

type Db = Prisma.TransactionClient;

/** Bookings in these states hold their time slot. */
export const BLOCKING_STATUSES: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];

export interface WorkingHours { weekday: number; startTime: string; endTime: string }
export interface BusyInterval { startAt: Date; endAt: Date }
export interface DaySlots { date: string; weekday: number; slots: string[] }

export const MAX_SLOT_DAYS = 14;

/** Every slot start (UTC) on a Tunis date: working hours split by the service duration. */
export function gridForDay(hours: WorkingHours[], durationMin: number, dateKey: string): Date[] {
  const weekday = weekdayOfKey(dateKey);
  const starts: Date[] = [];
  for (const range of hours.filter((h) => h.weekday === weekday)) {
    const end = toMinutes(range.endTime);
    for (let t = toMinutes(range.startTime); t + durationMin <= end; t += durationMin) starts.push(tunisInstant(dateKey, t));
  }
  return starts.sort((a, b) => a.getTime() - b.getTime());
}

const overlaps = (start: Date, end: Date, busy: BusyInterval) => start < busy.endAt && end > busy.startAt;

/** Free slots = grid minus past times minus intervals already held by bookings. Pure. */
export function computeSlots(input: {
  hours: WorkingHours[]; durationMin: number; fromDate: string; days: number; busy: BusyInterval[]; now: Date;
}): DaySlots[] {
  const { hours, durationMin, fromDate, days, busy, now } = input;
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysToKey(fromDate, i);
    const slots = gridForDay(hours, durationMin, date)
      .filter((start) => start > now)
      .filter((start) => {
        const end = new Date(start.getTime() + durationMin * 60_000);
        return !busy.some((b) => overlaps(start, end, b));
      })
      .map((start) => start.toISOString());
    return { date, weekday: weekdayOfKey(date), slots };
  });
}

export type SlotCheck = 'OK' | 'PAST' | 'OUTSIDE_HOURS' | 'TAKEN';

/** Why a requested start time can or cannot be booked. Pure. */
export function checkSlot(input: { hours: WorkingHours[]; durationMin: number; startAt: Date; busy: BusyInterval[]; now: Date }): SlotCheck {
  const { hours, durationMin, startAt, busy, now } = input;
  if (startAt <= now) return 'PAST';
  const onGrid = gridForDay(hours, durationMin, tunisDateKey(startAt)).some((s) => s.getTime() === startAt.getTime());
  if (!onGrid) return 'OUTSIDE_HOURS';
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  return busy.some((b) => overlaps(startAt, endAt, b)) ? 'TAKEN' : 'OK';
}

export function busyBetween(db: Db, providerId: string, from: Date, to: Date) {
  return db.booking.findMany({
    where: { providerId, status: { in: BLOCKING_STATUSES }, startAt: { lt: to }, endAt: { gt: from } },
    select: { startAt: true, endAt: true },
  });
}

export function workingHours(db: Db, providerId: string) {
  return db.availability.findMany({ where: { providerId }, select: { weekday: true, startTime: true, endTime: true } });
}

/** Free slots for a provider's service over `days` Tunis dates starting at `fromDate`. */
export async function getProviderSlots(db: Db, args: { providerId: string; durationMin: number; fromDate: string; days: number; now?: Date }) {
  const now = args.now ?? new Date();
  const rangeStart = tunisInstant(args.fromDate, 0);
  const rangeEnd = tunisInstant(addDaysToKey(args.fromDate, args.days), 0);
  const [hours, busy] = await Promise.all([
    workingHours(db, args.providerId), busyBetween(db, args.providerId, rangeStart, rangeEnd),
  ]);
  return computeSlots({ hours, durationMin: args.durationMin, fromDate: args.fromDate, days: args.days, busy, now });
}

export interface WeekdayHours { weekday: number; enabled: boolean; startTime: string; endTime: string }

/** Replaces a provider's weekly hours: one range per enabled weekday. */
export async function replaceWorkingHours(db: Db, providerId: string, days: WeekdayHours[]) {
  await db.availability.deleteMany({ where: { providerId } });
  const rows = days.filter((d) => d.enabled).map(({ weekday, startTime, endTime }) => ({ providerId, weekday, startTime, endTime }));
  if (rows.length) await db.availability.createMany({ data: rows });
  return rows;
}
