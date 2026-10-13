'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups, type NavGroup } from './nav-items';

// Admin-added entries (serializable — no icon components cross the server boundary).
export type CustomNavEntry = {
  kind: 'category' | 'subcategory';
  label: string;
  href?: string | null;
  parent?: string | null;
};

function mergeNav(custom: CustomNavEntry[]): NavGroup[] {
  const groups: NavGroup[] = navGroups.map((g) => ({ ...g, items: [...g.items] }));
  for (const c of custom) {
    if (c.kind === 'category' && !groups.some((g) => g.label === c.label)) {
      groups.push({ label: c.label, icon: Folder, items: [] });
    }
  }
  for (const s of custom) {
    if (s.kind !== 'subcategory') continue;
    const group = groups.find((g) => g.label === s.parent);
    if (group && !group.items.some((i) => i.label === s.label)) {
      group.items.push({ label: s.label, href: s.href || '#' });
    }
  }
  return groups;
}

export function Sidebar({ customNav = [] }: { customNav?: CustomNavEntry[] }) {
  const pathname = usePathname();
  const groups = mergeNav(customNav);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.label, true]))
  );

  return (
    <aside className="w-56 shrink-0 border-r bg-card h-screen sticky top-0 overflow-y-auto">
      <div className="px-6 pt-6 pb-4 border-b">
        <p className="font-display text-xl leading-none">Optinet Solutions</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1 font-mono">
          Dashboard
        </p>
      </div>
      <nav className="px-3 py-4 space-y-1">
        {groups.map((g) => {
          const isOpen = open[g.label];
          const groupActive = g.items.some((i) => i.href === pathname);
          return (
            <div key={g.label}>
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.label]: !s[g.label] }))}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors',
                  groupActive && 'text-foreground'
                )}
              >
                <g.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown
                  className={cn(
                    'size-3 text-muted-foreground transition-transform',
                    !isOpen && '-rotate-90'
                  )}
                />
              </button>
              {isOpen && (
                <ul className="mt-0.5 mb-1 space-y-px">
                  {g.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'relative flex items-center rounded-md py-1 pl-9 pr-2 text-[13px] text-muted-foreground transition-colors',
                            active
                              ? 'text-foreground font-medium bg-muted/60'
                              : 'hover:text-foreground hover:bg-muted/40'
                          )}
                        >
                          {active && (
                            <span className="absolute left-3 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
                          )}
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
