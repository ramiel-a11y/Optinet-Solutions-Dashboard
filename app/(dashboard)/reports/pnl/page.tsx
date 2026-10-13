import { loadPnlMatrix } from '@/lib/derived/pnlQuery';
import { defaultSpan } from '@/lib/derived/pnlMatrix';
import { PnlPageClient } from './PnlPageClient';

// defaultSpan is resolved here, on the server, and handed down as a prop: computing it
// inside the client component's initial state would render one span during SSR and
// another in the browser across a month boundary.
export default async function PnlReportPage() {
  const matrix = await loadPnlMatrix();
  return <PnlPageClient matrix={matrix} initialSpan={defaultSpan()} />;
}
