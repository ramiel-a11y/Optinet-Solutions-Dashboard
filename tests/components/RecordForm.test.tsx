import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordForm } from '@/components/record-form/RecordForm';
import type { TableConfig } from '@/lib/tableConfigs/types';

const cfg: TableConfig = {
  name: 'foo',
  label: 'Foo',
  primaryKey: 'id',
  columns: [
    { field: 'name', label: 'Name', type: 'text', required: true },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD'], required: true },
    { field: 'paid', label: 'Paid?', type: 'boolean' },
  ],
};

describe('RecordForm', () => {
  it('renders an input per non-hidden field', () => {
    render(<RecordForm config={cfg} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/paid/i)).toBeInTheDocument();
  });

  it('calls onSubmit with parsed values when valid', async () => {
    const onSubmit = vi.fn();
    render(<RecordForm config={cfg} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/name/i), 'Acme');
    await userEvent.type(screen.getByLabelText(/amount/i), '42');
    // Select currency: shadcn select uses combobox role
    await userEvent.click(screen.getByLabelText(/currency/i));
    await userEvent.click(screen.getByRole('option', { name: 'EUR' }));

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Acme',
      amount: 42,
      currency: 'EUR',
    });
  });

  it('shows validation error and does not submit when invalid', async () => {
    const onSubmit = vi.fn();
    render(<RecordForm config={cfg} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      // Multiple required fields produce multiple error messages; use getAllByText.
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
