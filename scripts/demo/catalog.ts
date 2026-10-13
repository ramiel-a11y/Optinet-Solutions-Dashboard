// Invented reference data for the demo. Nothing here comes from, or is scaled from, a
// real record. Emails and URLs use example.com, so none reaches a real mailbox or site.
import type { Currency } from './fx';

export const SERVICE_NAMES = [
  'Brand Protection', 'Brand Reputation', 'SEO', 'Link Building', 'Service Agent',
  'Manpower / Team Salary', 'Web Design', 'AI', 'Office & Equipment Recharge', 'Other',
] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

// Must equal the credentials Owner options in lib/tableConfigs/batch.ts.
export const OWNERS = ['MARCO', 'SOFIA', 'DANIEL', 'Northgate Hub', 'Partner Sites'] as const;

export type ClientRole =
  | 'issued'    // retainer already invoiced this month (dated the 1st)
  | 'not_yet'   // retainer not yet invoiced this month
  | 'overdue'   // skipped last month, invoiced the month before
  | 'muted'     // stopped two months ago and marked "not recurring"
  | 'one_off';  // occasional projects, never inside the reminder window

export type ClientSpec = {
  slug: string;
  clientName: string;
  companyName: string;
  country: string;
  typeOfCompany: string;
  services: ServiceName[];      // one or two
  monthlyFee: number;           // in `currency`, before the month-to-month drift
  currency: Extract<Currency, 'EUR' | 'USD'>;
  startsMonthsAgo: number;      // first invoice month, counted back from this month
  role: ClientRole;
  invoiceDay: number;
  slowPayer?: boolean;          // its two most recent invoices are still open
};

