import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceRemindersClient } from '@/app/(dashboard)/invoices/reminders/InvoiceRemindersClient';

// vi.mock calls are hoisted above the module body, so anything their factories
// touch must be hoisted too — hence vi.hoisted rather than plain consts.
const mocks = vi.hoisted(() => ({ admin: true, refresh: vi.fn() }));

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => mocks.admin,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: mocks.refresh }),
  usePathname: () => '/invoices/reminders',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
});

const reminders = [
  {
    clientKey: 'c1', clientId: 'c1', client: 'Keystone', suggested: 2400,
    status: 'overdue' as const, lastInvoiceDate: '2026-05-04', lastInvoiceNumber: '50193',
    sourceInvoices: [{ date: '2026-05-04', number: '50193', amount: 2400, details: 'SEO Services 04/2026' }],
  },
];

// The whole of 2026, so the date filter never hides the fixture row.
const YEAR = { range: 'custom', from: '2026-01-01', to: '2026-12-31' };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mocks.admin = true;
  mocks.refresh.mockClear();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ row: {} }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Invoice reminders — marking a client not recurring', () => {
  it('offers the action to an admin', () => {
    render(<InvoiceRemindersClient reminders={reminders} muted={[]} monthLabel="July 2026" initialRange={YEAR} />);
    expect(screen.getByRole('button', { name: 'Not recurring' })).toBeInTheDocument();
  });

  it('hides the action from a non-admin', () => {
    mocks.admin = false;
    render(<InvoiceRemindersClient reminders={reminders} muted={[]} monthLabel="July 2026" initialRange={YEAR} />);
    expect(screen.queryByRole('button', { name: 'Not recurring' })).not.toBeInTheDocument();
  });

  it('PATCHes the client with a mute timestamp and refreshes', async () => {
    const user = userEvent.setup();
    render(<InvoiceRemindersClient reminders={reminders} muted={[]} monthLabel="July 2026" initialRange={YEAR} />);

    await user.click(screen.getByRole('button', { name: 'Not recurring' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/clients/c1');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body);
    // A timestamp string, not a boolean — the column is mode:'string'.
    expect(typeof body.remindersMutedAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.remindersMutedAt))).toBe(false);
    expect(mocks.refresh).toHaveBeenCalled();
  });
});

const mutedClients = [
  { clientId: 'c9', client: 'Keystone', lastInvoiceDate: '2026-05-04', lastInvoiceNumber: '50193' },
];

describe('Invoice reminders — the not-recurring section', () => {
  it('is absent when nothing is muted', () => {
    render(<InvoiceRemindersClient reminders={reminders} muted={[]} monthLabel="July 2026" initialRange={YEAR} />);
    expect(screen.queryByText(/Not recurring \(/)).not.toBeInTheDocument();
  });

  it('lists muted clients with a count and their last invoice', () => {
    render(<InvoiceRemindersClient reminders={[]} muted={mutedClients} monthLabel="July 2026" initialRange={YEAR} />);
    expect(screen.getByText('Not recurring (1)')).toBeInTheDocument();
    expect(screen.getByText('Keystone')).toBeInTheDocument();
    expect(screen.getByText(/2026-05-04/)).toBeInTheDocument();
    expect(screen.getByText(/50193/)).toBeInTheDocument();
  });

  // The date filter must not reach this section: it would hide the undo
  // whenever the selected range excluded the client's last invoice.
  it('lists muted clients even when the date range excludes their last invoice', () => {
    const narrow = { range: 'custom', from: '2026-07-01', to: '2026-07-31' };
    render(<InvoiceRemindersClient reminders={[]} muted={mutedClients} monthLabel="July 2026" initialRange={narrow} />);
    expect(screen.getByText('Not recurring (1)')).toBeInTheDocument();
    expect(screen.getByText('Keystone')).toBeInTheDocument();
  });

  it('PATCHes null to resume reminders and refreshes', async () => {
    const user = userEvent.setup();
    render(<InvoiceRemindersClient reminders={[]} muted={mutedClients} monthLabel="July 2026" initialRange={YEAR} />);

    await user.click(screen.getByRole('button', { name: 'Resume reminders' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tables/clients/c9');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ remindersMutedAt: null });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('hides the section from a non-admin', () => {
    mocks.admin = false;
    render(<InvoiceRemindersClient reminders={[]} muted={mutedClients} monthLabel="July 2026" initialRange={YEAR} />);
    expect(screen.queryByText(/Not recurring \(/)).not.toBeInTheDocument();
  });
});
