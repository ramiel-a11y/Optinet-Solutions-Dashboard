import { describe, it, expect } from 'vitest';
import { parseWhereReceived } from '@/lib/derived/paymentCapture';

describe('parseWhereReceived — method', () => {
  it('recognises each method regardless of spacing or separator', () => {
    expect(parseWhereReceived('Payoneer - 23/07/2026').method).toBe('Payoneer');
    expect(parseWhereReceived('Payoneer- 05/06/2025').method).toBe('Payoneer');
    expect(parseWhereReceived('Payoneer-08/05/2025').method).toBe('Payoneer');
    expect(parseWhereReceived('Payoneer 24/06/2026').method).toBe('Payoneer');
    expect(parseWhereReceived('Bank - 07/10/2025').method).toBe('Bank');
    expect(parseWhereReceived('Bank 28/05/2026').method).toBe('Bank');
    expect(parseWhereReceived('Pay Pal - 27/06/2024').method).toBe('PayPal');
    expect(parseWhereReceived('PayPal').method).toBe('PayPal');
    expect(parseWhereReceived('Cash').method).toBe('Cash');
  });

  it('falls back to Other for unrecognised non-blank text', () => {
    expect(parseWhereReceived('Handed over in person').method).toBe('Other');
  });

  it('returns nulls for blank input', () => {
    expect(parseWhereReceived(null)).toEqual({ method: null, datePaid: null });
    expect(parseWhereReceived('')).toEqual({ method: null, datePaid: null });
    expect(parseWhereReceived('   ')).toEqual({ method: null, datePaid: null });
  });
});

describe('parseWhereReceived — date', () => {
  it('reads dates day-first and zero-pads', () => {
    expect(parseWhereReceived('Payoneer - 23/07/2026').datePaid).toBe('2026-07-23');
    expect(parseWhereReceived('Payoneer - 9/6/2026').datePaid).toBe('2026-06-09');
    expect(parseWhereReceived('Payoneer - 11/12/2024').datePaid).toBe('2024-12-11');
  });

  it('recovers the two malformed shapes in the data', () => {
    expect(parseWhereReceived('Payoneer - 09/102025').datePaid).toBe('2025-10-09');
    expect(parseWhereReceived('Payoneer - 12/11//2025').datePaid).toBe('2025-11-12');
  });

  it('keeps the method but yields no date when none is present or it is impossible', () => {
    expect(parseWhereReceived('Pay Pal')).toEqual({ method: 'PayPal', datePaid: null });
    expect(parseWhereReceived('Payoneer - 45/13/2025')).toEqual({ method: 'Payoneer', datePaid: null });
  });
});
