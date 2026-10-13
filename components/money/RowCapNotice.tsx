// Shown above the grid when the server-side listRecords() call returned exactly its
// row limit — the signal that older rows exist and were left out. Invisible in the
// normal case (row count below the limit), so this renders nothing today; it exists
// for the day expense_entries or revenue_entries cross ROW_LIMIT and a P&L drill-down
// into an older month would otherwise show a total silently below the figure clicked.
export function RowCapNotice({ limit }: { limit: number }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
    >
      Showing only the most recent {limit.toLocaleString('en-US')} records — older
      records are omitted, so totals here may be incomplete.
    </p>
  );
}
