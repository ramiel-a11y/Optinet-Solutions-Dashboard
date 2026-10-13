import { UNCLASSIFIED_LABEL } from './pnlMatrix';

// Matches the Expenses grid against a classification arriving from a P&L drill-down.
// Case-insensitive and trimmed on purpose: the P&L merges classifications that differ
// only in casing into one line, so a link built from that line's label has to pull
// every casing back — otherwise the grid total would come up short of the figure that
// was clicked. UNCLASSIFIED_LABEL is imported rather than restated so the P&L's label
// and this matcher cannot drift apart.
type Row = { expenseClassification?: unknown };

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function matchesClassification(row: Row, filter: string): boolean {
  const want = filter.trim().toLowerCase();
  const have = normalize(row.expenseClassification);
  // mergeClassifications groups a row spelled exactly "Unclassified" into the same
  // line as null/empty/whitespace rows (its lowercased, trimmed value collides with
  // UNCLASSIFIED_KEY) — so the matcher has to accept both, or a drill-down here would
  // under-report the very total that line just showed.
  if (want === UNCLASSIFIED_LABEL.toLowerCase()) return have === '' || have === want;
  return have === want;
}
