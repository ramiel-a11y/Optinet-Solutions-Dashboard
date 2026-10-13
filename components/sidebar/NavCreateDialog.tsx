'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Existing app pages a new sub-category can link to.
const ROUTES: { label: string; href: string }[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Revenue', href: '/money/revenue' },
  { label: 'Expenses', href: '/money/expenses' },
  { label: 'Petty Cash', href: '/money/petty-cash' },
  { label: 'Startup Expenses', href: '/money/startup-expenses' },
  { label: 'Cash Movements', href: '/money/cash-movements' },
  { label: 'Recurring Payables', href: '/money/payables' },
  { label: 'Payoneer', href: '/money/payoneer' },
  { label: 'Invoices (All)', href: '/invoices' },
  { label: 'Brand Protection', href: '/invoices/brand-protection' },
  { label: 'Brand Reputation', href: '/invoices/brand-reputation' },
  { label: 'Team Salary', href: '/invoices/team-salary' },
  { label: 'Rental & Utilities', href: '/invoices/rental-utilities' },
  { label: 'Equipment (invoices)', href: '/invoices/equipment' },
  { label: 'Invoice Breakdown', href: '/invoices/breakdown' },
  { label: 'Billing', href: '/billing' },
  { label: 'Clients', href: '/clients' },
  { label: 'Client Services', href: '/clients/services' },
  { label: 'Link Partners', href: '/clients/link-partners' },
  { label: 'Employees', href: '/team/employees' },
  { label: 'Bonuses', href: '/team/bonuses' },
  { label: 'HR Agencies', href: '/team/hr-agencies' },
  { label: 'Equipment (assets)', href: '/assets/equipment' },
  { label: 'Domains', href: '/assets/domains' },
  { label: 'Domain Checks', href: '/assets/domain-checks' },
  { label: 'Office Furniture', href: '/assets/office-furniture' },
  { label: 'Office Lease', href: '/assets/office-lease' },
  { label: 'Credentials', href: '/ops/credentials' },
  { label: 'Software Licenses', href: '/ops/software-licenses' },
  { label: 'Landing Pages', href: '/ops/landing-pages' },
  { label: 'Business Plan', href: '/ops/business-plan' },
  { label: 'P&L', href: '/reports/pnl' },
  { label: 'Cash Position', href: '/reports/cash-position' },
  { label: 'Payroll', href: '/reports/payroll' },
];

const selectClass =
  'h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[]; // existing category (group) labels a sub-category can attach to
};

export function NavCreateDialog({ open, onOpenChange, categories }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<'category' | 'subcategory'>('subcategory');
  const [label, setLabel] = useState('');
  const [parent, setParent] = useState(categories[0] ?? '');
  const [href, setHref] = useState(ROUTES[0].href);
  const [saving, setSaving] = useState(false);

  function reset() {
    setKind('subcategory');
    setLabel('');
    setParent(categories[0] ?? '');
    setHref(ROUTES[0].href);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { toast.error('Please enter a name'); return; }
    if (kind === 'subcategory' && !parent) { toast.error('Please choose a category'); return; }
    setSaving(true);
    const body = kind === 'category'
      ? { kind, label: label.trim() }
      : { kind, label: label.trim(), parent, href };
    const res = await fetch('/api/tables/nav_entries', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const msg = res.status === 403 ? 'Admins only' : (await res.json().catch(() => ({}))).error ?? 'Failed';
      toast.error(`Could not add: ${msg}`);
      return;
    }
    toast.success(kind === 'category' ? 'Category added' : 'Sub-category added');
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add to sidebar</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as 'category' | 'subcategory')}>
              <option value="subcategory">Sub-category (item under a category)</option>
              <option value="category">Category (new sidebar group)</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === 'category' ? 'e.g. Reports' : 'e.g. Payoneer'} autoFocus />
          </div>

          {kind === 'subcategory' && (
            <>
              <div className="grid gap-1.5">
                <Label>Under category</Label>
                <select className={selectClass} value={parent} onChange={(e) => setParent(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Links to page</Label>
                <select className={selectClass} value={href} onChange={(e) => setHref(e.target.value)}>
                  {ROUTES.map((r) => <option key={r.href} value={r.href}>{r.label} ({r.href})</option>)}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
