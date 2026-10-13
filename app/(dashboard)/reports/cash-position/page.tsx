import { loadCashPosition } from '@/lib/derived/reports';
import { CashChart } from '@/components/reports/CashChart';
import { Wallet, ArrowUpRight, ArrowDownRight, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

const eur = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
});

export default async function CashPositionReportPage() {
  const d = await loadCashPosition();
  const totalInflow = d.accounts.reduce((s, a) => s + a.inflow, 0);
  const totalOutflow = d.accounts.reduce((s, a) => s + a.outflow, 0);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">Report</p>
        <h1 className="font-display text-4xl mt-1 leading-tight">Cash Position</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Combined balance across {d.accounts.length} accounts ·
          {' '}{d.accounts.reduce((s, a) => s + a.txnCount, 0).toLocaleString('en-US')} transactions
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Total cash on hand</p>
            <Banknote className="size-4 text-muted-foreground" />
          </div>
          <p className={cn(
            "font-display text-4xl mt-3 tabular-nums leading-none",
            d.totalBalance >= 0 ? 'text-foreground' : 'text-rose-700'
          )}>
            {eur.format(d.totalBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">across all accounts</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Lifetime inflows</p>
            <ArrowUpRight className="size-4 text-emerald-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-emerald-700">
            {eur.format(totalInflow)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Lifetime outflows</p>
            <ArrowDownRight className="size-4 text-rose-600" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none text-rose-700">
            {eur.format(totalOutflow)}
          </p>
        </div>
      </div>

      {/* Cumulative balance chart */}
      <CashChart data={d.monthly} />

      {/* Per-account breakdown */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">By account</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono">Account</th>
              <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Inflow</th>
              <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Outflow</th>
              <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Txns</th>
              <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {d.accounts.map((a) => (
              <tr key={a.name} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-5 py-3 font-medium flex items-center gap-2">
                  <Wallet className="size-3.5 text-muted-foreground" />
                  {a.name}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-emerald-700">{eur.format(a.inflow)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-rose-700">{eur.format(a.outflow)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-mono text-xs text-muted-foreground">
                  {a.txnCount.toLocaleString('en-US')}
                </td>
                <td className={cn(
                  "px-5 py-3 text-right tabular-nums font-medium",
                  a.balance >= 0 ? 'text-foreground' : 'text-rose-700'
                )}>
                  {eur.format(a.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2">
            <tr className="bg-muted/30">
              <td className="px-5 py-3 font-display text-base">Total</td>
              <td className="px-5 py-3 text-right tabular-nums text-emerald-700 font-medium">{eur.format(totalInflow)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-rose-700 font-medium">{eur.format(totalOutflow)}</td>
              <td />
              <td className={cn(
                "px-5 py-3 text-right tabular-nums font-display text-base",
                d.totalBalance >= 0 ? 'text-foreground' : 'text-rose-700'
              )}>
                {eur.format(d.totalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Note: Payoneer transactions are not tracked yet, so the figures above include Cash Movements
        and Petty Cash only.
      </p>
    </div>
  );
}
