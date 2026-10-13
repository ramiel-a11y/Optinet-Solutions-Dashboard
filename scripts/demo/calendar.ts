import { addDays, addMonths, eachMonthOfInterval, format, getDaysInMonth, parseISO } from 'date-fns';

// The demo runs from January 1 of last year to the run day, so the dashboard's default
// "This year" view and its comparison with last year both have data.
export function demoMonths(today: Date): string[] {
  return eachMonthOfInterval({ start: new Date(today.getFullYear() - 1, 0, 1), end: today })
    .map((d) => format(d, 'yyyy-MM'));
}

export const isoDay = (d: Date): string => format(d, 'yyyy-MM-dd');
export const currentMonth = (today: Date): string => format(today, 'yyyy-MM');

export function shiftMonth(month: string, delta: number): string {
  return format(addMonths(parseISO(`${month}-01`), delta), 'yyyy-MM');
}

// Whole months from a to b ('YYYY-MM'); positive when b is later.
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

// A day in a month, clamped to the month's length (the 31st of February is its last
// day). Null when that day is after today: nothing is ever dated in the future.
export function dayOf(month: string, day: number, today: Date): string | null {
  const last = getDaysInMonth(parseISO(`${month}-01`));
  const iso = `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
  return iso <= isoDay(today) ? iso : null;
}

export function plusDays(iso: string, days: number): string {
  return isoDay(addDays(parseISO(iso), days));
}
