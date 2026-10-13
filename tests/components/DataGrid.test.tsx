import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '@/components/data-grid/DataGrid';
import { AdminProvider } from '@/components/auth/AdminContext';
import { billingOrdersConfig } from '@/lib/tableConfigs/batch';
import type { TableConfig } from '@/lib/tableConfigs/types';

const cfg: TableConfig = {
  name: 'foo',
  label: 'Foo',
  primaryKey: 'id',
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true },
    { field: 'name', label: 'Name', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number' },
  ],
  searchable: ['name'],
};

const rows = [
  { id: '1', name: 'Acme', amount: 100 },
  { id: '2', name: 'Zebra', amount: 50 },
];

describe('DataGrid', () => {
  it('renders one row per data item with non-hidden columns', () => {
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Zebra')).toBeInTheDocument();
    expect(screen.queryByText('ID')).not.toBeInTheDocument();
  });

  it('fires onNew when + New button is clicked (admin)', () => {
    const onNew = vi.fn();
    render(
      <AdminProvider value={true}>
        <DataGrid config={cfg} rows={rows} onNew={onNew} onRowClick={vi.fn()} />
      </AdminProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /new/i }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('hides the + New button for non-admins', () => {
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /new/i })).not.toBeInTheDocument();
  });

  it('fires onRowClick with the row when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Acme'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('filters by search input', () => {
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zebra' } });
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.getByText('Zebra')).toBeInTheDocument();
  });

  it('renders no filter row when the page has not opted in', () => {
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.queryByLabelText(/^Filter /)).toBeNull();
    expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull();
  });

  it('trims trailing whitespace from the search term', () => {
    render(<DataGrid config={cfg} rows={rows} onNew={vi.fn()} onRowClick={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Acme ' } });
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.queryByText('Zebra')).not.toBeInTheDocument();
  });
});

describe('DataGrid search over foreign-key columns', () => {
  // Billing rows carry clientId plus a legacy free-text clientNameRaw. The raw
  // column is what search used to look at, so a row whose raw name is blank or
  // stale could not be found by the client shown in its Client cell.
  const billingRows = [
    { id: '1', clientId: 'nwm', clientNameRaw: 'NWM Marketing', orderDetails: 'Brand Protection 7/2026' },
    { id: '2', clientId: 'nwm', clientNameRaw: '', orderDetails: 'Brand Reputation 6/2026' },
    { id: '3', clientId: 'holly', clientNameRaw: 'Hollymead', orderDetails: 'Staffing 8/2026' },
  ];
  const clients = { nwm: 'NWM Marketing Services Ltd | Luckyfox', holly: 'HOLLYMEAD' };

  function renderBilling() {
    render(
      <DataGrid
        config={billingOrdersConfig}
        rows={billingRows}
        onNew={vi.fn()}
        onRowClick={vi.fn()}
        fkLookups={{ clients }}
      />
    );
  }

  it('matches every row for a client, including one with no raw name', () => {
    renderBilling();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'NWM' } });
    expect(screen.getByText('Brand Protection 7/2026')).toBeInTheDocument();
    expect(screen.getByText('Brand Reputation 6/2026')).toBeInTheDocument();
    expect(screen.queryByText('Staffing 8/2026')).not.toBeInTheDocument();
  });

  it('matches the looked-up name even when the raw name differs from it', () => {
    renderBilling();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Luckyfox' } });
    expect(screen.getByText('Brand Protection 7/2026')).toBeInTheDocument();
    expect(screen.getByText('Brand Reputation 6/2026')).toBeInTheDocument();
  });

  it('still matches the legacy raw name, which can differ from the client record', () => {
    renderBilling();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Hollymead' } });
    expect(screen.getByText('Staffing 8/2026')).toBeInTheDocument();
  });

  it('does not match rows by the client id behind the name', () => {
    renderBilling();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'nwm' } });
    // "nwm" is the id, but it is also a prefix of the client name — the match
    // must come from the name, so the row with no raw name is included too.
    expect(screen.getByText('Brand Reputation 6/2026')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'holly' } });
    expect(screen.getByText('Staffing 8/2026')).toBeInTheDocument();
  });
});
