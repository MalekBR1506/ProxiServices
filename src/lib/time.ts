// Africa/Tunis is UTC+1 all year (no DST). The DB stores UTC; these helpers convert
// between UTC instants and Tunis wall-clock dates ("YYYY-MM-DD") and times ("HH:MM").

export const TUNIS_TZ = 'Africa/Tunis';
const OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Tunis calendar date of an instant, e.g. "2026-11-07". */
export function tunisDateKey(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Tunis weekday of an instant, 0 = Sunday. */
export function tunisWeekday(date: Date): number {
  return new Date(date.getTime() + OFFSET_MS).getUTCDay();
}

/** Weekday of a Tunis date key. */
export function weekdayOfKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function addDaysToKey(dateKey: string, days: number): string {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** "HH:MM" → minutes after midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** UTC instant for a Tunis date key plus minutes after midnight. */
export function tunisInstant(dateKey: string, minutes: number): Date {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + minutes * 60_000 - OFFSET_MS);
}

export function isSameTunisDay(a: Date, b: Date): boolean {
  return tunisDateKey(a) === tunisDateKey(b);
}

const formatters = {
  time: new Intl.DateTimeFormat('en-GB', { timeZone: TUNIS_TZ, hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat('en-GB', { timeZone: TUNIS_TZ, weekday: 'short', day: 'numeric', month: 'short' }),
  full: new Intl.DateTimeFormat('en-GB', { timeZone: TUNIS_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  dateTime: new Intl.DateTimeFormat('en-GB', { timeZone: TUNIS_TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
};

export const formatTime = (iso: string | Date) => formatters.time.format(new Date(iso));
export const formatDay = (iso: string | Date) => formatters.day.format(new Date(iso));
export const formatFullDate = (iso: string | Date) => formatters.full.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => formatters.dateTime.format(new Date(iso));
/** Formats a Tunis date key like "Mon 9 Nov". */
export const formatDayKey = (dateKey: string) => formatters.day.format(tunisInstant(dateKey, 12 * 60));
