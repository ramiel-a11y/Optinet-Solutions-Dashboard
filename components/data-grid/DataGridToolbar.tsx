'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download } from 'lucide-react';
import { useIsAdmin } from '@/components/auth/AdminContext';

export function DataGridToolbar(props: {
  search: string;
  onSearchChange: (s: string) => void;
  onNew: () => void;
  onExport: () => void;
  label: string;
}) {
  const isAdmin = useIsAdmin();
  return (
    <div className="flex items-center gap-2 mb-3">
      <h1 className="text-2xl font-semibold mr-4">{props.label}</h1>
      <Input
        placeholder="Search..."
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={props.onExport}>
        <Download className="size-4 mr-1" /> CSV
      </Button>
      {isAdmin && (
        <Button size="sm" onClick={props.onNew}>
          <Plus className="size-4 mr-1" /> New
        </Button>
      )}
    </div>
  );
}