export const CLIENTS: ClientSpec[] = [
  { slug: 'northwind', clientName: 'Northwind Media', companyName: 'Northwind Media Ltd', country: 'Malta', typeOfCompany: 'Online media', services: ['Brand Protection', 'Brand Reputation'], monthlyFee: 6400, currency: 'EUR', startsMonthsAgo: 21, role: 'issued', invoiceDay: 3 },
  { slug: 'bluepeak', clientName: 'Bluepeak Gaming', companyName: 'Bluepeak Gaming Ltd', country: 'Malta', typeOfCompany: 'Gaming operator', services: ['SEO', 'Link Building'], monthlyFee: 8200, currency: 'EUR', startsMonthsAgo: 21, role: 'issued', invoiceDay: 5 },
  { slug: 'corvid', clientName: 'Corvid Interactive', companyName: 'Corvid Interactive Ltd', country: 'Cyprus', typeOfCompany: 'Affiliate network', services: ['Brand Protection'], monthlyFee: 3900, currency: 'EUR', startsMonthsAgo: 19, role: 'not_yet', invoiceDay: 8 },
  { slug: 'verdant', clientName: 'Verdant Digital', companyName: 'Verdant Digital SL', country: 'Spain', typeOfCompany: 'Digital agency', services: ['Web Design', 'SEO'], monthlyFee: 2750, currency: 'EUR', startsMonthsAgo: 16, role: 'not_yet', invoiceDay: 10 },
  { slug: 'halcyon', clientName: 'Halcyon Affiliates', companyName: 'Halcyon Affiliates BV', country: 'Netherlands', typeOfCompany: 'Affiliate network', services: ['Link Building'], monthlyFee: 5600, currency: 'EUR', startsMonthsAgo: 21, role: 'issued', invoiceDay: 4 },
  { slug: 'marlowe', clientName: 'Marlowe & Finch', companyName: 'Marlowe & Finch Ltd', country: 'United Kingdom', typeOfCompany: 'Publisher', services: ['Brand Reputation'], monthlyFee: 3100, currency: 'EUR', startsMonthsAgo: 14, role: 'not_yet', invoiceDay: 12, slowPayer: true },
  { slug: 'tidewater', clientName: 'Tidewater Ventures', companyName: 'Tidewater Ventures Ltd', country: 'Gibraltar', typeOfCompany: 'Holding company', services: ['Manpower / Team Salary'], monthlyFee: 9800, currency: 'EUR', startsMonthsAgo: 21, role: 'issued', invoiceDay: 2 },
  { slug: 'quillstone', clientName: 'Quillstone Partners', companyName: 'Quillstone Partners Ltd', country: 'Ireland', typeOfCompany: 'Consultancy', services: ['Service Agent'], monthlyFee: 1850, currency: 'EUR', startsMonthsAgo: 11, role: 'issued', invoiceDay: 6 },
  { slug: 'aurora', clientName: 'Aurora Bay Entertainment', companyName: 'Aurora Bay Entertainment NV', country: 'Curaçao', typeOfCompany: 'Gaming operator', services: ['SEO', 'AI'], monthlyFee: 4300, currency: 'USD', startsMonthsAgo: 13, role: 'not_yet', invoiceDay: 9 },
  { slug: 'brightlane', clientName: 'Brightlane Studio', companyName: 'Brightlane Studio OÜ', country: 'Estonia', typeOfCompany: 'Design studio', services: ['Web Design'], monthlyFee: 2200, currency: 'EUR', startsMonthsAgo: 10, role: 'overdue', invoiceDay: 7, slowPayer: true },
  { slug: 'kitepoint', clientName: 'Kitepoint Labs', companyName: 'Kitepoint Labs GmbH', country: 'Germany', typeOfCompany: 'Software', services: ['AI'], monthlyFee: 3600, currency: 'EUR', startsMonthsAgo: 12, role: 'muted', invoiceDay: 11 },
  { slug: 'pinecrest', clientName: 'Pinecrest Media', companyName: 'Pinecrest Media AB', country: 'Sweden', typeOfCompany: 'Online media', services: ['Brand Protection'], monthlyFee: 4800, currency: 'EUR', startsMonthsAgo: 20, role: 'one_off', invoiceDay: 15 },
  { slug: 'emberline', clientName: 'Emberline', companyName: 'Emberline Ltd', country: 'Malta', typeOfCompany: 'Gaming operator', services: ['Office & Equipment Recharge'], monthlyFee: 2600, currency: 'EUR', startsMonthsAgo: 18, role: 'one_off', invoiceDay: 20 },
  { slug: 'sablewood', clientName: 'Sablewood Group', companyName: 'Sablewood Group Inc', country: 'Canada', typeOfCompany: 'Publisher', services: ['Link Building'], monthlyFee: 2900, currency: 'USD', startsMonthsAgo: 6, role: 'issued', invoiceDay: 1 },
];

export type SupplierSpec = {
  slug: string;
  name: string;
  classification: string;
  currency: Currency;
  base: number;                    // per invoice, in `currency`
  spread: number;                  // ± share of base, month to month
  every: number;                   // invoices every N months of the window
  day: number;                     // day of month
  activeIdx?: [number, number];    // window-month indexes it bills in (inclusive)
  related?: boolean;               // one of the two related companies the P&L can exclude
};

