import { Home, Wallet, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = { label: string; href: string };
export type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };

// Sections from "Startup Expenses" down are hidden from the navigation.
// Clients and Reports are hidden too; their pages still exist at
// /clients/services-catalog and /reports/revenue-by-service.
// Month Allocation is hidden; the page still exists at /money/month-allocation and is
// reachable by URL — it is the screen for line-by-line month re-allocation. The page
// files remain on disk — re-add a nav line here to bring any back.
// P&L sits under Home — the monthly profit and loss statement, with drillable figures.
export const navGroups: NavGroup[] = [
  {
    label: 'Home', icon: Home, items: [
      { label: 'Dashboard', href: '/' },
      { label: 'P&L', href: '/reports/pnl' },
    ],
  },
  {
    label: 'Money', icon: Wallet, items: [
      { label: 'Revenue', href: '/money/revenue' },
      { label: 'Expenses', href: '/money/expenses' },
    ],
  },
  {
    label: 'Invoice & Billing', icon: FileText, items: [
      { label: 'Invoice Reminders', href: '/invoices/reminders' },
      { label: 'Team Salary', href: '/invoices/team-salary' },
      { label: 'Rental/Office Utilities', href: '/invoices/rental-utilities' },
      { label: 'Brand Protection', href: '/invoices/brand-protection' },
    ],
  },
];
