import type { TableConfig } from '@/lib/tableConfigs/types';

// The data grid's quick-search, kept here rather than inside the component so a
// page can narrow its summary cards with exactly the same predicate the grid uses.
// Without that, a page can show eight matching rows above a total covering all
// fifty-five — which reads as a broken number.
type Row = Record<string, unknown>;

// Display names for foreign-key fields, keyed by field name: the Client cell
// shows a name resolved from a lookup while the row itself only carries an id,
// so search has to be handed the same lookup or it never sees the name.
export type SearchLookups = Record<string, Record<string, string>>;

export function searchFieldsFor(config: TableConfig): string[] {
  return config.searchable ?? config.columns.map((c) => c.field);
}

// Re-keys per-table fk lookups (`{ clients: {...} }`, as passed to the grid) by
// the field that references them (`{ clientId: {...} }`).
export function searchLookupsFor(
  config: TableConfig,
  fkLookups: Record<string, Record<string, string>>
): SearchLookups {
  const out: SearchLookups = {};
  for (const col of config.columns) {
    if (col.type !== 'fk' || !('references' in col)) continue;
    const lookup = fkLookups[col.references];
    if (lookup) out[col.field] = lookup;
  }
  return out;
}

// Mirrors what the grid renders for the cell: the display name when the lookup
// knows the id, the raw value when it does not.
function searchText(row: Row, field: string, lookups: SearchLookups): string {
  const value = row[field];
  if (value === null || value === undefined) return '';
  const lookup = lookups[field];
  return (lookup?.[String(value)] ?? String(value)).toLowerCase();
}

export function applySearch(
  rows: Row[],
  search: string,
  searchFields: string[],
  lookups: SearchLookups = {}
): Row[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => searchFields.some((f) => searchText(r, f, lookups).includes(q)));
}
