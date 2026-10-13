import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo } from 'react';
import { MonthAllocationClient } from '@/app/(dashboard)/money/month-allocation/MonthAllocationClient';
import { buildAllocationRows } from '@/lib/derived/monthAllocation';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// DateFilter calls useRouter/usePathname unconditionally; outside an App Router
// context those throw. This screen drives it in controlled mode.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/month-allocation',
  useSearchParams: () => new URLSearchParams(),
}));

// Regression guard for the MonthAllocationRow memo (see the test named
// 're-renders exactly the one row...' below). vi.mock calls are hoisted above
// the module body, so anything their factory touches must be hoisted too —
// hence vi.hoisted rather than a plain const (same pattern as
// InvoiceReminders.test.tsx).
const renderCounts = vi.hoisted(() => new Map<string, number>());

// Shape of the one prop this file's probe actually reads. The real Props type
// in MonthAllocationRow.tsx is not exported; this is deliberately loose about
// everything else the row receives.
type ProbeProps = { row: { key: string } } & Record<string, unknown>;
type RowModule = { MonthAllocationRow: { type: React.ComponentType<ProbeProps> } };

// Replaces the real MonthAllocationRow with a probe that renders the exact same
// component — `.type` unwraps memo's inner function — re-wrapped in a fresh
// memo(...) using React's default shallow comparator, the same one production
// uses. The only addition is a counter keyed by row.key, incremented each time
// this component's function body actually runs. Because memo decides whether
// that body runs at all, the counter is a faithful, deterministic stand-in for
// "did this row re-render": jsdom cannot measure milliseconds, but it can count
// renders exactly, which is what the test below relies on.
vi.mock('@/app/(dashboard)/money/month-allocation/MonthAllocationRow', async () => {
  const actual = await vi.importActual<RowModule>(
    '@/app/(dashboard)/money/month-allocation/MonthAllocationRow',
  );
  const RealRow = actual.MonthAllocationRow.type;
  return {
    MonthAllocationRow: memo(function MonthAllocationRowProbe(props: ProbeProps) {
      renderCounts.set(props.row.key, (renderCounts.get(props.row.key) ?? 0) + 1);
      return <RealRow {...props} />;
    }),
  };
});

const revenueRows = [
  {
    id: 'r1', dateInvoice: '2026-09-03', periodMonth: '2026-09', invoiceNumber: '501100',
    clientId: 'c-1', invoiceDetails: 'Brand Reputation Services 08/2026', amountEur: '1500',
  },
  {
    id: 'r2', dateInvoice: '2026-09-10', periodMonth: '2026-09', invoiceNumber: '501101',
    clientId: 'c-1', invoiceDetails: 'SEO 09/2026', amountEur: '900',
  },
];

const range = { range: 'custom', from: '2026-09-01', to: '2026-09-30' };

