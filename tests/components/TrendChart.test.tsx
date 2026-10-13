import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendChart, resolveClickTarget } from '@/components/dashboard/TrendChart';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// recharts' ResponsiveContainer measures its parent; jsdom reports 0x0 and the
// chart renders nothing. Force a size so the SVG mounts.
//
// recharts 3.x's SizeDetectorContainer reads the container's initial size via
// getBoundingClientRect() (not offsetWidth/offsetHeight) before its
// ResizeObserver ever fires, and our jsdom ResizeObserver polyfill is a no-op
// that never calls back — so getBoundingClientRect must also be stubbed, or
// the chart's SVG (and everything in it, including ReferenceLine) never
// mounts at all, regardless of metric.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
  Element.prototype.getBoundingClientRect = () => ({
    width: 800,
    height: 400,
    top: 0,
    left: 0,
    right: 800,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  });
});

// Real figures from January and March 2026. Deliberately not round thousands:
// the headline must show the true total, not a "€57k"-style rounding — €57,374
// displayed as "€57k" is what prompted this. Profit straddles zero on purpose,
// so the zero reference line has a domain to draw in.
const data = [
  { month: '2026-01', revenue: 57_374, expense: 84_965, profit: -27_591 },
  { month: '2026-03', revenue: 49_654, expense: 35_293, profit: 14_361 },
];

describe('TrendChart', () => {
  it('totals the requested metric, including a negative profit total', () => {
    render(<TrendChart data={data} metric="profit" title="Profit" label="2026" />);
    expect(screen.getByText('Profit · 2026')).toBeInTheDocument();
    // -27,591 + 14,361 = -13,230, shown in full rather than as -€13k
    expect(screen.getByText('-€13,230')).toBeInTheDocument();
    expect(screen.queryByText('-€13k')).not.toBeInTheDocument();
  });

  it('still totals revenue when asked for revenue', () => {
    render(<TrendChart data={data} metric="revenue" title="Revenue" label="2026" />);
    // 57,374 + 49,654 = 107,028, not "€107k"
    expect(screen.getByText('€107,028')).toBeInTheDocument();
    expect(screen.queryByText('€107k')).not.toBeInTheDocument();
  });

  it('keeps the vertical axis abbreviated so its labels stay readable', () => {
    const { container } = render(
      <TrendChart data={data} metric="revenue" title="Revenue" label="2026" />
    );
    // The axis ticks are the one place that must NOT become full figures.
    const ticks = [...container.querySelectorAll('.recharts-yAxis-tick-labels text')].map(
      (t) => t.textContent ?? ''
    );
    expect(ticks.length).toBeGreaterThan(0);
    // Abbreviated figures never contain a thousands separator; full ones always do.
    expect(ticks.every((t) => !t.includes(','))).toBe(true);
    expect(ticks.some((t) => t.endsWith('k'))).toBe(true);
  });

  it('no longer shows a peak readout', () => {
    render(<TrendChart data={data} metric="profit" title="Profit" label="2026" />);
    expect(screen.queryByText(/peak/i)).not.toBeInTheDocument();
  });

  it('only offers a pointer cursor when a drill-down path is given', () => {
    const { container: plain } = render(
      <TrendChart data={data} metric="profit" title="Profit" label="2026" />
    );
    expect(plain.querySelector('.cursor-pointer')).toBeNull();

    const { container: clickable } = render(
      <TrendChart data={data} metric="revenue" title="Revenue" label="2026" drillDownPath="/money/revenue" />
    );
    expect(clickable.querySelector('.cursor-pointer')).not.toBeNull();
  });

  it('draws a zero reference line only when the selected series dips negative', () => {
    const { container: profitContainer } = render(
      <TrendChart data={data} metric="profit" title="Profit" label="2026" />,
    );
    expect(profitContainer.querySelectorAll('.recharts-reference-line').length).toBeGreaterThan(0);

    const { container: revenueContainer } = render(
      <TrendChart data={data} metric="revenue" title="Revenue" label="2026" />,
    );
    expect(revenueContainer.querySelectorAll('.recharts-reference-line').length).toBe(0);
  });
});

describe('resolveClickTarget', () => {
  it('returns the month drill-down URL for a valid activeLabel and a path', () => {
    expect(resolveClickTarget({ activeLabel: '2026-03' }, '/money/revenue')).toBe(
      '/money/revenue?range=custom&from=2026-03-01&to=2026-03-31'
    );
  });

  it('returns null when no drillDownPath is given', () => {
    expect(resolveClickTarget({ activeLabel: '2026-03' }, undefined)).toBeNull();
  });

  it('returns null for a null or undefined state', () => {
    expect(resolveClickTarget(null, '/money/revenue')).toBeNull();
    expect(resolveClickTarget(undefined, '/money/revenue')).toBeNull();
  });

  it('returns null when activeLabel is not a string', () => {
    expect(resolveClickTarget({ activeLabel: 42 }, '/money/revenue')).toBeNull();
    expect(resolveClickTarget({}, '/money/revenue')).toBeNull();
  });
});
