// Aggregate revenue per service for the Revenue by service report. Line amounts
// are stored in the parent entry's currency, so each is converted to EUR with
// that entry's own ex_rate — the same rule as the generated amount_eur column.
type Row = Record<string, unknown>;

export type ServiceTotal = {
  service: string;
  total: number;   // EUR
  count: number;   // line items
  share: number;   // fraction of the period total, 0-1
};

export type RevenueByService = {
  services: ServiceTotal[];
  allocated: number;      // EUR covered by line items
  unallocated: number;    // EUR of invoice value with no line item (never negative)
  total: number;          // EUR invoiced in scope
  autoClassifiedCount: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function revenueByService(
  entries: Row[],
  lineItems: Row[],
  serviceLookup: Record<string, string> = {}
): RevenueByService {
  // Parent rate per entry, so a line can be converted without a join.
  const rateById = new Map<string, number>();
  let total = 0;
  for (const e of entries) {
    const id = String(e.id ?? '');
    rateById.set(id, String(e.currency) === 'EUR' ? 1 : num(e.exRate));
    total += num(e.amountEur);
  }

  const byService = new Map<string, { total: number; count: number }>();
  let allocated = 0;
  let autoClassifiedCount = 0;

  for (const li of lineItems) {
    const parentId = String(li.revenueEntryId ?? '');
    const rate = rateById.get(parentId);
    if (rate === undefined) continue;   // parent not in scope for this period

    const eur = num(li.amount) * rate;
    allocated += eur;
    if (li.autoClassified === true) autoClassifiedCount++;

    const name = serviceLookup[String(li.serviceId ?? '')] ?? 'Unassigned';
    const cur = byService.get(name) ?? { total: 0, count: 0 };
    cur.total += eur;
    cur.count += 1;
    byService.set(name, cur);
  }

  total = cents(total);
  allocated = cents(allocated);

  const services = [...byService.entries()]
    .map(([service, v]) => ({
      service,
      total: cents(v.total),
      count: v.count,
      share: total > 0 ? Math.round((v.total / total) * 10_000) / 10_000 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    services,
    allocated,
    unallocated: cents(Math.max(0, total - allocated)),
    total,
    autoClassifiedCount,
  };
}
