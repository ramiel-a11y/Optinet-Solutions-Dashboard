'use client';
import { useState } from 'react';
import { Search, Bell, Plus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/app/(dashboard)/actions';
import { useIsAdmin } from '@/components/auth/AdminContext';
import { NavCreateDialog } from '@/components/sidebar/NavCreateDialog';

type Props = {
  initials: string;
  name: string;
  email?: string | null;
  categories?: string[];
};

export function Topbar({ initials, name, email, categories = [] }: Props) {
  const isAdmin = useIsAdmin();
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-10 h-14 bg-background/85 backdrop-blur-md border-b flex items-center gap-3 px-6">
      <div className="relative max-w-md flex-1">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search invoices, clients, …"
          className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-card focus-visible:border-input"
        />
      </div>
      <div className="flex-1" />
      {isAdmin && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground gap-1"
            onClick={() => setNavOpen(true)}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <NavCreateDialog open={navOpen} onOpenChange={setNavOpen} categories={categories} />
        </>
      )}
      <Button size="icon" variant="ghost" className="relative text-muted-foreground">
        <Bell className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="size-8 rounded-full bg-foreground text-background grid place-items-center text-xs font-medium select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title={name}
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{name}</div>
            {email && <div className="text-xs text-muted-foreground font-mono">{email}</div>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full cursor-pointer">
                <LogOut className="size-4 mr-2" /> Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
