'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { gsap, useGSAP } from '../internal/gsap';

export interface CardInspectLayerProps {
  /** Whether the inspector is open. Toggling it drives the magnify in / out. */
  open: boolean;
  /** The source card's rect — the magnified content flies out of it (and back into it). */
  sourceRect: DOMRect | null;
  /** Called when the backdrop is clicked / Escape is pressed. */
  onClose: () => void;
  /** The magnified content you want to show (a big card face, stats, keyword text…). */
  children: ReactNode;
  /** Extra class on the backdrop, for theming. */
  className?: string;
}

/**
 * The magnify overlay for {@link useCardInspect}. Renders a dimmed backdrop and
 * animates the content out of the source card's rect to a centered, readable
 * size (a FLIP), then back into it on close. Content is yours; the motion is
 * ours. Rendered in a portal so it escapes any clipping / stacking context.
 */
export function CardInspectLayer({ open, sourceRect, onClose, children, className }: CardInspectLayerProps) {
  const [mounted, setMounted] = useState(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // The box's centered (identity-transform) rect, captured on open so the close
  // animation flies back to the same spot without measuring mid-tween.
  const targetRect = useRef<DOMRect | null>(null);
  // Keep the last content around through the close animation.
  const held = useRef<ReactNode>(children);
  if (open) held.current = children;

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useGSAP(
    () => {
      if (!mounted) return;
      const box = boxRef.current;
      const root = rootRef.current;
      if (!box || !root) return;

      const fromSource = (t: DOMRect) => {
        if (!sourceRect || t.width === 0) return { x: 0, y: 0, scale: 0.9, autoAlpha: 0 };
        return {
          x: sourceRect.left + sourceRect.width / 2 - (t.left + t.width / 2),
          y: sourceRect.top + sourceRect.height / 2 - (t.top + t.height / 2),
          scale: sourceRect.width / t.width,
          autoAlpha: 1,
        };
      };

      gsap.killTweensOf([box, root]);
      if (open) {
        targetRect.current = box.getBoundingClientRect(); // identity transform right now
        const from = fromSource(targetRect.current);
        gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
        gsap.fromTo(box, from, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.36, ease: 'power3.out' });
      } else {
        const to = fromSource(targetRect.current ?? box.getBoundingClientRect());
        gsap.to(box, { ...to, duration: 0.24, ease: 'power3.in' });
        gsap.to(root, { autoAlpha: 0, duration: 0.22, ease: 'power2.in', onComplete: () => setMounted(false) });
      }
    },
    { dependencies: [open, mounted], scope: rootRef },
  );

  if (!mounted) return null;
  return createPortal(
    <div ref={rootRef} className={`cm-inspect${className ? ` ${className}` : ''}`} onPointerDown={onClose}>
      <div ref={boxRef} className="cm-inspect-box" onPointerDown={(e) => e.stopPropagation()}>
        {held.current}
      </div>
    </div>,
    document.body,
  );
}
