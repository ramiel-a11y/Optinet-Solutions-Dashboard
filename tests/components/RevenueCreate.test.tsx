import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenuePageClient } from '@/app/(dashboard)/money/revenue/RevenuePageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// DateFilter calls these unconditionally, even in controlled mode.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/revenue',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
});

// The row the API returns from the POST. Deliberately NOT present in any GET
// response below: the drawer must come from this payload, not from the
// refreshed list, and an empty refresh is what proves it.
const created = {
  id: 'new-1',
  dateInvoice: '2026-08-05',
  periodMonth: null,
  invoiceNumber: 'INV-NEW',
  clientId: null,
  invoiceDetails: null,
  amount: '1500',
  currency: 'EUR',
  exRate: '1',
  amountEur: '1500',
  fundsReceived: false,
};

const YEAR = { range: 'custom', from: '2026-01-01', to: '2026-12-31' };

// Routes by method and URL: the POST is the record being created; every GET
// (grid refresh, client lookup, line items, services) returns an empty list.
function routedFetch({ createOk = true } = {}) {
  return vi.fn(async (url: unknown, init?: { method?: string }) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST' && String(url).includes('/api/tables/revenue_entries')) {
      return createOk
        ? { ok: true, json: async () => ({ row: created }) }
        : { ok: false, json: async () => ({ error: 'duplicate invoice number' }) };
    }
    return { ok: true, json: async () => ({ rows: [] }) };
  });
}

async function fillAndSubmitNewInvoice() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^new$/i }));

  // Date inputs are unreliable under userEvent.type; set the value directly.
  fireEvent.change(screen.getByLabelText('Date *'), { target: { value: '2026-08-05' } });
  await user.type(screen.getByLabelText('Amount *'), '1500');
  await user.type(screen.getByLabelText('Rate *'), '1');

  // shadcn Select renders a Radix combobox; tests/setup.ts polyfills the
  // pointer APIs it needs. Same pattern as tests/components/RecordForm.test.tsx.
  await user.click(screen.getByLabelText(/currency/i));
  await user.click(screen.getByRole('option', { name: 'EUR' }));

  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', routedFetch());
});

describe('Creating a revenue record', () => {
  it('opens the new record so the service breakdown is reachable', async () => {
    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();

    // The Breakdown section only exists inside the record drawer.
    expect(await screen.findByRole('heading', { name: /Breakdown/ })).toBeInTheDocument();
  });

  it('opens it on the created record specifically', async () => {
    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();

    await screen.findByRole('heading', { name: /Breakdown/ });
    // The grid refresh returned no rows, so this can only have come from the
    // POST response — which is exactly the behaviour being pinned.
    expect(screen.getByText('INV-NEW')).toBeInTheDocument();
  });

  it('does not open the drawer when the create fails', async () => {
    vi.stubGlobal('fetch', routedFetch({ createOk: false }));
    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();

    // The New dialog stays open and no record drawer appears.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'New Revenue' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Breakdown/ })).not.toBeInTheDocument();
  });

  it('closes the New dialog on a successful create', async () => {
    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();

    await screen.findByRole('heading', { name: /Breakdown/ });
    expect(screen.queryByRole('heading', { name: 'New Revenue' })).not.toBeInTheDocument();
  });

  it('falls back to just closing the dialog when the response carries no row', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: { method?: string }) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST' && String(url).includes('/api/tables/revenue_entries')) {
        return { ok: true, json: async () => ({}) }; // no `row`
      }
      return { ok: true, json: async () => ({ rows: [] }) };
    }));
    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New Revenue' })).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Breakdown/ })).not.toBeInTheDocument();
  });

  it('refreshes the grid so the created invoice is still there once the drawer closes', async () => {
    // Unlike `created`'s absence from every GET above, this GET returns the
    // created row — the grid can only pick it up via `await refresh()`.
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: { method?: string }) => {
      const method = init?.method ?? 'GET';
      const isRevenueUrl = String(url).includes('/api/tables/revenue_entries');
      if (method === 'POST' && isRevenueUrl) {
        return { ok: true, json: async () => ({ row: created }) };
      }
      if (isRevenueUrl) {
        return { ok: true, json: async () => ({ rows: [created] }) };
      }
      return { ok: true, json: async () => ({ rows: [] }) };
    }));

    render(<RevenuePageClient initialRows={[]} clientLookup={{}} initialRange={YEAR} />);
    await fillAndSubmitNewInvoice();
    await screen.findByRole('heading', { name: /Breakdown/ });

    // Close the drawer — the invoice only remains visible if the grid's own
    // rows state (populated solely by refresh()) contains it.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Breakdown/ })).not.toBeInTheDocument());

    expect(await screen.findByText('INV-NEW')).toBeInTheDocument();
  });
});
