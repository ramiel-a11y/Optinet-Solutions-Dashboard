import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

// Returns the rendered SheetContent element. A SheetTitle is included because
// Radix requires one for accessibility and warns loudly without it.
function renderSheet(className?: string): HTMLElement {
  render(
    <Sheet open>
      <SheetContent className={className}>
        <SheetHeader>
          <SheetTitle>Test sheet</SheetTitle>
        </SheetHeader>
        <p>body</p>
      </SheetContent>
    </Sheet>,
  );
  const el = document.querySelector('[data-slot="sheet-content"]');
  if (!el) throw new Error('SheetContent did not render');
  return el as HTMLElement;
}

describe('SheetContent description', () => {
  // The same defect the dialogs had. Radix defaults aria-describedby to a
  // generated id and only drops it once a SheetDescription renders. The record
  // drawer — the only call site, reachable from every table page — renders none,
  // so it shipped an aria-describedby pointing at an element that does not
  // exist. Confirmed in the browser before this fix: the open drawer carried
  // aria-describedby="radix-_r_4_" with no such element in the document.
  it('declares no description by default', () => {
    const el = renderSheet();
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  // The opt-out sits before the props spread, so a call site that renders a real
  // SheetDescription can still wire it up by pairing a matching id.
  it('lets a call site supply its own description id', () => {
    render(
      <Sheet open>
        <SheetContent aria-describedby="my-desc">
          <SheetHeader>
            <SheetTitle>Test sheet</SheetTitle>
          </SheetHeader>
          <p id="my-desc">body</p>
        </SheetContent>
      </Sheet>,
    );
    const el = document.querySelector('[data-slot="sheet-content"]');
    expect(el?.getAttribute('aria-describedby')).toBe('my-desc');
  });
});

describe('SheetContent width', () => {
  // The base carried `data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm`.
  // tailwind-merge kept those alongside the record drawer's own `sm:max-w-lg` —
  // different modifier chains, so it sees no conflict — and the compiled
  // `[data-side=right]` attribute selector gives the base higher CSS
  // specificity, so it won outright rather than merely by source order. The
  // drawer asked for 512px and rendered 384px; measured in the browser.
  it('imposes no side-scoped max-width of its own', () => {
    const el = renderSheet('sm:max-w-lg');
    expect(el.className).not.toContain('sm:max-w-sm');
    expect(el.className).toContain('sm:max-w-lg');
  });

  // Ordering property: the base comes first in cn(), so a call site's width wins.
  it('keeps the side-scoped width default when a call site sets none', () => {
    const el = renderSheet();
    expect(el.className).toContain('data-[side=right]:w-3/4');
  });
});
