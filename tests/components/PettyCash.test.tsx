import {
  describe, it, expect, vi, beforeAll, afterEach,
} from 'vitest';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PettyCashPageClient } from '@/app/(dashboard)/money/petty-cash/PettyCashPageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// DateFilter (added in the next task) calls these unconditionally.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/petty-cash',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
});

const rows = [
  {
    id: 'p1', date: '2026-06-10', type: 'expense', details: 'Office supplies',
    amount: '2400', currency: 'PHP', exRate: '0.0170', amountEur: '300',
  },
  {
    id: 'p2', date: '2026-05-10', type: 'topup', details: 'Cash top-up',
    amount: '60000', currency: 'PHP', exRate: '0.0170', amountEur: '1000',
  },
];

describe('Petty Cash grid columns', () => {
  // Scoped to the grid: the mini-dashboard's balance table (added later in this
  // file) also renders a Month column and 'YYYY-MM' text, and the default
  // range here is the current year, wide enough to overlap both tables.
  it('shows a Month column', () => {
    render(<PettyCashPageClient initialRows={rows} />);
    const grid = within(screen.getByRole('table', { name: 'Petty Cash' }));
    expect(grid.getByRole('columnheader', { name: 'Month' })).toBeInTheDocument();
  });

  it('fills the Month column from each transaction date', () => {
    render(<PettyCashPageClient initialRows={rows} />);
    const grid = within(screen.getByRole('table', { name: 'Petty Cash' }));
    expect(grid.getByText('2026-06')).toBeInTheDocument();
    expect(grid.getByText('2026-05')).toBeInTheDocument();
  });

  it('no longer shows a Type column in the grid', () => {
    render(<PettyCashPageClient initialRows={rows} />);
    const grid = within(screen.getByRole('table', { name: 'Petty Cash' }));
    expect(grid.queryByRole('columnheader', { name: 'Type' })).not.toBeInTheDocument();
  });
});

const JUNE = { range: 'custom', from: '2026-06-01', to: '2026-06-30' };
const MAY_TO_JUNE = { range: 'custom', from: '2026-05-01', to: '2026-06-30' };

describe('Petty Cash period filtering', () => {
  it('offers the date filter', () => {
    render(<PettyCashPageClient initialRows={rows} initialRange={JUNE} />);
    expect(screen.getByRole('button', { name: 'This year' })).toBeInTheDocument();
  });

  it('narrows the grid to the selected period', () => {
    render(<PettyCashPageClient initialRows={rows} initialRange={JUNE} />);
    expect(screen.getByText('Office supplies')).toBeInTheDocument();
    expect(screen.queryByText('Cash top-up')).not.toBeInTheDocument();
  });

  // Scoped to the summary strip: the balance table's per-month figures can
  // coincide with a card's total for the same period (e.g. a single-month
  // range's closing balance), so an unscoped query would be ambiguous.
  it('scopes the top-up and expense cards to the selected period', () => {
    render(<PettyCashPageClient initialRows={rows} initialRange={JUNE} />);
    const cards = within(screen.getByTestId('petty-cash-summary'));
    // June holds the 300 expense and no top-up
    expect(cards.getByText('€300.00')).toBeInTheDocument();
    expect(cards.getByText('€0.00')).toBeInTheDocument();
  });

  it('widens those cards when the period widens', () => {
    render(<PettyCashPageClient initialRows={rows} initialRange={MAY_TO_JUNE} />);
    const cards = within(screen.getByTestId('petty-cash-summary'));
    expect(cards.getByText('€1,000.00')).toBeInTheDocument();
    expect(cards.getByText('€300.00')).toBeInTheDocument();
  });

  // Balance is cash on hand, not net movement: May's top-up counts toward
  // June's closing balance even though May is outside the range. If it were
  // scoped like the other two cards, June alone would read -€300.00.
  it('keeps the Balance cumulative regardless of the period start', () => {
    const { unmount } = render(<PettyCashPageClient initialRows={rows} initialRange={JUNE} />);
    const cardsJune = within(screen.getByTestId('petty-cash-summary'));
    expect(cardsJune.getByText('€700.00')).toBeInTheDocument();
    expect(cardsJune.queryByText('-€300.00')).not.toBeInTheDocument();
    unmount();

    render(<PettyCashPageClient initialRows={rows} initialRange={MAY_TO_JUNE} />);
    const cardsRange = within(screen.getByTestId('petty-cash-summary'));
    expect(cardsRange.getByText('€700.00')).toBeInTheDocument();
  });

  it('labels the Balance card with the period end date', () => {
    render(<PettyCashPageClient initialRows={rows} initialRange={JUNE} />);
    expect(screen.getByText('as of 30 Jun 2026')).toBeInTheDocument();
  });
});

