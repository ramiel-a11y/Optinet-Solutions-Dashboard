import {
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears,
  startOfDay, endOfDay, subDays, differenceInCalendarDays, parseISO, isValid, format,
} from 'date-fns';

export type RangeKey = 'this_year' | 'last_12_months' | 'custom';

export type DateRange = { key: RangeKey; from: Date; to: Date; label: string };

export type RangeParams = { range?: string; from?: string; to?: string };

// Map URL search params to a concrete date range. `now` is injectable for tests.
// Anything unrecognized (or an invalid custom range) falls back to This year.
export function resolveRange(params: RangeParams, now: Date = new Date()): DateRange {
  switch (params.range) {
    case 'this_year':
      return { key: 'this_year', from: startOfYear(now), to: endOfYear(now), label: format(now, 'yyyy') };
    case 'last_12_months':
      return {
        key: 'last_12_months',
        from: startOfMonth(subMonths(now, 11)),
        to: endOfMonth(now),
        label: 'Last 12 months',
      };
    case 'custom': {
      const from = params.from ? parseISO(params.from) : null;
      const to = params.to ? parseISO(params.to) : null;
      if (from && to && isValid(from) && isValid(to) && from <= to) {
        return {
          key: 'custom',
          from: startOfDay(from),
          to: endOfDay(to),
          label: `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`,
        };
      }
      break; // invalid custom → fall through to default
    }
  }
  return { key: 'this_year', from: startOfYear(now), to: endOfYear(now), label: format(now, 'yyyy') };
}

// Whether a date value (Date or ISO-ish string) falls within [from, to], inclusive.
// Compares by yyyy-MM-dd strings so it's timezone-safe for day-level `date` columns.
export function dateInRange(value: unknown, from: Date, to: Date): boolean {
  if (value === null || value === undefined || value === '') return false;
  const v = (value instanceof Date ? format(value, 'yyyy-MM-dd') : String(value)).slice(0, 10);
  return v >= format(from, 'yyyy-MM-dd') && v <= format(to, 'yyyy-MM-dd');
}

// The equal-length period immediately before the given range, calendar-aware for
// presets (prior month / prior year / prior 12 months) and day-based for custom.
export function previousPeriod(range: DateRange): { from: Date; to: Date } {
  switch (range.key) {
    case 'this_year': {
      const d = subYears(range.from, 1);
      return { from: startOfYear(d), to: endOfYear(d) };
    }
    case 'last_12_months':
      return { from: startOfMonth(subMonths(range.from, 12)), to: endOfMonth(subMonths(range.from, 1)) };
    case 'custom':
    default: {
      const days = differenceInCalendarDays(range.to, range.from) + 1;
      const to = endOfDay(subDays(range.from, 1));
      const from = startOfDay(subDays(to, days - 1));
      return { from, to };
    }
  }
}
