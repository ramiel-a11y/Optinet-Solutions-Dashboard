import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthRangeFilter } from '@/components/reports/MonthRangeFilter';

const SPAN = { fromMonth: '2026-01', toMonth: '2026-08' };

// jsdom's <input type="month"> does not accept keystrokes the way a real one does —
// userEvent.type() into it is flaky. Setting the value directly is what the control
// actually receives from a native month picker anyway.
const setMonth = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('MonthRangeFilter', () => {
  it('shows the current span in its two month inputs', () => {
    render(<MonthRangeFilter span={SPAN} onChange={vi.fn()} />);
    expect(screen.getByLabelText('From month')).toHaveValue('2026-01');
    expect(screen.getByLabelText('To month')).toHaveValue('2026-08');
  });

  it('reports a new span only when Apply is pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthRangeFilter span={SPAN} onChange={onChange} />);

    setMonth('From month', '2026-03');
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenCalledWith({ fromMonth: '2026-03', toMonth: '2026-08' });
  });

  it('refuses an inverted span', () => {
    const onChange = vi.fn();
    render(<MonthRangeFilter span={SPAN} onChange={onChange} />);

    setMonth('From month', '2026-12');

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains why Apply is disabled for an inverted range, so the dead button is not the only feedback', () => {
    render(<MonthRangeFilter span={SPAN} onChange={vi.fn()} />);
    setMonth('From month', '2026-12');
    expect(screen.getByText(/no later than/i)).toBeInTheDocument();
  });

  it('shows no explanation when the range is valid', () => {
    render(<MonthRangeFilter span={SPAN} onChange={vi.fn()} />);
    expect(screen.queryByText(/no later than/i)).not.toBeInTheDocument();
  });

  it('marks both month inputs with a YYYY-MM placeholder and pattern, for browsers with no native month picker', () => {
    render(<MonthRangeFilter span={SPAN} onChange={vi.fn()} />);
    expect(screen.getByLabelText('From month')).toHaveAttribute('placeholder', 'YYYY-MM');
    expect(screen.getByLabelText('From month')).toHaveAttribute('pattern', '\\d{4}-\\d{2}');
    expect(screen.getByLabelText('To month')).toHaveAttribute('placeholder', 'YYYY-MM');
    expect(screen.getByLabelText('To month')).toHaveAttribute('pattern', '\\d{4}-\\d{2}');
  });

  it('picks up a span changed from outside', () => {
    const { rerender } = render(<MonthRangeFilter span={SPAN} onChange={vi.fn()} />);
    rerender(<MonthRangeFilter span={{ fromMonth: '2025-01', toMonth: '2025-12' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('From month')).toHaveValue('2025-01');
  });
});