describe('Petty Cash search narrows the summary cards', () => {
  it('follows a search typed into the grid box, not just the period', async () => {
    const user = userEvent.setup();
    // A second June expense, added locally so the count is meaningful — the
    // shared `rows` fixture above keeps its own expectations untouched.
    const rowsWithSecondExpense = [
      ...rows,
      {
        id: 'p3', date: '2026-06-20', type: 'expense', details: 'Team snacks',
        amount: '2700', currency: 'PHP', exRate: '0.0170', amountEur: '45.50',
      },
    ];
    render(<PettyCashPageClient initialRows={rowsWithSecondExpense} initialRange={JUNE} />);
    // Scoped to the summary strip: the balance table (added later in this
    // file) follows the date filter only, so it keeps showing June's
    // combined €345.50 even after the grid is searched — an unscoped query
    // for that figure would still find it there.
    const cards = within(screen.getByTestId('petty-cash-summary'));

    // Before searching: both June expenses count toward the card.
    expect(cards.getByText('€345.50')).toBeInTheDocument();
    expect(cards.getByText('2 entries')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search...'), 'Office');

    // The grid narrows to the one matching row...
    expect(screen.getByText('Office supplies')).toBeInTheDocument();
    expect(screen.queryByText('Team snacks')).not.toBeInTheDocument();

    // ...and the Expenses card follows it: amount and entry count both drop.
    expect(cards.getByText('€300.00')).toBeInTheDocument();
    expect(cards.getByText('1 entry')).toBeInTheDocument();
    expect(cards.queryByText('€345.50')).not.toBeInTheDocument();
    expect(cards.queryByText('2 entries')).not.toBeInTheDocument();
  });
});

describe('Petty Cash edit/save payload', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('never sends the derived `month` field in the PATCH body', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return { ok: true, json: async () => ({ row: {} }) };
      return { ok: true, json: async () => ({ rows: [] }) };
    }));

    render(<PettyCashPageClient initialRows={rows} />);

    await user.click(screen.getByText('Office supplies'));
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const patchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
        .find(([, init]) => init?.method === 'PATCH');
      expect(patchCall).toBeDefined();
    });

    const patchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
      .find(([, init]) => init?.method === 'PATCH')!;
    expect(patchCall[0]).toBe('/api/tables/petty_cash_transactions/p1');
    const body = JSON.parse((patchCall[1] as RequestInit).body as string);
    expect(body).not.toHaveProperty('month');
  });
});

// Jan holds a 1000 top-up and a 200 expense; Feb nothing; Mar a 300 expense.
// So Jan closes at 800, Feb carries 800 straight through, Mar closes at 500.
const monthlyRows = [
  {
    id: 'm1', date: '2026-01-10', type: 'topup', details: 'Cash top-up',
    amount: '1000', currency: 'EUR', exRate: '1', amountEur: '1000',
  },
  {
    id: 'm2', date: '2026-01-15', type: 'expense', details: 'Supplies',
    amount: '200', currency: 'EUR', exRate: '1', amountEur: '200',
  },
  {
    id: 'm3', date: '2026-03-05', type: 'expense', details: 'Water',
    amount: '300', currency: 'EUR', exRate: '1', amountEur: '300',
  },
];

const Q1 = { range: 'custom', from: '2026-01-01', to: '2026-03-31' };

