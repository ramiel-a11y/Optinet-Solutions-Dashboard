// Parse the legacy free-text `where_received` into a payment method and a payment
// date. The legacy convention is "<Method> - <D/M/YYYY>", day-first, with a few
// typos: a missing separator ("09/102025") and a doubled one ("12/11//2025").
export const PAYMENT_METHODS = ['Payoneer', 'Bank', 'PayPal', 'Cash', 'Other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ParsedPayment = { method: PaymentMethod | null; datePaid: string | null };

// Day-first date, tolerating a missing separator before a 4-digit year.
const DATE_RE = /(\d{1,2})[/.-](\d{1,2})[/.-]?(\d{4})/;

function parseMethod(text: string): PaymentMethod {
  const s = text.toLowerCase();
  if (s.startsWith('payoneer')) return 'Payoneer';
  if (s.startsWith('bank')) return 'Bank';
  if (/^pay\s*pal/.test(s)) return 'PayPal';
  if (s.startsWith('cash')) return 'Cash';
  return 'Other';
}

function parseDate(text: string): string | null {
  // Collapse doubled separators first: "12/11//2025" -> "12/11/2025".
  const m = DATE_RE.exec(text.replace(/[/.-]{2,}/g, '/'));
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject impossible days for the month (e.g. 31/02).
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseWhereReceived(raw: unknown): ParsedPayment {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { method: null, datePaid: null };
  return { method: parseMethod(text), datePaid: parseDate(text) };
}
