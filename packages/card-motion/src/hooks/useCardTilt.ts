'use client';

import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { gsap } from '../internal/gsap';

export interface UseCardTiltOptions {
  /** Maximum tilt in degrees at the card's edges. Default `16`. */
  maxTilt?: number;
  /** Easing duration for the tilt, in seconds. Default `0.4`. */
  duration?: number;
}

type QuickTo = ReturnType<typeof gsap.quickTo>;

/**
 * Adds a pointer-following 3D tilt (and foil light position) to any element.
 *
 * Attach `containerRef` to the outer element (it owns `perspective` and the
 * pointer handlers) and `contentRef` to the inner element that should rotate
 * (it owns `transform-style: preserve-3d`).
 *
 * ```tsx
 * const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt();
 * return (
 *   <div ref={containerRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
 *     <div ref={contentRef}>…</div>
 *   </div>
 * );
 * ```
 */
export function useCardTilt({ maxTilt = 16, duration = 0.4 }: UseCardTiltOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tiltX = useRef<QuickTo | null>(null);
  const tiltY = useRef<QuickTo | null>(null);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    tiltX.current = gsap.quickTo(node, 'rotationX', { duration, ease: 'power2.out' });
    tiltY.current = gsap.quickTo(node, 'rotationY', { duration, ease: 'power2.out' });
    return () => {
      gsap.killTweensOf(node);
      tiltX.current = null;
      tiltY.current = null;
    };
  }, [duration]);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const el = containerRef.current;
      if (!el || !tiltX.current || !tiltY.current) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      tiltY.current(px * maxTilt);
      tiltX.current(-py * maxTilt);
      el.style.setProperty('--cm-mx', `${(px + 0.5) * 100}%`);
      el.style.setProperty('--cm-my', `${(py + 0.5) * 100}%`);
      el.style.setProperty('--cm-foil', '1');
    },
    [maxTilt],
  );

  const onPointerLeave = useCallback(() => {
    tiltX.current?.(0);
    tiltY.current?.(0);
    containerRef.current?.style.setProperty('--cm-foil', '0');
  }, []);

  return { containerRef, contentRef, onPointerMove, onPointerLeave };
}
