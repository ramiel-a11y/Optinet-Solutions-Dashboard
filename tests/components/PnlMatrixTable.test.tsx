import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PnlMatrixTable } from '@/components/reports/PnlMatrixTable';
import { pnlView, type PnlMatrix } from '@/lib/derived/pnlMatrix';

const MATRIX: PnlMatrix = {
  revenue: [
    { key: 'holly-uuid', label: 'HOLLYMEAD', byMonth: { '2026-01': 31340 } },
    // No client fk behind this one — a 'raw:' key, so it must render but not link.
    // 20 is small enough that adding it to Jan revenue leaves the 74.1% margin
    // assertion below unchanged (rounds the same either way).
    { key: 'raw:cash sale', label: 'Cash Sale', byMonth: { '2026-01': 20 } },
  ],
  expenses: [
    { key: 'office expenses', label: 'Office expenses', byMonth: { '2026-01': 7730 } },
    { key: 'unclassified', label: 'Unclassified', byMonth: { '2026-02': 40 } },
    { key: 'petty cash', label: 'Petty Cash', byMonth: { '2026-01': 388.90 } },
  ],
};
const SPAN = { fromMonth: '2026-01', toMonth: '2026-02' };

function renderTable() {
  render(<PnlMatrixTable view={pnlView(MATRIX, SPAN)} span={SPAN} />);
}

// A figure appearing in a single month also appears in that row's Total, so most
// amounts render as TWO links. Collect every href for a given amount and assert the
// one we mean is among them. Links carry an aria-label of "<row>, <period>: <amount>"
// (see PnlMatrixTable's Cell), so match on the amount as a suffix rather than the
// whole accessible name.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hrefsFor = (amount: string) =>
  screen.getAllByRole('link', { name: new RegExp(`: ${escapeRegExp(amount)}$`) })
    .map((a) => a.getAttribute('href'));

describe('PnlMatrixTable', () => {
  it('heads a column per month plus a Total', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'Jan-26' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Feb-26' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument();
  });

  it('labels the two sections and the derived rows', () => {
    renderTable();
    for (const label of ['Revenue', 'Expenses', 'Total Revenue', 'Total Expenses', 'Profit / (Loss)', 'Profit margin %']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('links a revenue cell to that client and month', () => {
    renderTable();
    expect(hrefsFor('31,340')).toContain(
      '/money/revenue?range=custom&from=2026-01-01&to=2026-01-31&client=holly-uuid'
    );
  });

  it('links an expense cell to that classification and month', () => {
    renderTable();
    expect(hrefsFor('7,730')).toContain(
      '/money/expenses?range=custom&from=2026-01-01&to=2026-01-31&classification=Office%20expenses'
    );
  });

  // Petty Cash is an ordinary expense classification now that the statement charges
  // the monthly top-up invoice rather than the tin's itemised spending, so it must
  // drill into the expenses grid like every other row. No expense row is special-cased.
  it('links the Petty Cash row to the expenses grid like any other classification', () => {
    renderTable();
    expect(hrefsFor('389')).toContain(
      '/money/expenses?range=custom&from=2026-01-01&to=2026-01-31&classification=Petty%20Cash'
    );
  });

  it('links an unclassified cell by its label, so the grid can match empties', () => {
    renderTable();
    expect(hrefsFor('40')).toContain(
      '/money/expenses?range=custom&from=2026-02-01&to=2026-02-28&classification=Unclassified'
    );
  });

  it('widens a row Total to the whole span', () => {
    renderTable();
    expect(hrefsFor('7,730')).toContain(
      '/money/expenses?range=custom&from=2026-01-01&to=2026-02-28&classification=Office%20expenses'
    );
  });

  it('leaves an empty cell blank and unlinked, not a zero', () => {
    renderTable();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '0' })).not.toBeInTheDocument();
  });

  it('does not link a raw-keyed revenue row — there is no client record to filter by', () => {
    renderTable();
    const row = screen.getByText('Cash Sale').closest('tr')!;
    expect(row.querySelectorAll('a')).toHaveLength(0);
    expect(row.textContent).toContain('20');
  });

  it('does not link Total Expenses — it sums two tables no page holds together', () => {
    renderTable();
    const row = screen.getByText('Total Expenses').closest('tr')!;
    expect(row.querySelectorAll('a')).toHaveLength(0);
  });

  it('links Total Revenue to the revenue page for the span, with no row filter', () => {
    renderTable();
    const row = screen.getByText('Total Revenue').closest('tr')!;
    const hrefs = [...row.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/money/revenue?range=custom&from=2026-01-01&to=2026-02-28');
  });

  it('parenthesises a loss and shows the margin as a percentage', () => {
    renderTable();
    // Jan: 31,360 revenue (31,340 + the 20 raw-keyed row) − 8,118.90 expenses =
    // 23,241.10 profit, a 74.1% margin; Feb is a 40 loss with no revenue.
    expect(screen.getByText('(40)')).toBeInTheDocument();
    expect(screen.getByText('74.1%')).toBeInTheDocument();
  });

  it('shows an em dash for margin in a month with no revenue', () => {
    renderTable();
    const row = screen.getByText('Profit margin %').closest('tr')!;
    expect(row.textContent).toContain('—');
  });

  it('names a drill-down link by its row and month, not a bare number', () => {
    renderTable();
    expect(screen.getByRole('link', { name: 'HOLLYMEAD, Jan-26: 31,340' })).toBeInTheDocument();
  });

  it('names a Total-column link by its row and the whole range', () => {
    renderTable();
    // HOLLYMEAD has no February activity, so its row Total is still 31,340.
    expect(screen.getByRole('link', { name: 'HOLLYMEAD, Jan-26–Feb-26: 31,340' })).toBeInTheDocument();
  });
});
