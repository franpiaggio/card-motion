'use client';

import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { createDraggableBehavior } from '../core/draggable';
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
  /**
   * Ids of other cards that should drag along with this one — e.g. a solitaire
   * run stacked on top of it. Their DOM nodes are located by `data-flip-id` and
   * translated as a group, so the whole stack follows the pointer and settles
   * together. The drop is still reported once, for this card's `id`.
   */
  stack?: number[];
  className?: string;
  style?: CSSProperties;
  /** Your card visual, e.g. `<Card … />`. */
  children: ReactNode;
}

/**
 * Wraps a card visual and makes it draggable into any `DropZone`. While
 * dragging it lifts and follows the pointer; on release it either settles into
 * the accepting zone (you move it in state) or springs back to where it began.
 * Works with mouse, touch, and pen via Pointer Events.
 *
 * This is the React binding of the framework-free `attachDraggable`
 * (available from `card-motion/vanilla`).
 */
export function DraggableCard({ id, zone = null, disabled = false, threshold = 4, stack, className, style, children }: DraggableCardProps) {
  const ctx = useDragDropContext();
  const ref = useRef<HTMLDivElement>(null);

  // The context value's identity changes with the drag state; the behavior
  // reads it through a ref so its handlers stay wired to the live provider.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const behavior = useMemo(
    () =>
      createDraggableBehavior(
        () => ref.current,
        {
          beginDrag: (cardId, fromZone) => ctxRef.current?.beginDrag(cardId, fromZone),
          moveDrag: (x, y) => ctxRef.current?.moveDrag(x, y),
          endDrag: (x, y) => ctxRef.current?.endDrag(x, y) ?? false,
          cancelDrag: () => ctxRef.current?.cancelDrag(),
          // No provider → inert, exactly like the pre-core component.
          isDisabled: () => !ctxRef.current || ctxRef.current.disabled,
        },
        { id, zone, disabled, threshold, stack },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // Refresh the per-card options the behavior reads on its next pointer event.
  behavior.updateOptions({ id, zone, disabled, threshold, stack });

  const h = behavior.handlers;
  return (
    <div
      ref={ref}
      className={`cm-draggable${className ? ` ${className}` : ''}`}
      style={style}
      data-flip-id={id}
      onPointerDown={h.onPointerDown}
      onPointerMove={h.onPointerMove}
      onPointerUp={h.onPointerUp}
      onPointerCancel={h.onPointerCancel}
    >
      {children}
    </div>
  );
}
