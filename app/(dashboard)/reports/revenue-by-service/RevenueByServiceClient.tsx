'use client';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle } from 'lucide-react';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { SummaryStrip, type SummaryCard } from '@/components/money/SummaryStrip';
import { simpleCsv, downloadCsv } from '@/components/data-grid/csv-export';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { monthInSpan, monthSpan } from '@/lib/derived/monthRange';
import { revenueByService } from '@/lib/derived/revenueByService';

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

type Row = Record<string, unknown>;

type Props = {
  entries: Row[];
  lineItems: Row[];
  serviceLookup: Record<string, string>;
  initialRange?: RangeParams;
};

export function RevenueByServiceClient({ entries, lineItems, serviceLookup, initialRange = {} }: Props) {
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);

  const span = useMemo(() => monthSpan(range), [range]);
  const inRange = useMemo(() => entries.filter((r) => monthInSpan(r, span)), [entries, span]);
  const report = useMemo(
    () => revenueByService(inRange, lineItems, serviceLookup),
    [inRange, lineItems, serviceLookup]
  );

  const cards: SummaryCard[] = [
    { label: `Revenue · ${range.label}`, value: eurFmt.format(report.total), sub: `${inRange.length} invoice${inRange.length === 1 ? '' : 's'}`, accent: true },
    { label: 'Allocated', value: eurFmt.format(report.allocated), sub: `across ${report.services.length} service${report.services.length === 1 ? '' : 's'}`, tone: 'up' },
    { label: 'Unallocated', value: eurFmt.format(report.unallocated), sub: 'not split by service yet', tone: 'down' },
  ];

  const handleExport = () => {
    const csv = simpleCsv(
      ['Service', 'Revenue (EUR)', '# Lines', 'Share'],
      [
        ...report.services.map((s) => [s.service, s.total, s.count, pctFmt.format(s.share)]),
        ['Unallocated', report.unallocated, '', pctFmt.format(report.total > 0 ? report.unallocated / report.total : 0)],
      ]
    );
    downloadCsv(csv, `revenue-by-service-${isoDay(range.to)}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Revenue by service</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per business unit, allocated by month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter
            activeKey={range.key}
            from={isoDay(range.from)}
            to={isoDay(range.to)}
            onChange={setRangeParams}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={report.total === 0}>
            <Download className="size-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <SummaryStrip cards={cards} />

      {report.autoClassifiedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50/50 p-4">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <p className="text-sm">
            {report.autoClassifiedCount} line{report.autoClassifiedCount === 1 ? '' : 's'} auto-classified
            from the invoice text and not yet reviewed — open a revenue invoice to confirm or correct its split.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="text-right w-40">Revenue</TableHead>
              <TableHead className="text-right w-28"># Lines</TableHead>
              <TableHead className="text-right w-28">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.services.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  No invoices split by service in this period.
                </TableCell>
              </TableRow>
            )}
            {report.services.map((s) => (
              <TableRow key={s.service}>
                <TableCell className="font-medium">{s.service}</TableCell>
                <TableCell className="text-right tabular-nums">{eurFmt.format(s.total)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{s.count}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{pctFmt.format(s.share)}</TableCell>
              </TableRow>
            ))}
            {report.unallocated > 0 && (
              <TableRow className="bg-muted/30">
                <TableCell className="font-medium text-muted-foreground">Unallocated</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{eurFmt.format(report.unallocated)}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {pctFmt.format(report.total > 0 ? report.unallocated / report.total : 0)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
