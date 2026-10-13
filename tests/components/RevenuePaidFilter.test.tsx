import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenuePageClient } from '@/app/(dashboard)/money/revenue/RevenuePageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// DateFilter calls useRouter/usePathname unconditionally, even in controlled mode.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/revenue',
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
});

const rows = [
  {
    id: 'r1', dateInvoice: '2026-03-10', periodMonth: '2026-03', invoiceNumber: 'PAID-1',
    clientId: null, invoiceDetails: 'Brand Protection Services',
    amount: '100', currency: 'EUR', exRate: '1', amountEur: '100',
    fundsReceived: true,
  },
  {
    id: 'r2', dateInvoice: '2026-03-11', periodMonth: '2026-03', invoiceNumber: 'UNPAID-1',
    clientId: null, invoiceDetails: 'Buy Links',
    amount: '200', currency: 'EUR', exRate: '1', amountEur: '200',
    fundsReceived: false,
  },
];

const YEAR = { range: 'custom', from: '2026-01-01', to: '2026-12-31' };

function renderPage() {
  render(<RevenuePageClient initialRows={rows} clientLookup={{}} initialRange={YEAR} />);
}

describe('Revenue paid filter', () => {
  it('shows every invoice under All', () => {
    renderPage();
    expect(screen.getByText('PAID-1')).toBeInTheDocument();
    expect(screen.getByText('UNPAID-1')).toBeInTheDocument();
  });

  it('shows only the paid ones under Paid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(screen.getByText('PAID-1')).toBeInTheDocument();
    expect(screen.queryByText('UNPAID-1')).not.toBeInTheDocument();
  });

  it('shows only the unpaid ones under Not paid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    expect(screen.getByText('UNPAID-1')).toBeInTheDocument();
    expect(screen.queryByText('PAID-1')).not.toBeInTheDocument();
  });

  it('returns to the full list when All is clicked again', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('PAID-1')).toBeInTheDocument();
    expect(screen.getByText('UNPAID-1')).toBeInTheDocument();
  });

  it('narrows the summary cards to match a search', async () => {
    const user = userEvent.setup();
    renderPage();

    // whole period first: 100 + 200
    expect(screen.getByText('€300.00')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search...'), 'Buy Links');

    expect(screen.queryByText('€300.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('€200.00').length).toBeGreaterThan(0);
    expect(screen.getByText('UNPAID-1')).toBeInTheDocument();
    expect(screen.queryByText('PAID-1')).not.toBeInTheDocument();
  });

  it('keeps the summary cards on the whole period in every state', async () => {
    const user = userEvent.setup();
    renderPage();

    // Total Revenue = 100 + 200 across the period
    expect(screen.getByText('€300.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    expect(screen.getByText('€300.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(screen.getByText('€300.00')).toBeInTheDocument();
  });
});
