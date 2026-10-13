import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PnlPageClient } from '@/app/(dashboard)/reports/pnl/PnlPageClient';
import type { PnlMatrix } from '@/lib/derived/pnlMatrix';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => '/reports/pnl',
  useSearchParams: () => new URLSearchParams(),
}));

const MATRIX: PnlMatrix = {
  revenue: [
    { key: 'holly', label: 'HOLLYMEAD', byMonth: { '2026-01': 31340, '2026-03': 24360 } },
  ],
  expenses: [
    { key: 'rent', label: 'Rent', byMonth: { '2026-01': 2765.40 } },
    { key: 'petty cash', label: 'Petty Cash', byMonth: { '2026-01': 388.90 } },
  ],
};
const SPAN = { fromMonth: '2026-01', toMonth: '2026-02' };

describe('PnlPageClient', () => {
  it('renders the statement for the span it was given', () => {
    render(<PnlPageClient matrix={MATRIX} initialSpan={SPAN} />);
    expect(screen.getByRole('columnheader', { name: 'Jan-26' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Mar-26' })).not.toBeInTheDocument();
  });

  it('re-renders the columns when the filter is applied, with no navigation', async () => {
    const user = userEvent.setup();
    render(<PnlPageClient matrix={MATRIX} initialSpan={SPAN} />);

    // Same reason as in MonthRangeFilter's own test: jsdom's month input does not
    // take keystrokes reliably.
    fireEvent.change(screen.getByLabelText('To month'), { target: { value: '2026-03' } });
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('columnheader', { name: 'Mar-26' })).toBeInTheDocument();
    // Scoped to the HOLLYMEAD row: Total Revenue and Profit/(Loss) also read 24,360 for
    // March, since it is the only revenue line and March has no expenses, so an
    // unscoped getByText would match three cells for reasons unrelated to this test.
    const hollymeadRow = screen.getByRole('row', { name: /HOLLYMEAD/ });
    expect(within(hollymeadRow).getByText('24,360')).toBeInTheDocument();
  });

  it('re-queries the server when Refresh is pressed', async () => {
    const user = userEvent.setup();
    refresh.mockClear();
    render(<PnlPageClient matrix={MATRIX} initialSpan={SPAN} />);

    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(refresh).toHaveBeenCalled();
  });

  it('explains that Petty Cash is the top-up charge, so the gap from the Petty Cash page reads as a decision', () => {
    render(<PnlPageClient matrix={MATRIX} initialSpan={SPAN} />);
    expect(screen.getByText(/monthly top-up/i)).toBeInTheDocument();
    expect(screen.getByText(/not added again/i)).toBeInTheDocument();
  });

  it('shows an empty-range message instead of a headerless table when the span yields no months', () => {
    // Firefox/Safari degrade the month inputs to plain text, so a span like this can
    // reach here from a hand-typed value that passed MonthRangeFilter's from<=to check
    // as a string comparison without actually parsing as two valid YYYY-MM months.
    render(<PnlPageClient matrix={MATRIX} initialSpan={{ fromMonth: '2026-6', toMonth: '2026-9' }} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/no months fall in that range/i)).toBeInTheDocument();
  });

  it('does not claim "0 months" or "€0 in" in the empty-range state', () => {
    render(<PnlPageClient matrix={MATRIX} initialSpan={{ fromMonth: '2026-6', toMonth: '2026-9' }} />);
    expect(screen.queryByText(/0 months/)).not.toBeInTheDocument();
    expect(screen.getByText(/pick a valid month range/i)).toBeInTheDocument();
  });
});

// Harbourline and Kestrel are invoiced under Professional Expenses, so excluding them
// shrinks that line rather than removing a row. In this fixture €28,390 of the line's
// €31,880 is theirs.
const RELATED: PnlMatrix = {
  revenue: [{ key: 'holly', label: 'HOLLYMEAD', byMonth: { '2026-03': 24360 }, excludableByMonth: {} }],
  expenses: [
    {
      key: 'professional expenses',
      label: 'Professional Expenses',
      byMonth: { '2026-03': 31880 },
      excludableByMonth: { '2026-03': 28390 },
    },
  ],
};
const MARCH = { fromMonth: '2026-03', toMonth: '2026-03' };

describe('PnlPageClient excluding the related companies', () => {
  const box = () => screen.getByRole('checkbox', { name: /exclude harbourline & kestrel/i });

  it('opens unticked, so the statement on load still reconciles with the expense records', () => {
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);
    expect(box()).not.toBeChecked();
    const row = screen.getByRole('row', { name: /Professional Expenses/ });
    expect(within(row).getAllByText('31,880').length).toBeGreaterThan(0);
  });

  it('shrinks the Professional Expenses line to what is left when ticked', async () => {
    const user = userEvent.setup();
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);

    await user.click(box());

    const row = screen.getByRole('row', { name: /Professional Expenses/ });
    expect(within(row).getAllByText('3,490').length).toBeGreaterThan(0);
    expect(within(row).queryByText('31,880')).not.toBeInTheDocument();
  });

  it('recomputes the headline from the reduced expenses, turning the loss into a profit', async () => {
    const user = userEvent.setup();
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);
    expect(screen.getByText(/€7,520 loss/)).toBeInTheDocument();

    await user.click(box());

    expect(screen.getByText(/€20,870 profit/)).toBeInTheDocument();
    expect(screen.queryByText(/loss/)).not.toBeInTheDocument();
  });

  it('sits to the left of the month range filter, next to the filter it qualifies', () => {
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);
    const position = box().compareDocumentPosition(screen.getByLabelText('From month'));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the exclusion in force after the month range is changed', async () => {
    const user = userEvent.setup();
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);
    await user.click(box());

    fireEvent.change(screen.getByLabelText('To month'), { target: { value: '2026-04' } });
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(box()).toBeChecked();
    const row = screen.getByRole('row', { name: /Professional Expenses/ });
    expect(within(row).getAllByText('3,490').length).toBeGreaterThan(0);
  });

  it('says in the footnote that the drill-down still lists the excluded invoices', () => {
    render(<PnlPageClient matrix={RELATED} initialSpan={MARCH} />);
    expect(screen.getByText(/drill-down still lists/i)).toBeInTheDocument();
  });
});
