import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesPageClient } from '@/app/(dashboard)/money/expenses/ExpensesPageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// DateFilter calls useRouter/usePathname unconditionally, even in controlled mode.
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
    id: 'e1', dateInvoice: '2026-03-10', periodMonth: '2026-03', invoiceNumber: 'E-PAID',
    supplierName: 'Registrar One', invoiceDetails: 'Domain renewal',
    amount: '100', currency: 'EUR', exRate: '1', amountEur: '100',
    fundsPaid: true,
  },
  {
    id: 'e2', dateInvoice: '2026-03-11', periodMonth: '2026-03', invoiceNumber: 'E-UNPAID',
    supplierName: 'Cloudnest', invoiceDetails: 'Software seats, design team',
    amount: '300', currency: 'EUR', exRate: '1', amountEur: '300',
    fundsPaid: false,
  },
];

const YEAR = { range: 'custom', from: '2026-01-01', to: '2026-12-31' };

function renderPage() {
  render(<ExpensesPageClient initialRows={rows} initialRange={YEAR} />);
}

describe('Expenses paid filter', () => {
  it('shows every entry under All', () => {
    renderPage();
    expect(screen.getByText('E-PAID')).toBeInTheDocument();
    expect(screen.getByText('E-UNPAID')).toBeInTheDocument();
  });

  it('shows only the paid ones under Paid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(screen.getByText('E-PAID')).toBeInTheDocument();
    expect(screen.queryByText('E-UNPAID')).not.toBeInTheDocument();
  });

  it('shows only the unpaid ones under Not paid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    expect(screen.getByText('E-UNPAID')).toBeInTheDocument();
    expect(screen.queryByText('E-PAID')).not.toBeInTheDocument();
  });

  it('narrows the summary cards to match a search', async () => {
    const user = userEvent.setup();
    renderPage();

    // whole period first: 100 + 300
    expect(screen.getByText('€400.00')).toBeInTheDocument();

    // the reported case: searching left 1 row on screen under a total
    // covering everything. The cards must now follow.
    await user.type(screen.getByPlaceholderText('Search...'), 'Software');

    expect(screen.queryByText('€400.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('€300.00').length).toBeGreaterThan(0);
    expect(screen.getByText('E-UNPAID')).toBeInTheDocument();
    expect(screen.queryByText('E-PAID')).not.toBeInTheDocument();
  });

  it('keeps the summary cards on the whole period in every state', async () => {
    const user = userEvent.setup();
    renderPage();

    // Total Expenses = 100 + 300 across the period
    expect(screen.getByText('€400.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(screen.getByText('€400.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    expect(screen.getByText('€400.00')).toBeInTheDocument();
  });
});
