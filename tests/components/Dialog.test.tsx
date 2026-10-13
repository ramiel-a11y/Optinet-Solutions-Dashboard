import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Returns the rendered DialogContent element. A DialogTitle is included because
// Radix requires one for accessibility and warns loudly without it.
function renderDialog(className?: string): HTMLElement {
  render(
    <Dialog open>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>Test dialog</DialogTitle>
        </DialogHeader>
        <p>body</p>
      </DialogContent>
    </Dialog>,
  );
  const el = document.querySelector('[data-slot="dialog-content"]');
  if (!el) throw new Error('DialogContent did not render');
  return el as HTMLElement;
}

// Exact class tokens. Needed wherever one Tailwind class is a substring of
// another — `max-w-[calc(100%-2rem)]` contains `w-[calc(100%-2rem)]`, so a
// string `toContain` there passes on the wrong class.
const classesOf = (el: HTMLElement): string[] => el.className.split(/\s+/);

describe('DialogContent height bound', () => {
  // Without these two classes the dialog renders at its natural height —
  // measured at 1076px for the New Revenue form — while positioned `fixed`,
  // putting its buttons past the fold with no way to scroll to them.
  // jsdom has no layout engine, so this asserts the fix is present rather
  // than proving the button is reachable; that is verified in a browser.
  it('includes the max-h and overflow-y-auto classes', () => {
    const el = renderDialog();
    expect(el.className).toContain('max-h-[calc(100vh-4rem)]');
    expect(el.className).toContain('overflow-y-auto');
  });

  // Pins what this test actually covers: a call-site class (max-w-lg here,
  // standing in for whatever width a real call site passes) rides alongside
  // the base's max-h bound without disturbing it — max-w and max-h are
  // unrelated tailwind-merge groups. sheet.tsx had the analogous
  // base-vs-call-site override trap for width and no longer does; see
  // tests/components/Sheet.test.tsx.
  it('keeps the max-h bound alongside an arbitrary call-site class', () => {
    const el = renderDialog('max-w-lg');
    expect(el.className).toContain('max-w-lg');
    expect(el.className).toContain('max-h-[calc(100vh-4rem)]');
  });

  // CommandDialog passes `overflow-hidden`. tailwind-merge must drop the base
  // `overflow-y-auto` in its favour, which only happens if the base class
  // comes first in the cn() call.
  it('lets a call site override the overflow, as the command palette does', () => {
    const el = renderDialog('overflow-hidden');
    expect(el.className).toContain('overflow-hidden');
    expect(el.className).not.toContain('overflow-y-auto');
  });

  // Same ordering property as above, for the height half: a call site that
  // sets its own max-h must knock out the base max-h-[calc(100vh-4rem)],
  // which only happens if the base class comes first in the cn() call.
  it('lets a call site override the max-h bound', () => {
    const el = renderDialog('max-h-96');
    expect(el.className).toContain('max-h-96');
    expect(el.className).not.toContain('max-h-[calc(100vh-4rem)]');
  });
});

describe('DialogContent width', () => {
  // The base used to carry `sm:max-w-sm`. tailwind-merge kept it alongside a
  // call site's `max-w-lg` — different modifier groups, so no conflict — and in
  // the compiled stylesheet `.sm\:max-w-sm` landed later at equal specificity.
  // From 640px up it won, so every dialog rendered 384px instead of the width
  // its call site asked for.
  it('imposes no breakpoint max-width of its own', () => {
    const el = renderDialog();
    expect(el.className).not.toContain('sm:max-w-sm');
  });

  // The base used to express the small-screen inset as
  // `w-full max-w-[calc(100%-2rem)]`. That max-w sat in the same tailwind-merge
  // group as every call site's own max-w-*, so twMerge dropped it at all 13 of
  // them and dialogs ran edge-to-edge below 640px — measured at exactly 400px
  // wide in a 400px viewport, no margin either side. Expressed as a width it
  // lands in a different group, so the inset and the call site's cap coexist:
  // min(100% - 2rem, 32rem).
  //
  // These two assert on exact class tokens rather than substrings, because
  // `max-w-[calc(100%-2rem)]` contains `w-[calc(100%-2rem)]` — a substring check
  // would pass on the old max-w form and prove nothing.
  it('keeps the small-screen inset alongside a call-site max-width', () => {
    const el = renderDialog('max-w-lg');
    expect(classesOf(el)).toContain('w-[calc(100%-2rem)]');
    expect(classesOf(el)).toContain('max-w-lg');
  });

  // Ordering property: the base comes first in cn(), so a call site can still
  // take the width over entirely.
  it('lets a call site override the inset width', () => {
    const el = renderDialog('w-96');
    expect(classesOf(el)).toContain('w-96');
    expect(classesOf(el)).not.toContain('w-[calc(100%-2rem)]');
  });

  it('lets a call site set the width', () => {
    const el = renderDialog('max-w-lg');
    expect(el.className).toContain('max-w-lg');
    expect(el.className).not.toContain('sm:max-w-sm');
  });
});

describe('DialogContent description', () => {
  // Radix defaults aria-describedby to a generated id and only drops it once a
  // DialogDescription actually renders. These titled forms have none, so every
  // dialog was shipping an aria-describedby pointing at an element that does
  // not exist — a broken screen-reader reference, which is what Radix's warning
  // was reporting. Declaring aria-describedby={undefined} is Radix's documented
  // opt-out, and fixing that broken reference is a small genuine accessibility
  // improvement, not just console-noise removal.
  it('declares no description by default', () => {
    const el = renderDialog();
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('lets a call site supply its own description id', () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby="my-desc">
          <DialogHeader>
            <DialogTitle>Test dialog</DialogTitle>
          </DialogHeader>
          <p id="my-desc">body</p>
        </DialogContent>
      </Dialog>,
    );
    const el = document.querySelector('[data-slot="dialog-content"]');
    expect(el?.getAttribute('aria-describedby')).toBe('my-desc');
  });
});
