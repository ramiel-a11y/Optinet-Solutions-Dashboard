'use client';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Eye, EyeOff } from 'lucide-react';
import { DataGridToolbar } from './DataGridToolbar';
import { toCsv, downloadCsv } from './csv-export';
import { applySearch, searchFieldsFor, searchLookupsFor } from '@/lib/derived/gridSearch';
import type { TableConfig, ColumnConfig } from '@/lib/tableConfigs/types';

export type FkLookups = Record<string, Record<string, string>>;

const numberFmt = new Intl.NumberFormat('en-US');

function formatCell(value: unknown, col: ColumnConfig, row: Record<string, unknown>, fk: FkLookups): string {
  if (col.type === 'computed' && 'compute' in col) {
    const v = col.compute(row);
    return v === null || v === undefined ? '' : String(v);
  }
  if (value === null || value === undefined || value === '') return '';
  if (col.type === 'boolean') return value ? 'Y' : 'N';
  if (col.type === 'date' || col.type === 'datetime') {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  if (col.type === 'month') {
    const s = String(value).slice(0, 7);
    const d = new Date(`${s}-01T00:00:00`);
    return Number.isNaN(d.getTime())
      ? s
      : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (col.type === 'fk' && 'references' in col) {
    const lookup = fk[col.references];
    return lookup?.[String(value)] ?? String(value);
  }
  if (col.type === 'number' || col.type === 'currency') {
    if (col.maxFractionDigits !== undefined) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: col.maxFractionDigits }).format(Number(value));
    }
    return numberFmt.format(Number(value));
  }
  return String(value);
}

function PasswordCell({ value }: { value: unknown }) {
  const [shown, setShown] = useState(false);
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setShown((s) => !s); }}
      className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-foreground text-muted-foreground"
      title={shown ? 'Click to hide' : 'Click to reveal'}
    >
      {shown ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      <span className="select-all">{shown ? String(value) : '•'.repeat(Math.min(10, String(value).length))}</span>
    </button>
  );
}

type Props = {
  config: TableConfig;
  rows: Record<string, unknown>[];
  onNew: () => void;
  onRowClick: (row: Record<string, unknown>) => void;
  fkLookups?: FkLookups;
  // Optionally controlled search. A page passes these when its summary cards
  // have to total the same rows the grid is showing; pages that do not pass
  // them keep the grid's own search box state, unchanged.
  search?: string;
  onSearchChange?: (s: string) => void;
};

export function DataGrid({
  config, rows, onNew, onRowClick, fkLookups = {},
  search: searchProp, onSearchChange,
}: Props) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchProp ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;

  const visible = useMemo(
    () => config.columns.filter((c) => !c.hiddenInList),
    [config.columns]
  );

  // Search sees fk columns as the names it displays, not the raw ids.
  const searchLookups = useMemo(
    () => searchLookupsFor(config, fkLookups),
    [config, fkLookups]
  );

  const filtered = useMemo(
    () => applySearch(rows, search, searchFieldsFor(config), searchLookups),
    [rows, search, config, searchLookups]
  );

  const handleExport = () => {
    const csv = toCsv(filtered, config.columns, fkLookups);
    downloadCsv(csv, `${config.name}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // --- synced top horizontal scrollbar ---------------------------------
  // The <Table> renders its own overflow-x container (the scrollbar that sits
  // below the table). We mirror it with a second scrollbar above the table so
  // wide "money" tables can be scrolled from either end; the two stay in sync.
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [scrollW, setScrollW] = useState(0);

  useEffect(() => {
    const container = wrapRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]') ?? null;
    containerRef.current = container;
    if (!container) return;

    const update = () => setScrollW(container.scrollWidth);
    update();

    const onContainerScroll = () => {
      if (syncing.current) { syncing.current = false; return; }
      if (topRef.current) { syncing.current = true; topRef.current.scrollLeft = container.scrollLeft; }
    };
    container.addEventListener('scroll', onContainerScroll);

    const ro = new ResizeObserver(update);
    ro.observe(container);
    const tableEl = container.querySelector('table');
    if (tableEl) ro.observe(tableEl);

    return () => {
      container.removeEventListener('scroll', onContainerScroll);
      ro.disconnect();
    };
  }, [visible, filtered.length]);

  const onTopScroll = useCallback(() => {
    if (syncing.current) { syncing.current = false; return; }
    const c = containerRef.current;
    if (c && topRef.current) { syncing.current = true; c.scrollLeft = topRef.current.scrollLeft; }
  }, []);

  return (
    <div ref={wrapRef}>
      <DataGridToolbar
        search={search}
        onSearchChange={setSearch}
        onNew={onNew}
        onExport={handleExport}
        label={config.label}
      />
      <div
        ref={topRef}
        onScroll={onTopScroll}
        className="overflow-x-auto"
        aria-hidden="true"
      >
        <div style={{ width: scrollW, height: 1 }} />
      </div>
      <Table aria-label={config.label}>
        <TableHeader>
          <TableRow>
            {visible.map((c) => (
              <TableHead key={c.field}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={visible.length} className="text-center text-muted-foreground py-8">
                No records.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((r) => (
            <TableRow
              key={String(r[config.primaryKey])}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(r)}
            >
              {visible.map((c) => (
                <TableCell key={c.field}>
                  {c.type === 'password'
                    ? <PasswordCell value={r[c.field]} />
                    : formatCell(r[c.field], c, r, fkLookups)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {rows.length} rows</p>
    </div>
  );
}
