// Compact EUR formatting for chart axes, where full figures would crowd the
// labels off the plot. Sign sits outside the currency symbol ("-€5k", not
// "€-5k") so losses read naturally on the Profit chart.
export function formatEuroShort(n: number): string {
  if (!Number.isFinite(n)) return '€0';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}€${Math.round(a / 1_000)}k`;
  return `${sign}€${Math.round(a)}`;
}

// Full EUR figure for chart tooltips and headline totals — the numbers people
// read to answer "how much exactly". Rounded to whole euros so it matches the
// KPI cards on the dashboard. Sign sits outside the symbol, as above.
const exactFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatEuroExact(n: number): string {
  if (!Number.isFinite(n)) return '€0';
  const sign = n < 0 ? '-' : '';
  return `${sign}${exactFmt.format(Math.abs(n))}`;
}
