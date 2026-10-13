'use client';
import Link from 'next/link';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  monthDrillDownHref, spanDrillDownHref, type MonthSpan,
} from '@/lib/derived/monthRange';
import {
  withFilter, UNCLASSIFIED_KEY, UNCLASSIFIED_LABEL,
  type PnlView, type PnlViewRow,
} from '@/lib/derived/pnlMatrix';

const eur = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Blank, not '0', for a month with no activity — as accounting statements read.
// Losses in parentheses, by the same convention.
function amount(n: number): string {
  // Exact zero only, matching project()'s row-drop guard in pnlMatrix.ts — a line
  // whose only activity is e.g. €0.40 must still show that figure, not a blank Total.
  if (n === 0) return '';
  return n < 0 ? `(${eur.format(-n)})` : eur.format(n);
}

function percent(r: number | null): string {
  if (r === null) return '—';
  const pct = (Math.abs(r) * 100).toFixed(1);
  return r < 0 ? `(${pct}%)` : `${pct}%`;
}

function monthLabel(ym: string): string {
  try { return format(parse(ym, 'yyyy-MM', new Date()), 'MMM-yy'); } catch { return ym; }
}

const head = 'px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-mono font-medium';
const cell = 'px-3 py-1.5 text-right tabular-nums';
const rowLabel = 'px-3 py-1.5 text-left font-normal';

// Where a row's figures live. `null` means the row is not drillable.
type Target = { basePath: string; param?: { name: string; value: string } } | null;

function revenueTarget(row: PnlViewRow): Target {
  // A 'raw:'-keyed line has no client record to filter the grid by.
  if (row.key.startsWith('raw:')) return null;
  return { basePath: '/money/revenue', param: { name: 'client', value: row.key } };
}

function expenseTarget(row: PnlViewRow): Target {
  // No special case for Petty Cash: it is an ordinary classification on the expense
  // grid now that the statement charges the monthly top-up invoice rather than the
  // tin's itemised spending, so its figures live where every other row's do.
  const value = row.key === UNCLASSIFIED_KEY ? UNCLASSIFIED_LABEL : row.label;
  return { basePath: '/money/expenses', param: { name: 'classification', value } };
}

// `month` null means the Total column: the whole span rather than one month.
function hrefFor(target: Target, span: MonthSpan, month: string | null): string | null {
  if (!target) return null;
  const base = month
    ? monthDrillDownHref(target.basePath, month)
    : spanDrillDownHref(target.basePath, span);
  return target.param ? withFilter(base, target.param.name, target.param.value) : base;
}

// What a drill-down link's period reads as in its aria-label: a single month for a
// month cell, the whole span (both ends) for a row's Total cell. `month === null`
// means the Total column, mirroring hrefFor's own convention.
function periodLabel(span: MonthSpan, month: string | null): string {
  if (month) return monthLabel(month);
  return `${monthLabel(span.fromMonth)}–${monthLabel(span.toMonth)}`;
}

function Cell({ value, href, className, rowName, period }: {
  value: number; href: string | null; className?: string; rowName?: string; period?: string;
}) {
  const text = amount(value);
  if (!text) return <td className={cn(cell, className)} />;
  if (!href) return <td className={cn(cell, className)}>{text}</td>;
  // A bare number like "1,234" reads as noise to a screen reader with no row or
  // month attached — this table renders roughly 200 of these links per page.
  const label = rowName ? `${rowName}, ${period}: ${text}` : undefined;
  return (
    <td className={cn(cell, className)}>
      <Link href={href} className="hover:underline" aria-label={label}>{text}</Link>
    </td>
  );
}

function DataRow({ row, months, span, target }: {
  row: PnlViewRow; months: string[]; span: MonthSpan; target: Target;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/40">
      <th scope="row" className={cn(rowLabel, 'sticky left-0 z-10 bg-card')}>{row.label}</th>
      {row.cells.map((n, i) => (
        <Cell
          key={months[i]} value={n} href={hrefFor(target, span, months[i])}
          rowName={row.label} period={periodLabel(span, months[i])}
        />
      ))}
      <Cell
        value={row.total} href={hrefFor(target, span, null)} className="font-medium"
        rowName={row.label} period={periodLabel(span, null)}
      />
    </tr>
  );
}

