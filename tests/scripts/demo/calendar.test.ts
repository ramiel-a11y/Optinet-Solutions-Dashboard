import { describe, it, expect } from 'vitest';
import { dayOf, demoMonths, monthDiff, shiftMonth } from '@/scripts/demo/calendar';
import { rng, uuidFor } from '@/scripts/demo/random';

const TODAY = new Date(2026, 9, 13);

describe('calendar', () => {
  it('runs from January last year to the current month', () => {
    const m = demoMonths(TODAY);
    expect(m[0]).toBe('2025-01');
    expect(m.at(-1)).toBe('2026-10');
    expect(m).toHaveLength(22);
  });

  it('clamps a day past the end of the month instead of rolling over', () => {
    expect(dayOf('2026-02', 31, TODAY)).toBe('2026-02-28');
    expect(dayOf('2024-02', 31, TODAY)).toBe('2024-02-29');
    expect(dayOf('2026-04', 31, TODAY)).toBe('2026-04-30');
  });

  it('refuses a date after today', () => {
    expect(dayOf('2026-10', 13, TODAY)).toBe('2026-10-13');
    expect(dayOf('2026-10', 14, TODAY)).toBeNull();
  });

  it('shifts and compares months across a year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthDiff('2025-11', '2026-02')).toBe(3);
  });
});

describe('random', () => {
  it('repeats the same stream for the same key', () => {
    const a = rng('k');
    const b = rng('k');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('derives stable, distinct, v4-shaped UUIDs', () => {
    const ids = Array.from({ length: 5000 }, (_, i) => uuidFor(`key:${i}`));
    expect(new Set(ids).size).toBe(5000);
    expect(uuidFor('key:1')).toBe(ids[1]);
    for (const id of ids.slice(0, 50)) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
