import {
  describe, it, expect, vi, beforeAll, afterEach,
} from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { PettyCashPageClient } from '@/app/(dashboard)/money/petty-cash/PettyCashPageClient';

vi.mock('@/components/auth/AdminContext', () => ({
  useIsAdmin: () => true,
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/money/petty-cash',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
  // This file drives React directly rather than through Testing Library, which
  // is what normally sets this flag, so `act` needs it set here.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const rows = [
  {
    id: 'p1', date: '2026-06-10', type: 'expense', details: 'Office supplies',
    amount: '2400', currency: 'PHP', exRate: '0.0170', amountEur: '300',
  },
  {
    id: 'p2', date: '2026-05-10', type: 'topup', details: 'Cash top-up',
    amount: '60000', currency: 'PHP', exRate: '0.0170', amountEur: '1000',
  },
];

// The suite pins TZ to America/New_York (vitest.config.ts), so these two
// instants sit either side of *local* midnight: 23:00 on 6 Aug and 01:00 on
// 7 Aug. A date rendered from the clock therefore differs between them.
const BEFORE_LOCAL_MIDNIGHT = new Date('2026-08-07T03:00:00Z');
const AFTER_LOCAL_MIDNIGHT = new Date('2026-08-07T05:00:00Z');

describe('Petty Cash as-of label hydration', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // The real defect is a *timezone* split: this component is prerendered on the
  // server, so a clock read during render runs under the server's zone and again
  // under the browser's, and a UTC server disagrees with a UTC+8 team about
  // today's date for roughly a third of every day. One process cannot hold two
  // timezones, but it does not need to — the bug's whole mechanism is that the
  // two render passes disagree about the date, and a clock jump across local
  // midnight between renderToString and hydrateRoot reproduces exactly that.
  //
  // This fails if the clamp goes back to reading `new Date()` during render.
  it('hydrates cleanly when the clock crosses midnight between render and hydrate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(BEFORE_LOCAL_MIDNIGHT);

    const html = renderToString(
      <PettyCashPageClient initialRows={rows} initialRange={{ range: 'this_year' }} />,
    );

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    vi.setSystemTime(AFTER_LOCAL_MIDNIGHT);

    // React 19 reports a hydration mismatch through `onRecoverableError`, not
    // through console.error at the call site — a console spy here passes whether
    // or not the mismatch happens, which is how the first version of this test
    // fooled itself. Supplying the callback also keeps the output pristine,
    // since it replaces React's own logging.
    const recovered: string[] = [];

    await act(async () => {
      hydrateRoot(
        container,
        <PettyCashPageClient initialRows={rows} initialRange={{ range: 'this_year' }} />,
        { onRecoverableError: (error) => recovered.push(String(error)) },
      );
    });

    expect(recovered.filter((m) => /hydrat/i.test(m))).toEqual([]);
  });

  // The server must not emit a clock-derived date at all — that is what makes
  // the label hydration-safe rather than merely lucky. Before the clamp existed
  // the card showed the period end, and that is what the server still renders.
  it('renders the period end on the server, not a clock-derived date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(BEFORE_LOCAL_MIDNIGHT);

    const html = renderToString(
      <PettyCashPageClient initialRows={rows} initialRange={{ range: 'this_year' }} />,
    );

    // React separates static text from an interpolated value with an empty
    // comment, so the markup reads `as of <!-- -->31 Dec 2026`. Strip those to
    // assert on the phrase a reader would see.
    const text = html.replace(/<!-- -->/g, '');

    expect(text).toContain('as of 31 Dec 2026');
    expect(text).not.toContain('as of 6 Aug 2026');
  });
});
