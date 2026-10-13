import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaidFilter } from '@/components/money/PaidFilter';

describe('PaidFilter', () => {
  it('offers all three states', () => {
    render(<PaidFilter value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not paid' })).toBeInTheDocument();
  });

  it('marks the active state for assistive tech', () => {
    render(<PaidFilter value="unpaid" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Not paid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Paid' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the state that was clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PaidFilter value="all" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(onChange).toHaveBeenCalledWith('paid');

    await user.click(screen.getByRole('button', { name: 'Not paid' }));
    expect(onChange).toHaveBeenCalledWith('unpaid');

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('names the group for assistive tech', () => {
    render(<PaidFilter value="all" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Payment status' })).toBeInTheDocument();
  });
});