// A generated fixture for the render-count regression test below — large enough
// (60 rows, matching the count the reviewer probed by hand) that "one row
// re-rendered, not the rest" is a meaningful claim. Hand-writing 60 objects
// would obscure that point instead of demonstrating it.
function manyRevenueRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `gen-${i}`,
    dateInvoice: '2026-09-01',
    periodMonth: '2026-09',
    invoiceNumber: `GEN-${String(i).padStart(3, '0')}`,
    clientId: 'c-1',
    invoiceDetails: `Generated row ${i}`,
    amountEur: '100',
  }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ row: {} }) })));
  renderCounts.clear();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('MonthAllocationClient', () => {
  it('saves only the rows whose month was edited', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows} expenseRows={[]}
        clientLookup={{ 'c-1': 'HOLLYMEAD' }} initialRange={range}
      />
    );

    const input = screen.getByLabelText('Month for invoice 501100');
    await user.clear(input);
    await user.type(input, '2026-08');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('/api/tables/revenue_entries/r1');
    expect(calls[0][1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(calls[0][1].body)).toEqual({ periodMonth: '2026-08' });

    // The saved value becomes the new baseline — no reload, nothing left staged.
    await waitFor(() => expect(screen.getByText('0 unsaved')).toBeInTheDocument());
    expect(screen.getByLabelText('Month for invoice 501100')).toHaveValue('2026-08');
  });

  it('sends null, not an empty string, when the Month cell is cleared', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows} expenseRows={[]}
        clientLookup={{ 'c-1': 'HOLLYMEAD' }} initialRange={range}
      />
    );

    const input = screen.getByLabelText('Month for invoice 501100');
    await user.clear(input);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('/api/tables/revenue_entries/r1');
    const body = JSON.parse(calls[0][1].body);
    expect(body.periodMonth).toBeNull();
  });

  it('shifts every selected row back one month', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows} expenseRows={[]}
        clientLookup={{ 'c-1': 'HOLLYMEAD' }} initialRange={range}
      />
    );

    await user.click(screen.getByLabelText('Select all rows'));
    await user.click(screen.getByRole('button', { name: /shift back 1 month/i }));

    expect(screen.getByLabelText('Month for invoice 501100')).toHaveValue('2026-08');
    expect(screen.getByLabelText('Month for invoice 501101')).toHaveValue('2026-08');
    expect(screen.getByText('2 unsaved')).toBeInTheDocument();
  });

  it('hides rows that are still on their invoice month when filtering to re-allocated', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={[{ ...revenueRows[0], periodMonth: '2026-08' }, revenueRows[1]]}
        expenseRows={[]} clientLookup={{}} initialRange={range}
      />
    );

    await user.click(screen.getByLabelText('Re-allocated only'));

    expect(screen.getByText('501100')).toBeInTheDocument();
    expect(screen.queryByText('501101')).not.toBeInTheDocument();
  });

  it('keeps an edited row visible and saveable even after its month leaves the viewed range', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows} expenseRows={[]}
        clientLookup={{ 'c-1': 'HOLLYMEAD' }} initialRange={range}
      />
    );

    const input = screen.getByLabelText('Month for invoice 501100');
    await user.clear(input);
    await user.type(input, '2026-08');

    // Still rendered — the Sept-only view must not evict a row for the very edit in progress.
    expect(screen.getByLabelText('Month for invoice 501100')).toHaveValue('2026-08');
    expect(screen.getByText('1 unsaved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('/api/tables/revenue_entries/r1');
    expect(JSON.parse(calls[0][1].body)).toEqual({ periodMonth: '2026-08' });
  });

  it('edits one row without disturbing another', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows}
        expenseRows={[]}
        clientLookup={{ 'c-1': 'Evergreen Media' }}
        initialRange={range}
      />,
    );

    const first = screen.getByLabelText('Month for invoice 501100');
    const second = screen.getByLabelText('Month for invoice 501101');
    expect(second).toHaveValue('2026-09');

    await user.clear(first);
    await user.type(first, '2026-07');

    expect(first).toHaveValue('2026-07');
    expect(second).toHaveValue('2026-09');   // untouched
    expect(screen.getByText(/1 unsaved/)).toBeInTheDocument();
  });

  // Regression guard for the MonthAllocationRow memo. The whole value of that
  // change is "one row re-renders per keystroke, not all visible rows" — jsdom
  // cannot measure the millisecond timings that motivated it (that claim is
  // verified separately, in a browser, against a production build), but it CAN
  // count renders deterministically, via the probe mocked in above. If a future
  // change makes the row's props unstable — an inline handler, a new object
  // spread onto `row`, a dropped useCallback — every visible row goes back to
  // re-rendering on every keystroke, and this test fails loudly even though it
  // still cannot show milliseconds.
  it('re-renders exactly the one row that changed, not the other 59 visible rows', async () => {
    const user = userEvent.setup();
    const rows = manyRevenueRows(60);
    render(
      <MonthAllocationClient
        revenueRows={rows} expenseRows={[]}
        clientLookup={{ 'c-1': 'HOLLYMEAD' }} initialRange={range}
      />
    );

    const built = buildAllocationRows(rows, [], {});
    const editedRow = built.find((r) => r.invoiceNumber === 'GEN-000')!;
    const toggledRow = built.find((r) => r.invoiceNumber === 'GEN-001')!;

    // Mount renders every row once; only interactions from here on count.
    renderCounts.clear();

    const monthInput = screen.getByLabelText('Month for invoice GEN-000');
    await user.clear(monthInput);
    await user.type(monthInput, '2026-07');

    expect(Array.from(renderCounts.keys())).toEqual([editedRow.key]);

    renderCounts.clear();

    await user.click(screen.getByLabelText('Select invoice GEN-001'));

    expect(Array.from(renderCounts.keys())).toEqual([toggledRow.key]);
  });

  // A row's highlight and the unsaved counter must agree. They used different
  // baselines: `dirty` compared against what is stored, `edited` against the
  // month the server first sent — so after saving a row, typing its original
  // value back left the counter saying "1 unsaved" with nothing highlighted.
  it('highlights a row edited back to its original month after a save', async () => {
    const user = userEvent.setup();
    render(
      <MonthAllocationClient
        revenueRows={revenueRows}
        expenseRows={[]}
        clientLookup={{ 'c-1': 'Evergreen Media' }}
        initialRange={range}
      />,
    );

    const cell = screen.getByLabelText('Month for invoice 501100');

    // Save it onto a different month, so `stored` advances past `row.month`.
    await user.clear(cell);
    await user.type(cell, '2026-08');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getByText(/0 unsaved/)).toBeInTheDocument());

    // Now type the ORIGINAL server month back in.
    await user.clear(cell);
    await user.type(cell, '2026-09');

    expect(cell).toHaveValue('2026-09');
    expect(screen.getByText(/1 unsaved/)).toBeInTheDocument();
    // …and the row must be visibly marked, or there is no way to find it.
    expect(cell.closest('tr')).toHaveClass('bg-accent/20');
  });
});
