import { db } from '@/lib/db/client';
import { revenueEntries, expenseEntries } from '@/lib/db/schema';
import { sql, isNull, and, max } from 'drizzle-orm';
import { format, eachMonthOfInterval } from 'date-fns';
import type { DateRange } from './dateRange';
import { monthSpan, previousMonthSpan } from './monthRange';

export type DashboardData = {
  revenue: number;          // total for the selected range
  revenuePrev: number;      // previous equal-length period
  expense: number;
  expensePrev: number;
  profit: number;
  profitPrev: number;
  invoiceCount: number;     // revenue entries in range
  expenseCount: number;     // expense entries in range
  outstandingCount: number; // all-time snapshot (unpaid)
  outstandingTotal: number; // all-time snapshot
  monthly: { month: string; revenue: number; expense: number; profit: number }[]; // buckets spanning the range
  lastUpdated: Date | null;
  expenseLastUpdated: Date | null;
};

export async function loadDashboard(range: DateRange): Promise<DashboardData> {
  const { fromMonth, toMonth } = monthSpan(range);
  const { fromMonth: pFromMonth, toMonth: pToMonth } = previousMonthSpan({ fromMonth, toMonth });

  const [revAgg] = await db
    .select({
      period: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth} THEN amount_eur END), 0)`,
      prev: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${pFromMonth} AND ${pToMonth} THEN amount_eur END), 0)`,
      cnt: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth} THEN 1 ELSE 0 END), 0)`,
      outstandingCnt: sql<string>`COALESCE(SUM(CASE WHEN funds_received = false THEN 1 ELSE 0 END), 0)`,
      outstandingTotal: sql<string>`COALESCE(SUM(CASE WHEN funds_received = false THEN amount_eur ELSE 0 END), 0)`,
      lastUpdated: max(revenueEntries.updatedAt),
    })
    .from(revenueEntries)
    .where(isNull(revenueEntries.deletedAt));

  const [expAgg] = await db
    .select({
      period: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth} THEN amount_eur END), 0)`,
      prev: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${pFromMonth} AND ${pToMonth} THEN amount_eur END), 0)`,
      cnt: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(NULLIF(period_month, ''), TO_CHAR(date_invoice,'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth} THEN 1 ELSE 0 END), 0)`,
      lastUpdated: max(expenseEntries.updatedAt),
    })
    .from(expenseEntries)
    .where(isNull(expenseEntries.deletedAt));

  // Monthly buckets within the range (for the charts), grouped by allocation month.
  const revMonthly = await db
    .select({
      month: sql<string>`COALESCE(NULLIF(${revenueEntries.periodMonth}, ''), TO_CHAR(${revenueEntries.dateInvoice},'YYYY-MM'))`,
      revenue: sql<string>`COALESCE(SUM(${revenueEntries.amountEur}), 0)`,
    })
    .from(revenueEntries)
    .where(and(
      isNull(revenueEntries.deletedAt),
      sql`COALESCE(NULLIF(${revenueEntries.periodMonth}, ''), TO_CHAR(${revenueEntries.dateInvoice},'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth}`
    ))
    .groupBy(sql`COALESCE(NULLIF(${revenueEntries.periodMonth}, ''), TO_CHAR(${revenueEntries.dateInvoice},'YYYY-MM'))`);

  const expMonthly = await db
    .select({
      month: sql<string>`COALESCE(NULLIF(${expenseEntries.periodMonth}, ''), TO_CHAR(${expenseEntries.dateInvoice},'YYYY-MM'))`,
      expense: sql<string>`COALESCE(SUM(${expenseEntries.amountEur}), 0)`,
    })
    .from(expenseEntries)
    .where(and(
      isNull(expenseEntries.deletedAt),
      sql`COALESCE(NULLIF(${expenseEntries.periodMonth}, ''), TO_CHAR(${expenseEntries.dateInvoice},'YYYY-MM')) BETWEEN ${fromMonth} AND ${toMonth}`
    ))
    .groupBy(sql`COALESCE(NULLIF(${expenseEntries.periodMonth}, ''), TO_CHAR(${expenseEntries.dateInvoice},'YYYY-MM'))`);

  const revMap = new Map(revMonthly.map((r) => [r.month, Number(r.revenue)]));
  const expMap = new Map(expMonthly.map((r) => [r.month, Number(r.expense)]));
  const monthly = eachMonthOfInterval({ start: range.from, end: range.to }).map((d) => {
    const key = format(d, 'yyyy-MM');
    const revenue = revMap.get(key) ?? 0;
    const expense = expMap.get(key) ?? 0;
    return { month: key, revenue, expense, profit: revenue - expense };
  });

  const revenue = Number(revAgg?.period ?? 0);
  const revenuePrev = Number(revAgg?.prev ?? 0);
  const expense = Number(expAgg?.period ?? 0);
  const expensePrev = Number(expAgg?.prev ?? 0);

  return {
    revenue,
    revenuePrev,
    expense,
    expensePrev,
    profit: revenue - expense,
    profitPrev: revenuePrev - expensePrev,
    invoiceCount: Number(revAgg?.cnt ?? 0),
    expenseCount: Number(expAgg?.cnt ?? 0),
    outstandingCount: Number(revAgg?.outstandingCnt ?? 0),
    outstandingTotal: Number(revAgg?.outstandingTotal ?? 0),
    monthly,
    lastUpdated: revAgg?.lastUpdated ?? null,
    expenseLastUpdated: expAgg?.lastUpdated ?? null,
  };
}
