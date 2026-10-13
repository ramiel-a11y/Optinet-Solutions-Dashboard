import type { ColumnConfig } from '@/lib/tableConfigs/types';

export type FkLookups = Record<string, Record<string, string>>;

// Format a single cell exactly as it reads on the page, so the CSV mirrors the grid:
// resolves FK client names, month (YYYY-MM -> "MMM yyyy"), dates, booleans, and
// computed columns. Numbers stay raw (no thousands separators) so Excel treats them
// as numbers. Secret columns are never exported.
function formatCsvCell(
  value: unknown,
  col: ColumnConfig,
  row: Record<string, unknown>,
  fk: FkLookups
): string {
  if (col.type === 'computed' && 'compute' in col) {
    const v = col.compute(row);
    return v === null || v === undefined ? '' : String(v);
  }
  if (col.type === 'password') return ''; // never export secrets
  if (value === null || value === undefined || value === '') return '';

  switch (col.type) {
    case 'date':
    case 'datetime': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
    }
    case 'month': {
      const s = String(value).slice(0, 7);
      const d = new Date(`${s}-01T00:00:00`);
      return Number.isNaN(d.getTime())
        ? s
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'fk': {
      const lookup = 'references' in col ? fk[col.references] : undefined;
      return lookup?.[String(value)] ?? String(value);
    }
    case 'number':
    case 'currency': {
      const n = Number(value);
      return Number.isFinite(n) ? String(n) : String(value);
    }
    default:
      return String(value);
  }
}

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function toCsv(
  rows: Record<string, unknown>[],
  columns: ColumnConfig[],
  fk: FkLookups = {}
): string {
  const visible = columns.filter((c) => !c.hiddenInList);
  const header = visible.map((c) => esc(c.label)).join(',');
  const lines = rows.map((r) =>
    visible.map((c) => esc(formatCsvCell(r[c.field], c, r, fk))).join(',')
  );
  return [header, ...lines].join('\n');
}

// Build a CSV from explicit headers + rows (for custom pages that don't use a
// TableConfig, e.g. the aggregated Outstanding / Invoice Reminders tables).
export function simpleCsv(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => cells.map((c) => esc(String(c))).join(',');
  return [line(headers), ...rows.map(line)].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  // Prepend a UTF-8 BOM so Excel renders accented names (e.g. "Zoë") correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
