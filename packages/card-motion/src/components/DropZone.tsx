'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useDragDropContext, type ZoneAccept } from './DragDropProvider';

export interface DropZoneProps {
  /** Unique zone id, reported to `onDrop` as `toZone` / `fromZone`. */
  id: string;
  /** Reject cards this zone shouldn't accept (e.g. solitaire rules). */
  accepts?: ZoneAccept;
  /** Optional heading rendered above the drop area. */
  label?: ReactNode;
  /** Accessible name. Defaults to `label` (if a string) or `id`. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * A registered drop target. It highlights while a draggable card hovers over
 * it — green when the card is accepted, red when `accepts` rejects it. Lay your
 * cards out inside it however you like (flex row, stacked pile, grid…).
 */
export function DropZone({ id, accepts, label, ariaLabel, className, style, children }: DropZoneProps) {
  const ctx = useDragDropContext();
  const ref = useRef<HTMLDivElement>(null);

  // Keep the latest `accepts` in a ref so inline arrows don't churn the registry.
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;

  useEffect(() => {
    const el = ref.current;
    if (!ctx || !el) return;
    ctx.registerZone(id, el, (cardId, fromZone) => acceptsRef.current?.(cardId, fromZone) ?? true);
    return () => ctx.unregisterZone(id);
  }, [ctx, id]);

  const isOver = ctx?.draggingId != null && ctx.overZoneId === id;
  const valid = isOver && ctx?.overValid;
  const reject = isOver && !ctx?.overValid;
  const cls =
    'cm-dropzone' +
    (isOver ? ' cm-dropzone-over' : '') +
    (valid ? ' cm-dropzone-valid' : '') +
    (reject ? ' cm-dropzone-reject' : '') +
    (className ? ` ${className}` : '');
  const name = ariaLabel ?? (typeof label === 'string' ? label : id);

  return (
    <div ref={ref} className={cls} style={style} data-zone-id={id} role="group" aria-label={name}>
      {label != null && <div className="cm-dropzone-label">{label}</div>}
      <div className="cm-dropzone-body">{children}</div>
    </div>
  );
}
