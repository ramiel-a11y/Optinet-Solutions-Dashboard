import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesPageClient } from '@/app/(dashboard)/money/expenses/ExpensesPageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/expenses',
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
});

const rows = [
  {
    id: 'e1', dateInvoice: '2026-01-12', periodMonth: '2026-01', invoiceNumber: '5044',
    supplierName: 'Kestrel Solutions (CY) LTD', invoiceDetails: 'Advisory retainer',
    amount: '1188300', currency: 'PHP', exRate: '0.016666', amountEur: '19804',
    fundsPaid: true, expenseClassification: 'Professional Expenses',
  },
  {
    id: 'e2', dateInvoice: '2026-01-05', periodMonth: '2026-01', invoiceNumber: '5098712',
    supplierName: 'Hostwise', invoiceDetails: 'Cloud server plan',
    amount: '660', currency: 'PHP', exRate: '0.016666', amountEur: '11',
    fundsPaid: true, expenseClassification: 'office expenses',
  },
  {
    id: 'e3', dateInvoice: '2026-01-08', periodMonth: '2026-01', invoiceNumber: '51226',
    supplierName: 'Pixelforge', invoiceDetails: 'Design software seat',
    amount: '720', currency: 'PHP', exRate: '0.016666', amountEur: '12',
    fundsPaid: true, expenseClassification: 'Office Expenses',
  },
  {
    id: 'e4', dateInvoice: '2026-01-09', periodMonth: '2026-01', invoiceNumber: '99999',
    supplierName: 'Nobody', invoiceDetails: 'Uncategorised spend',
    amount: '600', currency: 'PHP', exRate: '0.016666', amountEur: '10',
    fundsPaid: true, expenseClassification: null,
  },
];

const JAN = { range: 'custom', from: '2026-01-01', to: '2026-01-31' };

describe('Expenses drill-down by classification', () => {
  it('pulls both casings of a merged classification, matching the P&L line', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN}
      initialClassification="Office expenses" />);
    expect(screen.getByText('5098712')).toBeInTheDocument();
    expect(screen.getByText('51226')).toBeInTheDocument();
    expect(screen.queryByText('5044')).not.toBeInTheDocument();
  });

  it('totals only the matched rows, so the card equals the P&L cell', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN}
      initialClassification="Office expenses" />);
    // 11 + 12, and both matches are paid — so Total Expenses and Paid read the same.
    expect(screen.getAllByText('€23.00')).toHaveLength(2);
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('filters to rows with no classification under Unclassified', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN}
      initialClassification="Unclassified" />);
    expect(screen.getByText('99999')).toBeInTheDocument();
    expect(screen.getByText('1 entry')).toBeInTheDocument();
  });

  it('names the active filter and restores every row when cleared', async () => {
    const user = userEvent.setup();
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN}
      initialClassification="Professional Expenses" />);

    // Through the chip's control: the label also appears in the grid's Classification
    // cell, so a bare getByText would match two nodes.
    expect(screen.getByRole('button', { name: 'Clear Professional Expenses filter' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear .* filter/i }));

    expect(screen.getByText('5044')).toBeInTheDocument();
    expect(screen.getByText('99999')).toBeInTheDocument();
  });

  it('shows no chip and every row when no classification is given', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN} />);
    expect(screen.queryByRole('button', { name: /clear .* filter/i })).not.toBeInTheDocument();
    expect(screen.getByText('5044')).toBeInTheDocument();
  });
});

describe('Expenses page row-cap notice', () => {
  it('warns when the server-side row fetch hit its limit, since older rows are missing', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN} truncated rowLimit={2000} />);
    expect(screen.getByText(/most recent 2,000 records/i)).toBeInTheDocument();
  });

  it('stays silent when the row fetch came in under the limit', () => {
    render(<ExpensesPageClient initialRows={rows} initialRange={JAN} />);
    expect(screen.queryByText(/most recent .* records/i)).not.toBeInTheDocument();
  });
});
