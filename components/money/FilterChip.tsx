'use client';
import { X } from 'lucide-react';

// Shown when a grid arrives pre-filtered from a P&L drill-down, so a short grid never
// looks like missing data. Clearing is local state only and leaves the URL alone —
// the same way DateFilter behaves in controlled mode on these pages.
export function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border bg-accent/30 px-3 py-1.5 text-xs">
      <span className="text-muted-foreground">Filtered:</span>
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
