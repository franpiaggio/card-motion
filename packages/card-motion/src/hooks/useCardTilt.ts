'use client';

import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { createCardTilt, type CardTiltController, type CardTiltOptions } from '../core/tilt';

export interface UseCardTiltOptions extends CardTiltOptions {}

/**
 * Adds a pointer-following 3D tilt (and foil light position) to any element.
 *
 * Attach `containerRef` to the outer element (it owns `perspective` and the
 * pointer handlers) and `contentRef` to the inner element that should rotate
 * (it owns `transform-style: preserve-3d`).
 *
 * This is the React binding of the framework-free `attachCardTilt`
 * (available from `card-motion/vanilla`).
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
  const ctrl = useRef<CardTiltController | null>(null);
  // Refresh maxTilt live (duration is baked into the tween, so it recreates below).
  ctrl.current?.updateOptions({ maxTilt });

  const maxTiltRef = useRef(maxTilt);
  maxTiltRef.current = maxTilt;

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const c = createCardTilt(container, content, { maxTilt: maxTiltRef.current, duration });
    ctrl.current = c;
    return () => {
      c.destroy();
      ctrl.current = null;
    };
  }, [duration]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    ctrl.current?.pointerMove(e.clientX, e.clientY);
  }, []);

  const onPointerLeave = useCallback(() => {
    ctrl.current?.pointerLeave();
  }, []);

  return { containerRef, contentRef, onPointerMove, onPointerLeave };
}
