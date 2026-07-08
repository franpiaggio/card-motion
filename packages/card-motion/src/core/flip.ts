import { gsap } from './gsap';

// Every draggable card carries this attribute so a card can be matched to its
// old position across a re-render / DOM move — even when it jumps to a whole
// different node in another zone.
export const FLIP_SELECTOR = '[data-flip-id]';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Snapshot the screen rect of every `[data-flip-id]` element under `root`. */
export function captureFlipRects(root: ParentNode): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  root.querySelectorAll<HTMLElement>(FLIP_SELECTOR).forEach((el) => {
    const id = el.getAttribute('data-flip-id');
    if (id != null) rects.set(id, el.getBoundingClientRect());
  });
  return rects;
}

/**
 * Manual FLIP: look each `[data-flip-id]` element up again under `root`, and
 * animate it from where it *was* (`prev`) to where it now sits — so a dropped
 * card glides from the spot it was released into its final slot, and the other
 * cards slide over to close the gap. Done by hand (not the Flip plugin) so a
 * card that jumps to a brand-new DOM node in another zone always matches.
 */
export function playFlip(root: ParentNode, prev: Map<string, DOMRect>, dropDuration = 0.4, dropEase = 'power2.out'): void {
  if (prev.size === 0) return;
  const duration = prefersReducedMotion() ? 0 : dropDuration;
  root.querySelectorAll<HTMLElement>(FLIP_SELECTOR).forEach((el) => {
    const id = el.getAttribute('data-flip-id');
    const before = id != null ? prev.get(id) : undefined;
    if (!before) return;
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const scale = after.width ? before.width / after.width : 1;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.01) return;
    gsap.killTweensOf(el);
    // Invert: place it back where it was, then play it forward to identity.
    gsap.set(el, { x: dx, y: dy, scale, zIndex: 1000 });
    gsap.to(el, { x: 0, y: 0, scale: 1, duration, ease: dropEase, clearProps: 'transform,zIndex' });
  });
}