describe('Petty Cash mini-dashboard', () => {
  it('shows a top-ups chart and an expenses chart', () => {
    render(<PettyCashPageClient initialRows={monthlyRows} initialRange={Q1} />);
    expect(screen.getByText(/^Top-ups ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Expenses ·/)).toBeInTheDocument();
  });

  // `title` and `metric` are independent props on adjacent, near-identical
  // TrendChart lines in PettyCashPageClient — transposing them would leave
  // the heading-text assertions above green while the charts bound to the
  // wrong series. TrendChart renders its series total (formatEuroExact) as
  // headline text, so pinning the totals pins the data binding, not just
  // the label. monthlyRows: Jan topup 1000; Jan expense 200 + Mar expense
  // 300 = 500 total.
  it('binds each chart to its own series, not a transposed one', () => {
    render(<PettyCashPageClient initialRows={monthlyRows} initialRange={Q1} />);
    // Scoped to each chart's own heading, not just present-anywhere-on-the-
    // page: both totals would still appear even if the metrics were swapped
    // between the two charts, just under the other chart's heading.
    const topups = screen.getByText(/^Top-ups ·/).parentElement!;
    expect(within(topups).getByText('€1,000')).toBeInTheDocument();
    const expenses = screen.getByText(/^Expenses ·/).parentElement!;
    expect(within(expenses).getByText('€500')).toBeInTheDocument();
  });

  it('lists every month of the range in the balance table', () => {
    render(<PettyCashPageClient initialRows={monthlyRows} initialRange={Q1} />);
    const table = screen.getByRole('table', { name: 'Monthly balance' });
    expect(within(table).getByText('2026-01')).toBeInTheDocument();
    expect(within(table).getByText('2026-02')).toBeInTheDocument();
    expect(within(table).getByText('2026-03')).toBeInTheDocument();
  });

  // The point of the table: February opens at exactly what January closed at.
  it('carries each closing balance into the next opening', () => {
    render(<PettyCashPageClient initialRows={monthlyRows} initialRange={Q1} />);
    const table = screen.getByRole('table', { name: 'Monthly balance' });
    const rows = within(table).getAllByRole('row');
    // rows[0] is the header; then Jan, Feb, Mar
    const cells = (i: number) => within(rows[i]).getAllByRole('cell').map((c) => c.textContent);

    expect(cells(1)).toEqual(['2026-01', '€0.00', '€1,000.00', '€200.00', '€800.00']);
    expect(cells(2)).toEqual(['2026-02', '€800.00', '€0.00', '€0.00', '€800.00']);
    expect(cells(3)).toEqual(['2026-03', '€800.00', '€0.00', '€300.00', '€500.00']);
  });

  it('leaves the balance table alone when the grid is searched', async () => {
    const user = userEvent.setup();
    render(<PettyCashPageClient initialRows={monthlyRows} initialRange={Q1} />);
    const table = screen.getByRole('table', { name: 'Monthly balance' });
    const before = within(table).getAllByRole('row').map((r) => r.textContent);

    // 'Water' matches one March row. The grid and the cards narrow; the
    // balance table must not, because a searched subset has no opening balance.
    await user.type(screen.getByPlaceholderText('Search...'), 'Water');

    // Control: prove the search actually filtered something. Without this,
    // the assertion below would pass the same way if applySearch regressed
    // to a no-op — the table would be "unchanged" because nothing happened.
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.queryByText('Supplies')).not.toBeInTheDocument();

    expect(within(table).getAllByRole('row').map((r) => r.textContent)).toEqual(before);
    expect(before).toHaveLength(4); // header + 3 months
  });
});

describe('Petty Cash balance date label', () => {
  // Fake timers break userEvent, which the other suites in this file use.
  // Scoped here so they cannot leak out of this block.
  afterEach(() => {
    vi.useRealTimers();
  });

  // The default This-year range ends 31 Dec, so the card was labelled with a
  // date five months into the future. The figure was right — it counts every
  // transaction — but the label read as an error to anyone checking the books.
  it('labels the balance with today when the period ends in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00Z'));

    render(<PettyCashPageClient initialRows={rows} initialRange={{ range: 'this_year' }} />);

    expect(screen.getByText('as of 6 Aug 2026')).toBeInTheDocument();
    expect(screen.queryByText('as of 31 Dec 2026')).not.toBeInTheDocument();
  });

  it('keeps the period end when it is already in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00Z'));

    render(
      <PettyCashPageClient
        initialRows={rows}
        initialRange={{ range: 'custom', from: '2026-01-01', to: '2026-01-31' }}
      />,
    );

    expect(screen.getByText('as of 31 Jan 2026')).toBeInTheDocument();
  });
});
