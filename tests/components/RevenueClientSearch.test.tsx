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

// Two invoices for the same client, only one of which repeats the client's name
// in its Details. Searching the client used to return just that one row.
const rows = [
  {
    id: 'r1', dateInvoice: '2026-08-04', periodMonth: '2026-07', invoiceNumber: '501122',
    clientId: 'nwm', invoiceDetails: 'Brand Protection 7/2026 - nwmmarketingservices@example.com',
    amount: '1400', currency: 'EUR', exRate: '1', amountEur: '1400', fundsReceived: false,
  },
  {
    id: 'r2', dateInvoice: '2026-07-07', periodMonth: '2026-06', invoiceNumber: '501114',
    clientId: 'nwm', invoiceDetails: 'Brand Protection Services 6/2026 c/o Sam',
    amount: '1415', currency: 'EUR', exRate: '1', amountEur: '1415', fundsReceived: false,
  },
  {
    id: 'r3', dateInvoice: '2026-08-20', periodMonth: '2026-08', invoiceNumber: '501123',
    clientId: 'holly', invoiceDetails: 'Staffing services 8/2026',
    amount: '25870', currency: 'EUR', exRate: '1', amountEur: '25870', fundsReceived: true,
  },
];

const clientLookup = {
  nwm: 'NWM Marketing Services Ltd | Luckyfox',
  holly: 'HOLLYMEAD',
};

const YEAR = { range: 'custom', from: '2026-01-01', to: '2026-12-31' };

function renderPage() {
  render(<RevenuePageClient initialRows={rows} clientLookup={clientLookup} initialRange={YEAR} />);
}

describe('Revenue search over the Client column', () => {
  it('returns every invoice for a client, not only the ones naming it in Details', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Search...'), 'NWM');

    expect(screen.getByText('501122')).toBeInTheDocument();
    expect(screen.getByText('501114')).toBeInTheDocument();
    expect(screen.queryByText('501123')).not.toBeInTheDocument();
  });

  it('totals the matched rows in the summary cards', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Search...'), 'NWM');

    // both matches are unpaid, so Total Revenue and Outstanding read the same
    expect(screen.getAllByText('€2,815.00')).toHaveLength(2);  // 1400 + 1415
    expect(screen.getByText('2 invoices')).toBeInTheDocument();
  });

  it('matches a client name case-insensitively', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Search...'), 'hollymead');

    expect(screen.getByText('501123')).toBeInTheDocument();
    expect(screen.queryByText('501122')).not.toBeInTheDocument();
  });

  it('does not match rows by the client id behind the name', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Search...'), 'holly');

    expect(screen.getByText('501123')).toBeInTheDocument();  // the name, not the id
    expect(screen.getByText('1 invoice')).toBeInTheDocument();
  });
});
