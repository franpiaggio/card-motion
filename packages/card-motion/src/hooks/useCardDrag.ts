'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { gsap } from '../internal/gsap';

/** A point in stage coordinates (px from the stage's top-left). */
export interface DragPoint {
  x: number;
  y: number;
}

export interface UseCardDragOptions<P extends string = string> {
  /** The stage element cards live in — its rect converts pointer → stage coords. */
  stageRef: RefObject<HTMLElement | null>;
  /**
   * Given the dragged card's `id`, the drop point (stage coords) and the stage
   * size, return the target pile — or `null` to reject the drop and snap the
   * card back. Receiving the `id` lets you enforce per-card rules (e.g. a card
   * only some zones accept).
   */
  resolveDrop: (id: number, point: DragPoint, stage: { width: number; height: number }) => P | null;
  /**
   * Handle the drop yourself — do the `move` and any side-effects here. If
   * omitted, the hook calls `move(id, target ?? pileOf(id))` for you.
   */
  onDrop?: (id: number, target: P | null) => void;
  /** Engine `move`, used by the default drop when `onDrop` is omitted. */
  move?: (id: number, toPile: P) => Promise<void> | void;
  /** Engine `pileOf`, used to snap back when a drop resolves to null. */
  pileOf?: (id: number) => P | null;
  /** Whether a card may be dragged (e.g. only the hand). Default: always. */
  canDrag?: (id: number) => boolean;
  /** Fires when the pointer is released without dragging — a tap (use it to select). */
  onTap?: (id: number) => void;
  /** Px the pointer must travel before it counts as a drag (vs a tap). Default `6`. */
  threshold?: number;
}

export interface CardDragApi {
  /** The id currently being dragged, or null. */
  dragId: number | null;
  /** Spread onto each draggable card node: `<div {...dragProps(id)} />`. */
  dragProps: (id: number) => {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  };
}

/**
 * Pointer-drag for engine-positioned cards. While dragging it takes over the
 * node's transform (via GSAP) to follow the pointer; on release it hands control
 * back to the engine (`move`, or your `onDrop`) which animates the card into its
 * slot. A press that doesn't move past `threshold` is reported as a tap, so
 * click-to-select keeps working on the same nodes.
 */
export function useCardDrag<P extends string = string>(opts: UseCardDragOptions<P>): CardDragApi {
  const { stageRef, resolveDrop, onDrop, move, pileOf, canDrag, onTap, threshold = 6 } = opts;
  const drag = useRef<{ id: number; offX: number; offY: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const dragProps = useCallback(
    (id: number) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if (canDrag && !canDrag(id)) return;
        const r = e.currentTarget.getBoundingClientRect();
        drag.current = {
          id,
          offX: e.clientX - (r.left + r.width / 2),
          offY: e.clientY - (r.top + r.height / 2),
          sx: e.clientX,
          sy: e.clientY,
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d || d.id !== id) return;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < threshold) return;
        if (!d.moved) {
          d.moved = true;
          setDragId(id);
          gsap.set(e.currentTarget, { zIndex: 99999 });
        }
        const stage = stageRef.current?.getBoundingClientRect();
        if (!stage) return;
        gsap.set(e.currentTarget, { x: e.clientX - d.offX - stage.left, y: e.clientY - d.offY - stage.top });
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d || d.id !== id) return;
        drag.current = null;
        if (!d.moved) {
          onTap?.(id);
          return;
        }
        setDragId(null);
        const stage = stageRef.current?.getBoundingClientRect();
        if (!stage) return;
        const point = { x: e.clientX - stage.left, y: e.clientY - stage.top };
        const target = resolveDrop(id, point, { width: stage.width, height: stage.height });
        if (onDrop) {
          onDrop(id, target);
        } else if (move) {
          const dest = target ?? pileOf?.(id) ?? null;
          if (dest) void move(id, dest);
        }
      },
    }),
    [stageRef, resolveDrop, onDrop, move, pileOf, canDrag, onTap, threshold],
  );

  return { dragId, dragProps };
}
