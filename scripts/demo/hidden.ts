import { BP_SITES, CLIENTS, OWNERS } from './catalog';
import { currentMonth, dayOf, demoMonths, isoDay, plusDays, shiftMonth } from './calendar';
import { fxToEur } from './fx';
import { clientId } from './ids';
import { money, uuidFor } from './random';
import type { DemoData } from './types';

type HiddenTables =
  | 'invoiceBreakdown' | 'clientServices' | 'billingOrders' | 'cashMovements' | 'recurringPayables'
  | 'startupExpenses' | 'domains' | 'domainChecks' | 'officeFurniture' | 'officeLease'
  | 'credentials' | 'softwareLicenses' | 'landingPages' | 'businessPlanItems' | 'freeLinkPartners';

// The tables behind pages hidden from the navigation: a few rows each, so none is
// blank if someone reaches it by URL.
export function buildHidden(today: Date, revenueEntries: DemoData['revenueEntries']): Pick<DemoData, HiddenTables> {
  const cur = currentMonth(today);
  const first = demoMonths(today)[0];
  // A day `ago` months back. Past months always exist, so only this month can fall back.
  const back = (ago: number, day: number) => dayOf(shiftMonth(cur, -ago), day, today) ?? isoDay(today);
  const id = (key: string) => uuidFor(`hidden:${key}`);

  // Three of last month's invoices, broken into their parts.
  const lastMonth = shiftMonth(cur, -1);
  const invoiceOf = (slug: string) =>
    revenueEntries.find((e) => e.clientId === clientId(slug) && e.dateInvoice.startsWith(lastMonth));
  const parts = [
    { slug: 'northwind', details: 'Brand Protection, monitoring and takedowns', amount: 3800 },
    { slug: 'northwind', details: 'Brand Reputation, review management', amount: 2600 },
    { slug: 'bluepeak', details: 'SEO retainer', amount: 4900 },
    { slug: 'bluepeak', details: 'Link Building, 12 placements', amount: 3300 },
    { slug: 'tidewater', details: 'Team salaries', amount: 9100 },
    { slug: 'tidewater', details: 'Office recharge', amount: 700 },
  ];
  const invoiceBreakdown = parts.map((p, i): DemoData['invoiceBreakdown'][number] => ({
    id: id(`breakdown:${i}`), clientId: clientId(p.slug),
    dateInvoice: invoiceOf(p.slug)?.dateInvoice ?? back(1, 5),
    invoiceNumber: invoiceOf(p.slug)?.invoiceNumber ?? null,
    invoiceDetails: p.details, amount: money(p.amount), currency: 'EUR',
  }));

  const clientServices = CLIENTS.slice(0, 8).map((c): DemoData['clientServices'][number] => ({
    id: id(`client-service:${c.slug}`), clientId: clientId(c.slug), serviceName: c.services[0],
    costs: `${c.currency} ${c.monthlyFee.toLocaleString('en-US')} / month`,
    dateStarted: `${shiftMonth(cur, -c.startsMonthsAgo)}-01`, paid: 'Monthly',
  }));

  const orders = [
    { slug: 'bluepeak', details: 'Link placements, batch 14', amount: 2400, done: true, issued: true, received: true },
    { slug: 'bluepeak', details: 'Link placements, batch 15', amount: 2650, done: true, issued: true, received: false },
    { slug: 'halcyon', details: 'Guest posts, autumn set', amount: 1850, done: true, issued: false, received: false },
    { slug: 'halcyon', details: 'Niche edits, 8 links', amount: 1200, done: false, issued: false, received: false },
    { slug: 'sablewood', details: 'Link placements, launch batch', amount: 3000, done: true, issued: true, received: true },
    { slug: 'aurora', details: 'Content and links bundle', amount: 2100, done: false, issued: false, received: false },
  ];
  const billingOrders = orders.map((o, i): DemoData['billingOrders'][number] => {
    const orderDate = back(i < 3 ? 2 : 1, 6 + i * 3);
    return {
      id: id(`order:${i}`), clientId: clientId(o.slug), orderDate, orderDetails: o.details,
      amount: money(o.amount), currency: 'EUR', orderCompleted: o.done, invoiceIssued: o.issued,
      paymentReceived: o.received, dueDate: plusDays(orderDate, 14),
    };
  });

  const cashMovements = [1, 2, 3, 4].flatMap((ago): DemoData['cashMovements'] => [
    { id: id(`cash:${ago}:in`), date: back(ago, 8), description: 'Client receipts moved to operating account', amount: money(42000 + ago * 1360), currency: 'EUR', typeOfFunds: 'Bank transfer' },
    { id: id(`cash:${ago}:out`), date: back(ago, 26), description: 'Payroll funding, Manila office', amount: money(-(10400 + ago * 220)), currency: 'EUR', pesoAmount: money((10400 + ago * 220) / 0.0162), typeOfFunds: 'Bank transfer' },
  ]);

  const recurringPayables: DemoData['recurringPayables'] = [
    { id: id('payable:lease'), category: 'Office Lease', dueDate: '1st of the month', amount: money(185000), currency: 'PHP', remarks: 'Greenfield Tower, 12th floor' },
    { id: id('payable:internet'), category: 'Internet', dueDate: '5th of the month', amount: money(9500), currency: 'PHP' },
    { id: id('payable:power'), category: 'Electricity & Water', dueDate: '15th of the month', amount: money(42000), currency: 'PHP', remarks: 'Varies with usage' },
    { id: id('payable:workspace'), category: 'Cloudnest Workspace', dueDate: '2nd of the month', amount: money(610), currency: 'USD' },
    { id: id('payable:accounts'), category: 'Accounting retainer', dueDate: '25th of the month', amount: money(1240), currency: 'EUR' },
    { id: id('payable:bank'), category: 'Bank charges', dueDate: 'End of month', amount: money(65), currency: 'EUR' },
  ];

  const setup = [
    { item: 'Workstations (x8)', amount: 312000, category: 'Equipment' },
    { item: 'Office chairs (x12)', amount: 96000, category: 'Furniture' },
    { item: 'Network setup', amount: 58000, category: 'Equipment' },
    { item: 'Pantry appliances', amount: 41000, category: 'Equipment' },
    { item: 'Signage', amount: 24000, category: 'Other' },
    { item: 'Initial petty cash float', amount: 25000, category: 'Cash-out' },
  ];
  const startupExpenses = setup.map((s, i): DemoData['startupExpenses'][number] => ({
    id: id(`startup:${i}`), item: s.item, amount: money(s.amount), currency: 'PHP',
    exRate: fxToEur('PHP', first), category: s.category, purchaseDate: dayOf(first, 6 + i * 3, today) ?? `${first}-01`,
  }));

  const sites = ['orbit-reviews', 'goldcrest-guide', 'spin-compare', 'reel-ratings', 'jackpot-notes', 'tile-tracker'];
  const domains = sites.map((d, i): DemoData['domains'][number] => {
    const bought = back(14 - i, 10);
    return {
      id: id(`domain:${d}`), domain: `${d}.example.com`, mainSite: `https://${BP_SITES[i]}.example.com`,
      status: i === 4 ? 'Parked' : i === 5 ? 'Expiring' : 'Active',
      datePurchased: bought, expiresAt: plusDays(bought, 365), price: money(12.99), currency: 'USD',
      hosting: 'Cloud VPS', domainSupplier: 'Registrar One', owner: OWNERS[i % OWNERS.length],
      registrant: 'Optinet Solutions', registrantEmail: 'domains@example.com',
      tags: 'BP', campaigns: i < 3 ? 'Autumn push' : null,
    };
  });

  const domainChecks = sites.slice(0, 5).map((d, i): DemoData['domainChecks'][number] => ({
    id: id(`check:${d}`), rankWebsite: `${d}.example.com, position ${3 + i * 2}`,
    location: ['Malta', 'Germany', 'Ireland', 'Spain', 'Netherlands'][i], dateChecked: back(0, 1 + i),
  }));

  const furniture = [
    { item: 'Ergonomic chair', quantity: 12, amount: 8000 },
    { item: 'Standing desk', quantity: 6, amount: 18450 },
    { item: 'Meeting table', quantity: 1, amount: 32000 },
    { item: 'Filing cabinet', quantity: 3, amount: 6500 },
    { item: 'Whiteboard', quantity: 2, amount: 4200 },
    { item: 'Lounge sofa', quantity: 1, amount: 27000 },
  ];
  const officeFurniture = furniture.map((f, i): DemoData['officeFurniture'][number] => ({
    id: id(`furniture:${i}`), item: f.item, quantity: String(f.quantity), amount: money(f.amount),
    totalAmount: money(f.amount * f.quantity), currency: 'PHP', datePurchased: dayOf(first, 10 + i, today) ?? `${first}-10`,
  }));

  const leaseStart = `${first}-01`;
  const leaseEnd = plusDays(`${shiftMonth(first, 24)}-01`, -1);
  const officeLease: DemoData['officeLease'] = [
    { id: id('lease:office'), label: 'Office Rental', contractAmountPhp: money(2220000), contractAmountEur: money(2220000 * 0.0162), startDate: leaseStart, endDate: leaseEnd, paidStatus: 'Paid to date', remarks: 'Two-year lease, 12th floor' },
    { id: id('lease:internet'), label: 'Internet', contractAmountPhp: money(114000), contractAmountEur: money(114000 * 0.0162), startDate: leaseStart, endDate: leaseEnd, paidStatus: 'Paid to date' },
    { id: id('lease:parking'), label: 'Parking (2 slots)', contractAmountPhp: money(72000), contractAmountEur: money(72000 * 0.0162), startDate: leaseStart, endDate: leaseEnd, paidStatus: 'Due this quarter' },
  ];

  const logins = [
    { service: 'Domain registrar', host: 'registrar' },
    { service: 'Hosting panel', host: 'hosting' },
    { service: 'Email admin', host: 'mail' },
    { service: 'Analytics', host: 'analytics' },
    { service: 'Social media', host: 'social' },
  ];
  // Plain text here; scripts/seed-demo.ts encrypts it with the copy's own key on insert.
  const credentials = logins.map((l, i): DemoData['credentials'][number] => ({
    id: id(`credential:${l.host}`), owner: OWNERS[i], service: l.service, url: `https://${l.host}.example.com`,
    username: `admin+${l.host}@example.com`, password: `demo-only-not-real-${i + 1}`,
  }));

  const licenses = [
    { name: 'Cloudnest Workspace', host: 'cloudnest', plan: 'Business, 12 seats', price: 610 },
    { name: 'Stackhouse CRM', host: 'stackhouse', plan: 'Team', price: 370 },
    { name: 'Pixelforge Design Suite', host: 'pixelforge', plan: 'Pro', price: 180 },
    { name: 'RankLens SEO Toolkit', host: 'ranklens', plan: 'Agency', price: 449 },
    { name: 'Linkwise Outreach', host: 'linkwise', plan: 'Growth', price: 129 },
  ];
  const softwareLicenses = licenses.map((l, i): DemoData['softwareLicenses'][number] => ({
    id: id(`license:${l.host}`), softwareName: l.name, url: `https://${l.host}.example.com`,
    plan: l.plan, datePurchased: back(12 - i * 2, 4), priceUsd: money(l.price), paidAmountUsd: money(l.price),
    username: 'it@example.com', password: 'demo-only-not-real',
    apiToken: i === 3 ? 'demo-token-not-real' : null,
  }));

  const landingPages = ['spring-offer', 'welcome-bonus', 'vip-club', 'sports-week', 'live-casino']
    .map((slug, i): DemoData['landingPages'][number] => ({
      id: id(`landing:${slug}`), url: `https://offers.example.com/${slug}`,
      actualCostUsd: money(350 + i * 110), vendorCostUsd: money(300 + i * 95),
      remarks: i % 2 ? 'Live' : 'In review',
    }));

  const plan = [
    { category: 'Staff', item: 'Two more SEO specialists', estimated: 2300, total: 27600, frequency: 'Monthly' },
    { category: 'Staff', item: 'Senior web developer', estimated: 1500, total: 18000, frequency: 'Monthly' },
    { category: 'Office', item: 'Second floor lease', estimated: 2900, total: 34760, frequency: 'Monthly' },
    { category: 'Office', item: 'Backup power generator', estimated: 6500, total: 6500, frequency: 'One-time' },
    { category: 'Tools', item: 'Enterprise SEO suite upgrade', estimated: 5400, total: 5400, frequency: 'Yearly' },
    { category: 'Tools', item: 'Design seats', estimated: 960, total: 960, frequency: 'Yearly' },
    { category: 'Marketing', item: 'Industry conference booth', estimated: 8500, total: 8500, frequency: 'One-time' },
    { category: 'Marketing', item: 'Case-study videos', estimated: 3200, total: 3200, frequency: 'One-time' },
  ];
  const businessPlanItems = plan.map((p, i): DemoData['businessPlanItems'][number] => ({
    id: id(`plan:${i}`), category: p.category, item: p.item,
    estimated: money(p.estimated), total: money(p.total), frequency: p.frequency,
  }));

  const freeLinkPartners: DemoData['freeLinkPartners'] = [
    { id: id('partner:guides'), partnerUrl: 'https://partner-guides.example.com', target: 'https://bluepeak.example.com', linksApproved: '3' },
    { id: id('partner:digest'), partnerUrl: 'https://betting-digest.example.com', target: 'https://halcyon.example.com', linksApproved: '2' },
    { id: id('partner:weekly'), partnerUrl: 'https://slots-weekly.example.com', target: 'https://sablewood.example.com', linksApproved: '5' },
    { id: id('partner:odds'), partnerUrl: 'https://odds-review.example.com', target: 'https://bluepeak.example.com', linksApproved: '1', notes: 'Awaiting second batch' },
  ];

  return {
    invoiceBreakdown, clientServices, billingOrders, cashMovements, recurringPayables, startupExpenses,
    domains, domainChecks, officeFurniture, officeLease, credentials, softwareLicenses, landingPages,
    businessPlanItems, freeLinkPartners,
  };
}
