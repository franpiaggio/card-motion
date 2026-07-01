'use client';

import { useCallback, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { gsap } from '../internal/gsap';
import { useDragDropContext } from './DragDropProvider';

export interface DraggableCardProps {
  /** Stable card id, reported to `onDrop`. */
  id: number;
  /** Id of the zone this card currently lives in (or `null`). */
  zone?: string | null;
  /** Disable dragging just this card. Default `false`. */
  disabled?: boolean;
  /** Pointer travel (px) before a press becomes a drag. Default `4`. */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  /** Your card visual, e.g. `<Card … />`. */
  children: ReactNode;
}

const SNAP = { duration: 0.35, ease: 'back.out(1.5)' } as const;

/**
 * Wraps a card visual and makes it draggable into any `DropZone`. While
 * dragging it lifts and follows the pointer; on release it either settles into
 * the accepting zone (you move it in state) or springs back to where it began.
 * Works with mouse, touch, and pen via Pointer Events.
 */
export function DraggableCard({ id, zone = null, disabled = false, threshold = 4, className, style, children }: DraggableCardProps) {
  const ctx = useDragDropContext();
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!ctx || disabled || ctx.disabled || e.button !== 0) return;
      press.current = { x: e.clientX, y: e.clientY, dragging: false };
      ref.current?.setPointerCapture(e.pointerId);
    },
    [ctx, disabled],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      const el = ref.current;
      if (!p || !ctx || !el) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.dragging) {
        if (Math.hypot(dx, dy) < threshold) return;
        p.dragging = true;
        el.classList.add('cm-dragging');
        gsap.killTweensOf(el);
        gsap.set(el, { zIndex: 9999 });
        // Juicy pickup: the card lifts and straightens as you grab it.
        gsap.to(el, { scale: 1.08, rotation: 0, duration: 0.18, ease: 'power2.out' });
        ctx.beginDrag(id, zone);
      }
      // Follow the pointer 1:1 (scale keeps animating underneath).
      gsap.set(el, { x: dx, y: dy });
      ctx.moveDrag(e.clientX, e.clientY);
    },
    [ctx, id, zone, threshold],
  );

  const settle = useCallback((accepted: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('cm-dragging');
    // On accept, the provider's FLIP animates the re-rendered node into its new
    // slot — we leave this (now-unmounting) node untouched. On reject, spring it
    // back, then hand the transform to CSS so hover still works.
    if (!accepted) {
      gsap.to(el, { x: 0, y: 0, scale: 1, ...SNAP, clearProps: 'zIndex,transform' });
    }
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const p = press.current;
      press.current = null;
      try {
        ref.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be gone */
      }
      if (!p || !p.dragging || !ctx) return;
      settle(ctx.endDrag(e.clientX, e.clientY));
    },
    [ctx, settle],
  );

  const onPointerCancel = useCallback(() => {
    const p = press.current;
    press.current = null;
    if (!p || !p.dragging || !ctx) return;
    ctx.cancelDrag();
    settle(false);
  }, [ctx, settle]);

  return (
    <div
      ref={ref}
      className={`cm-draggable${className ? ` ${className}` : ''}`}
      style={style}
      data-flip-id={id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {children}
    </div>
  );
}
