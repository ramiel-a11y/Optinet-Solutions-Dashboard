import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenuePageClient } from '@/app/(dashboard)/money/revenue/RevenuePageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
    id: 'r1', dateInvoice: '2026-01-15', periodMonth: '2026-01', invoiceNumber: '50151',
    clientId: 'holly', invoiceDetails: 'Staffing services 1/2026',
    amount: '28740', currency: 'EUR', exRate: '1', amountEur: '28740', fundsReceived: true,
  },
  {
    id: 'r2', dateInvoice: '2026-01-20', periodMonth: '2026-01', invoiceNumber: '50152',
    clientId: 'lumen-lower', invoiceDetails: 'Brand Protection 1/2026',
    amount: '1745', currency: 'EUR', exRate: '1', amountEur: '1745', fundsReceived: true,
  },
];

const clientLookup = { holly: 'HOLLYMEAD', 'lumen-lower': 'Lumenpath' };
const JAN = { range: 'custom', from: '2026-01-01', to: '2026-01-31' };

describe('Revenue drill-down by client', () => {
  it('shows only the drilled-down client', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} initialClientId="holly" />);
    expect(screen.getByText('50151')).toBeInTheDocument();
    expect(screen.queryByText('50152')).not.toBeInTheDocument();
  });

  it('totals only that client, so the card matches the P&L cell that was clicked', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} initialClientId="holly" />);
    // The only match is paid, so Total Revenue and Received both read 28,740 — two
    // cards carrying the same figure, as in RevenueClientSearch.test.tsx.
    expect(screen.getAllByText('€28,740.00')).toHaveLength(2);
    expect(screen.getByText('1 invoice')).toBeInTheDocument();
  });

  it('names the active filter with the client name, not the id', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} initialClientId="holly" />);
    // Asserted through the chip's own control: the client name also appears in the
    // grid's Client cell, so a bare getByText('HOLLYMEAD') matches two nodes.
    expect(screen.getByRole('button', { name: 'Clear HOLLYMEAD filter' })).toBeInTheDocument();
  });

  it('restores every row when the chip is cleared', async () => {
    const user = userEvent.setup();
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} initialClientId="holly" />);

    await user.click(screen.getByRole('button', { name: /clear .* filter/i }));

    expect(screen.getByText('50151')).toBeInTheDocument();
    expect(screen.getByText('50152')).toBeInTheDocument();
  });

  it('shows no chip and every row when no client is given', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup} initialRange={JAN} />);
    expect(screen.queryByRole('button', { name: /clear .* filter/i })).not.toBeInTheDocument();
    expect(screen.getByText('50152')).toBeInTheDocument();
  });

  it('shows nothing rather than everything for an unknown client id', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} initialClientId="nope" />);
    expect(screen.queryByText('50151')).not.toBeInTheDocument();
    expect(screen.queryByText('50152')).not.toBeInTheDocument();
  });
});

describe('Revenue page row-cap notice', () => {
  it('warns when the server-side row fetch hit its limit, since older rows are missing', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} truncated rowLimit={2000} />);
    expect(screen.getByText(/most recent 2,000 records/i)).toBeInTheDocument();
  });

  it('stays silent when the row fetch came in under the limit', () => {
    render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup}
      initialRange={JAN} />);
    expect(screen.queryByText(/most recent .* records/i)).not.toBeInTheDocument();
  });
});