export const SUPPLIERS: SupplierSpec[] = [
  { slug: 'greenfield', name: 'Greenfield Tower Leasing Inc', classification: 'Office Rent', currency: 'PHP', base: 185000, spread: 0, every: 1, day: 1 },
  { slug: 'metro-utilities', name: 'Metro Power & Water', classification: 'Utilities', currency: 'PHP', base: 42000, spread: 0.12, every: 1, day: 15 },
  { slug: 'skyline', name: 'Skyline Fiber', classification: 'Utilities', currency: 'PHP', base: 9500, spread: 0, every: 1, day: 5 },
  { slug: 'cloudnest', name: 'Cloudnest Workspace', classification: 'Software & Tools', currency: 'USD', base: 610, spread: 0.03, every: 1, day: 2 },
  { slug: 'stackhouse', name: 'Stackhouse CRM', classification: 'Software & Tools', currency: 'EUR', base: 340, spread: 0, every: 1, day: 2 },
  { slug: 'pixelforge', name: 'Pixelforge Design Suite', classification: 'Software & Tools', currency: 'USD', base: 180, spread: 0, every: 1, day: 3 },
  { slug: 'calder-rowe', name: 'Calder & Rowe Accountants', classification: 'Professional Expenses', currency: 'EUR', base: 1240, spread: 0, every: 1, day: 25 },
  { slug: 'fenwick', name: 'Fenwick Legal', classification: 'Professional Expenses', currency: 'EUR', base: 1800, spread: 0.3, every: 3, day: 18 },
  { slug: 'harbourline', name: 'Harbourline Digital Ltd', classification: 'Professional Expenses', currency: 'EUR', base: 4600, spread: 0.2, every: 1, day: 20, related: true },
  { slug: 'kestrel-old', name: 'KESTREL LTD', classification: 'Professional Expenses', currency: 'EUR', base: 2700, spread: 0.2, every: 1, day: 22, related: true, activeIdx: [0, 4] },
  { slug: 'kestrel', name: 'Kestrel Solutions (CY) Ltd', classification: 'Professional Expenses', currency: 'EUR', base: 2900, spread: 0.2, every: 1, day: 22, related: true, activeIdx: [5, 999] },
  { slug: 'linkmarket', name: 'LinkMarket Exchange', classification: 'Buy Links', currency: 'USD', base: 4200, spread: 0.35, every: 1, day: 26 },
  { slug: 'brightwave', name: 'Brightwave Ads', classification: 'Marketing', currency: 'EUR', base: 1400, spread: 0.4, every: 2, day: 14 },
  { slug: 'meridian', name: 'Meridian Bank', classification: 'Bank Charges', currency: 'EUR', base: 65, spread: 0.3, every: 1, day: 28 },
  { slug: 'petty-cash', name: 'Petty Cash', classification: 'Petty Cash', currency: 'PHP', base: 15000, spread: 0, every: 1, day: 2 },
  { slug: 'wayfarer', name: 'Wayfarer Travel Co', classification: 'Travel', currency: 'EUR', base: 1900, spread: 0.3, every: 4, day: 9 },
  { slug: 'techhub', name: 'TechHub Manila', classification: 'Equipment', currency: 'PHP', base: 95000, spread: 0.3, every: 6, day: 16 },
];

// Payroll ramps from `from` to `to` (PHP) across the window as the team grows.
export const PAYROLL = { slug: 'payroll', name: 'Manila Office Payroll', classification: 'Salaries', currency: 'PHP' as Currency, from: 520000, to: 760000, day: 28 };

// One-off spikes: last July's office fit-out (a loss month), and a large related-company
// invoice this March, the month the P&L's exclusion toggle changes most.
export const EXPENSE_EVENTS: {
  slug: string; yearsAgo: number; month: number; day: number;
  name: string; classification: string; currency: Currency; amount: number; details: string;
}[] = [
  { slug: 'fitout', yearsAgo: 1, month: 7, day: 12, name: 'Greenfield Interiors', classification: 'Office Expenses', currency: 'EUR', amount: 16450, details: 'Office fit-out, new floor' },
  { slug: 'migration', yearsAgo: 0, month: 3, day: 20, name: 'Harbourline Digital Ltd', classification: 'Professional Expenses', currency: 'EUR', amount: 26500, details: 'Platform migration, phase 1' },
];

export const PETTY_ITEMS = [
  { details: 'Office snacks and coffee', base: 2200 },
  { details: 'Water delivery', base: 900 },
  { details: 'Courier fees', base: 650 },
  { details: 'Printer ink and paper', base: 1800 },
  { details: 'Cleaning supplies', base: 1100 },
  { details: 'Taxi to client meeting', base: 750 },
  { details: 'Minor office repairs', base: 2600 },
  { details: 'Team lunch', base: 4200 },
] as const;

// Gaming brands the Brand Protection invoices monitor. Invented; example.com only.
export const BP_SITES = [
  'lucky-orbit', 'goldcrest-play', 'velvet-spin', 'northstar-bets', 'emerald-reels',
  'harbor-jackpot', 'silverline-play', 'tiger-tiles', 'nova-reels',
];