function TotalRow({ label, cells, total, months, span, target }: {
  label: string; cells: number[]; total: number;
  months: string[]; span: MonthSpan; target: Target;
}) {
  return (
    <tr className="border-y bg-emerald-50/60 font-medium">
      <th scope="row" className={cn(rowLabel, 'font-medium sticky left-0 z-10 bg-emerald-50/60')}>{label}</th>
      {cells.map((n, i) => (
        <Cell
          key={months[i]} value={n} href={hrefFor(target, span, months[i])}
          rowName={label} period={periodLabel(span, months[i])}
        />
      ))}
      <Cell value={total} href={hrefFor(target, span, null)} rowName={label} period={periodLabel(span, null)} />
    </tr>
  );
}

function SectionHeader({ label, cols }: { label: string; cols: number }) {
  return (
    <tr className="bg-muted/50">
      {/* "rowgroup", not "colgroup": the label describes the rows that follow it
          (Revenue, Expenses), not the columns under its colSpan — colSpan here
          only reaches full table width because there's no rowspan equivalent. */}
      <th
        scope="rowgroup"
        colSpan={cols}
        className="px-3 py-2 text-left text-xs uppercase tracking-[0.14em] font-mono text-foreground"
      >
        {label}
      </th>
    </tr>
  );
}

export function PnlMatrixTable({ view, span }: { view: PnlView; span: MonthSpan }) {
  const { months } = view;
  const cols = months.length + 2;

  return (
    <div className="rounded-xl border bg-card overflow-auto max-h-[70vh]">
      <table className="w-full text-sm">
        {/* The statement is wide (up to 12 months plus a Total) and long, so the month
            headings stick to the top and the row labels to the left. The corner cell is
            both, and needs the higher z-index to sit above each. `overflow-auto` plus
            `max-h` on the wrapper is what makes `sticky top-0` do anything at all: per
            CSS Overflow 3, a lone `overflow-x-auto` computes the other axis to `auto`
            too, but with no height cap that axis never actually scrolls, so a `sticky`
            header has nothing to stick within — scrolling the page just carries the
            whole box, header included. */}
        <thead>
          <tr className="border-b">
            {/* No scope: this corner cell is blank and heads the row-label column,
                not a data column, so "col" would associate it with nothing. */}
            <th className={cn(head, 'text-left sticky left-0 top-0 z-20 bg-card')} />
            {months.map((m) => (
              <th
                key={m}
                scope="col"
                className={cn(head, 'text-right whitespace-nowrap sticky top-0 z-10 bg-card')}
              >
                {monthLabel(m)}
              </th>
            ))}
            <th scope="col" className={cn(head, 'text-right sticky top-0 z-10 bg-card')}>Total</th>
          </tr>
        </thead>
        <tbody>
          <SectionHeader label="Revenue" cols={cols} />
          {view.revenue.map((row) => (
            <DataRow key={row.key} row={row} months={months} span={span} target={revenueTarget(row)} />
          ))}
          <TotalRow
            label="Total Revenue" cells={view.revenueTotals} total={view.revenueTotal}
            months={months} span={span} target={{ basePath: '/money/revenue' }}
          />

          <SectionHeader label="Expenses" cols={cols} />
          {view.expenses.map((row) => (
            <DataRow key={row.key} row={row} months={months} span={span} target={expenseTarget(row)} />
          ))}
          {/* Not drillable: this sums expense_entries AND petty_cash_transactions, and no
              single page holds both, so any target would show less than the figure shown. */}
          <TotalRow
            label="Total Expenses" cells={view.expenseTotals} total={view.expenseTotal}
            months={months} span={span} target={null}
          />

          <tr className="border-t-2 bg-amber-50/60 font-medium">
            <th scope="row" className={cn(rowLabel, 'font-medium sticky left-0 z-10 bg-amber-50/60')}>
              Profit / (Loss)
            </th>
            {view.net.map((n, i) => (
              <td key={months[i]} className={cn(cell, n < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                {amount(n)}
              </td>
            ))}
            <td className={cn(cell, view.netTotal < 0 ? 'text-rose-700' : 'text-emerald-700')}>
              {amount(view.netTotal)}
            </td>
          </tr>
          <tr className="bg-amber-50/30">
            <th scope="row" className={cn(rowLabel, 'italic sticky left-0 z-10 bg-amber-50/30')}>
              Profit margin %
            </th>
            {view.margin.map((r, i) => (
              <td
                key={months[i]}
                className={cn(cell, 'font-mono text-xs italic', r !== null && r < 0 ? 'text-rose-700' : 'text-muted-foreground')}
              >
                {percent(r)}
              </td>
            ))}
            <td className={cn(cell, 'font-mono text-xs italic',
              view.marginTotal !== null && view.marginTotal < 0 ? 'text-rose-700' : 'text-muted-foreground')}>
              {percent(view.marginTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
