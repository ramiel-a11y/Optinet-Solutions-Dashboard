'use client';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { SummaryStrip, type SummaryCard } from '@/components/money/SummaryStrip';
import { simpleCsv, downloadCsv } from '@/components/data-grid/csv-export';
import { resolveRange, type RangeParams } from '@/lib/derived/dateRange';
import { monthInSpan, monthSpan } from '@/lib/derived/monthRange';
import { outstandingByClient, unpaidFlatList } from '@/lib/derived/outstanding';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const eurFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

type Row = Record<string, unknown>;

type Props = {
  initialRows: Row[];
  clientLookup: Record<string, string>;
  initialRange?: RangeParams;
};

export function OutstandingPageClient({ initialRows, clientLookup, initialRange = {} }: Props) {
  const [rangeParams, setRangeParams] = useState<RangeParams>(initialRange);
  const range = useMemo(() => resolveRange(rangeParams), [rangeParams]);

  const span = useMemo(() => monthSpan(range), [range]);
  const filtered = useMemo(
    () => initialRows.filter((r) => monthInSpan(r, span)),
    [initialRows, span]
  );
  const byClient = useMemo(() => outstandingByClient(filtered, clientLookup), [filtered, clientLookup]);
  const flat = useMemo(() => unpaidFlatList(filtered, clientLookup), [filtered, clientLookup]);

  const monthLabel = (ym: string) => {
    const d = new Date(`${ym}-01T00:00:00`);
    return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const total = byClient.reduce((s, c) => s + c.total, 0);
  const unpaidCount = filtered.length;

  const handleExportByClient = () => {
    const csv = simpleCsv(
      ['Client', 'Outstanding (EUR)', '# Unpaid'],
      byClient.map((c) => [c.client, c.total, c.count])
    );
    downloadCsv(csv, `outstanding-by-client-${isoDay(range.to)}.csv`);
  };

  const handleExportFlat = () => {
    const csv = simpleCsv(
      ['Date', 'Month', 'Invoice #', 'Client', 'Amount (EUR)'],
      flat.map((r) => [r.date, monthLabel(r.month), r.invoiceNumber, r.client, r.amountEur])
    );
    downloadCsv(csv, `outstanding-unpaid-invoices-${isoDay(range.to)}.csv`);
  };

  const cards: SummaryCard[] = [
    { label: 'Total Outstanding', value: eurFmt.format(total), sub: `${unpaidCount} unpaid invoice${unpaidCount === 1 ? '' : 's'}`, accent: true },
    { label: 'Unpaid Invoices', value: unpaidCount.toLocaleString('en-US'), sub: `across ${byClient.length} client${byClient.length === 1 ? '' : 's'}`, tone: 'down' },
    { label: 'Clients', value: byClient.length.toLocaleString('en-US'), sub: 'with outstanding' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl">Outstanding Invoices</h1>
        <div className="flex items-center gap-2">
          <DateFilter
            activeKey={range.key}
            from={isoDay(range.from)}
            to={isoDay(range.to)}
            onChange={setRangeParams}
          />
        </div>
      </div>

      <SummaryStrip cards={cards} />

      <Tabs defaultValue="by-client">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="by-client">By client</TabsTrigger>
            <TabsTrigger value="all-unpaid">All unpaid</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="by-client" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportByClient} disabled={byClient.length === 0}>
              <Download className="size-4 mr-1" /> CSV
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right w-32"># Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byClient.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                      No outstanding invoices in this period.
                    </TableCell>
                  </TableRow>
                )}
                {byClient.map((c) => (
                  <TableRow key={c.client}>
                    <TableCell className="font-medium">{c.client}</TableCell>
                    <TableCell className="text-right tabular-nums">{eurFmt.format(c.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{c.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="all-unpaid" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportFlat} disabled={flat.length === 0}>
              <Download className="size-4 mr-1" /> CSV
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="w-32">Month</TableHead>
                  <TableHead className="w-32">Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right w-40">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flat.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No unpaid invoices in this period.
                    </TableCell>
                  </TableRow>
                )}
                {flat.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{r.date}</TableCell>
                    <TableCell className="text-muted-foreground">{monthLabel(r.month)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{r.client}</TableCell>
                    <TableCell className="text-right tabular-nums">{eurFmt.format(r.amountEur)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
