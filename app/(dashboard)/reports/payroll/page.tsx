import { loadPayroll } from '@/lib/derived/reports';
import { PayrollChart } from '@/components/reports/PayrollChart';
import { Users, Wallet, TrendingUp, BadgeDollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const eur = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

export default async function PayrollReportPage() {
  const d = await loadPayroll();
  const topRole = d.byRole[0];

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">Report</p>
        <h1 className="font-display text-4xl mt-1 leading-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {d.activeCount} active employees · {eur.format(d.totalMonthlyEur)}/month · {d.byRole.length} distinct roles
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-accent/30 border-accent/40 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Monthly payroll</p>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eur.format(d.totalMonthlyEur)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">recurring cost</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Yearly burn</p>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eur.format(d.yearlyEur)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">monthly × 12</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Active team</p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{d.activeCount}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {d.byRole.length} role{d.byRole.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Average salary</p>
            <BadgeDollarSign className="size-4 text-muted-foreground" />
          </div>
          <p className="font-display text-4xl mt-3 tabular-nums leading-none">{eur.format(d.avgSalaryEur)}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">per person / month</p>
        </div>
      </div>

      {/* Role breakdown chart */}
      <PayrollChart data={d.byRole} />

      {/* Role table + recent payroll invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">By role</p>
            {topRole && (
              <p className="text-xs text-muted-foreground font-mono">
                Largest cost: {topRole.position}
              </p>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono">Role</th>
                <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Count</th>
                <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">Monthly</th>
                <th className="px-5 py-2 font-medium text-xs uppercase tracking-wide text-muted-foreground font-mono text-right">% share</th>
              </tr>
            </thead>
            <tbody>
              {d.byRole.map((r) => {
                const pct = d.totalMonthlyEur > 0 ? (r.totalMonthly / d.totalMonthlyEur) * 100 : 0;
                return (
                  <tr key={r.position} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-2 font-medium">{r.position}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-mono text-xs text-muted-foreground">{r.count}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{eur.format(r.totalMonthly)}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-mono text-xs text-muted-foreground">
                      {pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">Recent salary invoices</p>
          </div>
          {d.recentInvoices.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No salary invoices recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {d.recentInvoices.map((inv) => (
                <li key={inv.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/40">
                  <div>
                    <p className="font-medium">
                      {inv.invoiceNumber ? `#${inv.invoiceNumber}` : '(no invoice #)'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {inv.invoiceDate
                        ? (() => { try { return format(parseISO(inv.invoiceDate), 'MMM d, yyyy'); } catch { return inv.invoiceDate; } })()
                        : 'no date'}
                    </p>
                  </div>
                  <p className="font-display text-lg tabular-nums">{eur.format(inv.totalAmount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
