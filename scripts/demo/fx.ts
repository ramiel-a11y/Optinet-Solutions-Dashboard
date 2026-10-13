import { rng, vary } from './random';

export type Currency = 'EUR' | 'USD' | 'PHP';

// Invented month-stable exchange rates to EUR, drifting up to ±2% month to month.
export function fxToEur(currency: Currency, month: string): string {
  if (currency === 'EUR') return '1';
  const base = currency === 'USD' ? 0.92 : 0.0162;
  return vary(rng(`fx:${currency}:${month}`), base, 0.02).toFixed(6);
}
