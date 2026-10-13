import { db } from '@/lib/db/client';
import {
  cashMovements, pettyCashTransactions, employees, invoices,
} from '@/lib/db/schema';
import { sql, isNull, and, eq, desc } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────
// Cash position
// ─────────────────────────────────────────────────────────────────────
export type CashAccount = {
  name: string;
  inflow: number;
  outflow: number;
  balance: number;
  txnCount: number;
};

export type CashReport = {
  accounts: CashAccount[];
  totalBalance: number;
  monthly: { month: string; inflow: number; outflow: number; net: number }[];
};

export async function loadCashPosition(): Promise<CashReport> {
  // Cash movements account: amount is signed already in our import
  const [cmAgg] = await db
    .select({
      inflow: sql<string>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0)`,
      outflow: sql<string>`COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0)`,
      cnt: sql<string>`COUNT(*)`,
    })
    .from(cashMovements)
    .where(isNull(cashMovements.deletedAt));

  // Petty cash account: top-ups vs expenses
  const [pcAgg] = await db
    .select({
      topups: sql<string>`COALESCE(SUM(CASE WHEN type='topup' THEN amount_eur END), 0)`,
      expenses: sql<string>`COALESCE(SUM(CASE WHEN type='expense' THEN amount_eur END), 0)`,
      cnt: sql<string>`COUNT(*)`,
    })
    .from(pettyCashTransactions)
    .where(isNull(pettyCashTransactions.deletedAt));

  const cashIn = Number(cmAgg?.inflow ?? 0);
  const cashOut = Number(cmAgg?.outflow ?? 0);
  const cmBalance = cashIn - cashOut;
  const cmCnt = Number(cmAgg?.cnt ?? 0);

  const pcTopups = Number(pcAgg?.topups ?? 0);
  const pcExpenses = Number(pcAgg?.expenses ?? 0);
  const pcBalance = pcTopups - pcExpenses;
  const pcCnt = Number(pcAgg?.cnt ?? 0);

  const accounts: CashAccount[] = [
    { name: 'Cash Movements (main)', inflow: cashIn, outflow: cashOut, balance: cmBalance, txnCount: cmCnt },
    { name: 'Petty Cash', inflow: pcTopups, outflow: pcExpenses, balance: pcBalance, txnCount: pcCnt },
  ];

  // Monthly cash flow over time (cash_movements + petty_cash combined)
  const cmMonthly = await db
    .select({
      month: sql<string>`TO_CHAR(date_trunc('month', ${cashMovements.date}), 'YYYY-MM')`,
      inflow: sql<string>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0)`,
      outflow: sql<string>`COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0)`,
    })
    .from(cashMovements)
    .where(isNull(cashMovements.deletedAt))
    .groupBy(sql`date_trunc('month', ${cashMovements.date})`);

  const pcMonthly = await db
    .select({
      month: sql<string>`TO_CHAR(date_trunc('month', ${pettyCashTransactions.date}), 'YYYY-MM')`,
      inflow: sql<string>`COALESCE(SUM(CASE WHEN type='topup' THEN amount_eur END), 0)`,
      outflow: sql<string>`COALESCE(SUM(CASE WHEN type='expense' THEN amount_eur END), 0)`,
    })
    .from(pettyCashTransactions)
    .where(isNull(pettyCashTransactions.deletedAt))
    .groupBy(sql`date_trunc('month', ${pettyCashTransactions.date})`);

  const monthMap = new Map<string, { inflow: number; outflow: number }>();
  for (const r of cmMonthly) {
    const e = monthMap.get(r.month) ?? { inflow: 0, outflow: 0 };
    e.inflow += Number(r.inflow);
    e.outflow += Number(r.outflow);
    monthMap.set(r.month, e);
  }
  for (const r of pcMonthly) {
    const e = monthMap.get(r.month) ?? { inflow: 0, outflow: 0 };
    e.inflow += Number(r.inflow);
    e.outflow += Number(r.outflow);
    monthMap.set(r.month, e);
  }
  const monthly = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }));

  return {
    accounts,
    totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
    monthly,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Payroll
// ─────────────────────────────────────────────────────────────────────
export type PayrollByRole = { position: string; count: number; totalMonthly: number };

export type SalaryInvoiceRow = {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalAmount: number;
};

export type PayrollReport = {
  activeCount: number;
  totalMonthlyEur: number;
  yearlyEur: number;
  avgSalaryEur: number;
  byRole: PayrollByRole[];
  recentInvoices: SalaryInvoiceRow[];
  monthlyHistory: { month: string; total: number }[];
};

export async function loadPayroll(): Promise<PayrollReport> {
  // Active employees with their monthly EUR salary
  const empRows = await db
    .select({
      id: employees.id,
      position: employees.position,
      salary: employees.grossSalaryMonthlyEur,
    })
    .from(employees)
    .where(and(isNull(employees.deletedAt), isNull(employees.endDate)));

  let activeCount = 0;
  let totalMonthly = 0;
  const roleMap = new Map<string, { count: number; total: number }>();
  for (const e of empRows) {
    const sal = Number(e.salary ?? 0);
    if (sal <= 0) continue;
    activeCount++;
    totalMonthly += sal;
    const role = (e.position ?? 'Unassigned').toString().trim() || 'Unassigned';
    const entry = roleMap.get(role) ?? { count: 0, total: 0 };
    entry.count++;
    entry.total += sal;
    roleMap.set(role, entry);
  }

  const byRole: PayrollByRole[] = [...roleMap.entries()]
    .map(([position, v]) => ({ position, count: v.count, totalMonthly: v.total }))
    .sort((a, b) => b.totalMonthly - a.totalMonthly);

  // Recent team_salary invoices (last 6)
  const salInv = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .where(and(isNull(invoices.deletedAt), eq(invoices.type, 'team_salary')))
    .orderBy(desc(invoices.invoiceDate))
    .limit(6);

  // Monthly payroll invoice totals over the last 12 months
  const history = await db
    .select({
      month: sql<string>`TO_CHAR(date_trunc('month', ${invoices.invoiceDate}), 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(and(isNull(invoices.deletedAt), eq(invoices.type, 'team_salary')))
    .groupBy(sql`date_trunc('month', ${invoices.invoiceDate})`);

  const monthlyHistory = history
    .map((r) => ({ month: r.month, total: Number(r.total) }))
    .filter((r) => r.month != null)
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    activeCount,
    totalMonthlyEur: totalMonthly,
    yearlyEur: totalMonthly * 12,
    avgSalaryEur: activeCount > 0 ? totalMonthly / activeCount : 0,
    byRole,
    recentInvoices: salInv.map((r) => ({
      id: String(r.id),
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate ? String(r.invoiceDate) : null,
      totalAmount: Number(r.totalAmount ?? 0),
    })),
    monthlyHistory,
  };
}
