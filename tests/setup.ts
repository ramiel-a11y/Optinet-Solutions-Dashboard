import '@testing-library/jest-dom/vitest';

// Polyfills for jsdom — Radix UI (used by shadcn primitives) requires these.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof globalThis.DOMRect === 'undefined') {
  // Minimal DOMRect for Radix positioning calculations.
  class DOMRectShim {
    static fromRect(r?: { x?: number; y?: number; width?: number; height?: number }) {
      return new DOMRectShim(r?.x ?? 0, r?.y ?? 0, r?.width ?? 0, r?.height ?? 0);
    }
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0,
    ) {}
    get top() { return this.y; }
    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get bottom() { return this.y + this.height; }
    toJSON() { return { ...this }; }
  }
  globalThis.DOMRect = DOMRectShim as unknown as typeof DOMRect;
}

// jsdom does not implement scrollIntoView; Radix Select calls it on item mount.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// jsdom lacks PointerEvent; Radix dispatches pointer events on Select trigger.
if (typeof globalThis.PointerEvent === 'undefined') {
  // @ts-expect-error - assigning a shim
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, props: PointerEventInit = {}) {
      super(type, props);
      this.pointerId = props.pointerId ?? 0;
      this.pointerType = props.pointerType ?? '';
    }
  };
}

// hasPointerCapture / releasePointerCapture used by Radix; jsdom lacks them.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
}
