// The two related companies the P&L can be read without.
// They appear only as expense suppliers — all under Professional Expenses — so the
// toggle shrinks that line rather than hiding a row of its own.
//
// Three spellings, because "KESTREL LTD" is the company's older name and earlier
// invoices still carry it: matching only the current name would leave those behind.
// Matching is on the trimmed, lowercased supplier name, which is also how the SQL
// in loadPnlMatrix compares — one list, one rule, so the server aggregate and any
// client-side check can never disagree.
//
// This file is pure and imported by both a server query and a client component, so
// it must stay free of database code. Adding a fourth company is a one-line edit here.
export const EXCLUDED_SUPPLIERS = [
  'harbourline digital ltd',
  'kestrel solutions (cy) ltd',
  'kestrel ltd',
];

// What the checkbox on the P&L page calls them.
export const EXCLUDED_LABEL = 'Harbourline & Kestrel';

export function isExcludedSupplier(name: string | null | undefined): boolean {
  if (!name) return false;
  return EXCLUDED_SUPPLIERS.includes(name.trim().toLowerCase());
}
