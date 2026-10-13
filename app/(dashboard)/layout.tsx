import { Sidebar, type CustomNavEntry } from '@/components/sidebar/Sidebar';
import { navGroups } from '@/components/sidebar/nav-items';
import { Topbar } from '@/components/topbar/Topbar';
import { createClient } from '@/lib/supabase/server';
import { listRecords } from '@/lib/api/crud';
import { displayNameFromEmail } from '@/lib/displayName';
import { isAdminUser } from '@/lib/auth/role';
import { AdminProvider } from '@/components/auth/AdminContext';
import { AskAi } from '@/components/ai/AskAi';

function initialsFor(name: string): string {
  return name
    .split(/\s+/).filter(Boolean)
    .slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const name = (user?.user_metadata?.name as string | undefined)
    ?? displayNameFromEmail(email);
  const initials = initialsFor(name);
  const isAdmin = isAdminUser(user);

  const navRows = await listRecords('nav_entries', { sortField: 'sortOrder', sortDir: 'asc', limit: 500 });
  const customNav: CustomNavEntry[] = navRows.map((r) => ({
    kind: r.kind as 'category' | 'subcategory',
    label: String(r.label),
    href: (r.href as string | null) ?? null,
    parent: (r.parent as string | null) ?? null,
  }));
  const categories = [
    ...navGroups.map((g) => g.label),
    ...customNav.filter((n) => n.kind === 'category').map((n) => n.label),
  ];

  return (
    <AdminProvider value={isAdmin}>
      <div className="flex min-h-screen">
        <Sidebar customNav={customNav} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar initials={initials} name={name} email={email} categories={categories} />
          <main className="flex-1 px-6 md:px-10 py-6 overflow-y-auto">{children}</main>
        </div>
        <AskAi />
      </div>
    </AdminProvider>
  );
}
