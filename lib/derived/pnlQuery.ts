import { db } from '@/lib/db/client';
import { revenueEntries, expenseEntries, clients } from '@/lib/db/schema';
import { sql, isNull, eq } from 'drizzle-orm';
import { mergeRevenue, mergeClassifications, type PnlMatrix } from './pnlMatrix';
import { isExcludedSupplier } from './pnlExclusions';

// Aggregated over ALL time, with no span predicate: the client component slices to the
// selected span, so changing the filter needs no round-trip. What comes back is small —
// a few hundred rows, one per month per client or per classification-and-supplier — so
// there is no row cap to trip, which is the trap in loading raw rows and pivoting in
// the browser. The merge functions collapse it to one line per client or classification
// before any of it is serialised to the browser.
export async function loadPnlMatrix(): Promise<PnlMatrix> {
  // The allocation month: the manual period_month when set, else the invoice month.
  // Same expression loadPnl and allocationMonth() use, so the P&L agrees with what the
  // Month Allocation screen shows.
  const revMonth = sql<string>`COALESCE(NULLIF(${revenueEntries.periodMonth}, ''), TO_CHAR(${revenueEntries.dateInvoice},'YYYY-MM'))`;
  const expMonth = sql<string>`COALESCE(NULLIF(${expenseEntries.periodMonth}, ''), TO_CHAR(${expenseEntries.dateInvoice},'YYYY-MM'))`;
  const revLabel = sql<string | null>`COALESCE(${clients.clientName}, ${revenueEntries.clientNameRaw})`;


  // No paid filter anywhere below: the statement is accrual, so unpaid invoices
  // count in the month they are allocated to.
  const [revRows, expRows] = await Promise.all([
    db
      .select({
        month: revMonth,
        clientId: revenueEntries.clientId,
        label: revLabel,
        eur: sql<string>`COALESCE(SUM(${revenueEntries.amountEur}), 0)`,
      })
      .from(revenueEntries)
      .leftJoin(clients, eq(clients.id, revenueEntries.clientId))
      .where(isNull(revenueEntries.deletedAt))
      .groupBy(revMonth, revenueEntries.clientId, revLabel),

    // Grouped on the RAW classification, counts included: the case-insensitive merge
    // and the most-used-spelling label rule happen in mergeClassifications, where they
    // are testable without a database. Supplier is a grouping key purely so the related
    // companies can be told apart inside a classification (they are all Professional
    // Expenses), and the matching rule stays in isExcludedSupplier rather than being
    // written a second time in SQL, where a trim-vs-BTRIM difference could silently
    // disagree with it. It roughly doubles the row count and changes nothing about
    // what reaches the browser.
    db
      .select({
        month: expMonth,
        classification: expenseEntries.expenseClassification,
        supplier: expenseEntries.supplierName,
        rows: sql<string>`COUNT(*)`,
        eur: sql<string>`COALESCE(SUM(${expenseEntries.amountEur}), 0)`,
      })
      .from(expenseEntries)
      .where(isNull(expenseEntries.deletedAt))
      .groupBy(expMonth, expenseEntries.expenseClassification, expenseEntries.supplierName),
  ]);

  return {
    revenue: mergeRevenue(
      revRows.map((r) => ({
        month: r.month,
        clientId: r.clientId,
        label: r.label,
        excluded: isExcludedSupplier(r.label),
        eur: Number(r.eur),
      }))
    ),
    // Petty Cash is an ordinary classification here: the monthly top-up invoice the
    // company is charged. The tin's own transactions are deliberately NOT summed into
    // the statement — the top-up and the spending it funds are the same money, so
    // counting both double-charged every month. The itemised spending stays on
    // /money/petty-cash, which is where a one-off spike is read.
    expenses: mergeClassifications(
      expRows.map((r) => ({
        month: r.month,
        classification: r.classification,
        excluded: isExcludedSupplier(r.supplier),
        rows: Number(r.rows),
        eur: Number(r.eur),
      }))
    ),
  };
}
