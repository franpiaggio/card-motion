'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { gsap } from '../internal/gsap';

/** Decides whether `zone` will accept the card being dragged. */
export type ZoneAccept = (cardId: number, fromZone: string | null) => boolean;

/**
 * Called when a card is dropped on a zone. Return `false` to reject the move
 * (the card animates back to where it came from); return `true` or nothing to
 * accept it. You own the state: on accept, re-render the card into `toZone`.
 */
export type DropHandler = (cardId: number, toZone: string, fromZone: string | null) => boolean | void;

interface ZoneEntry {
  el: HTMLElement;
  accepts: ZoneAccept;
}

interface DragDropContextValue {
  registerZone: (id: string, el: HTMLElement, accepts: ZoneAccept) => void;
  unregisterZone: (id: string) => void;
  beginDrag: (cardId: number, fromZone: string | null) => void;
  moveDrag: (clientX: number, clientY: number) => void;
  /** Resolves the drop; returns `true` if a zone accepted the card. */
  endDrag: (clientX: number, clientY: number) => boolean;
  cancelDrag: () => void;
  disabled: boolean;
  /** Id of the card currently being dragged, or `null`. */
  draggingId: number | null;
  /** Id of the zone the pointer is over mid-drag, or `null`. */
  overZoneId: string | null;
  /** Whether the hovered zone would accept the dragged card. */
  overValid: boolean;
}

const Ctx = createContext<DragDropContextValue | null>(null);

/** Internal accessor used by `DropZone` / `DraggableCard`. */
export function useDragDropContext(): DragDropContextValue | null {
  return useContext(Ctx);
}

export interface DragState {
  /** `true` while a card is being dragged. */
  dragging: boolean;
  draggingId: number | null;
  overZoneId: string | null;
  overValid: boolean;
}

/** Public hook: read the live drag state to drive your own UI. */
export function useDragDrop(): DragState {
  const ctx = useContext(Ctx);
  return {
    dragging: ctx?.draggingId != null,
    draggingId: ctx?.draggingId ?? null,
    overZoneId: ctx?.overZoneId ?? null,
    overValid: ctx?.overValid ?? false,
  };
}

export interface DragDropProviderProps {
  /**
   * Fired when a card is dropped on a zone. Return `false` to reject (snap
   * back). You own the data — move the card into `toZone` in your own state.
   */
  onDrop?: DropHandler;
  /** Fired when a drag begins (after the small movement threshold). */
  onDragStart?: (cardId: number, fromZone: string | null) => void;
  /** Fired when a drag ends, with whether a zone accepted the card. */
  onDragEnd?: (accepted: boolean) => void;
  /** Disable all dragging inside this provider. Default `false`. */
  disabled?: boolean;
  /** Duration (s) of the "settle into the free slot" drop animation. Default `0.4`. */
  dropDuration?: number;
  /** Easing of the drop animation. Default `'power2.out'`. */
  dropEase?: string;
  children: ReactNode;
}

// Every draggable card carries this attribute so we can match a card to its
// old position across a re-render — even when it moves to a whole different DOM
// node in another zone.
const FLIP_SELECTOR = '[data-flip-id]';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Coordinates drag-and-drop between `DropZone`s. It supplies the *mechanics*
 * (pointer tracking, zone hit-testing, snap-back) and reports drops via
 * `onDrop`; you own the card state and game rules. Build solitaire, freecell,
 * or any "drag a card into a slot" interaction on top of it.
 */
export function DragDropProvider({
  onDrop,
  onDragStart,
  onDragEnd,
  disabled = false,
  dropDuration = 0.4,
  dropEase = 'power2.out',
  children,
}: DragDropProviderProps) {
  const zones = useRef(new Map<string, ZoneEntry>());
  const dragRef = useRef<{ cardId: number; fromZone: string | null } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overZoneId, setOverZoneId] = useState<string | null>(null);
  const [overValid, setOverValid] = useState(false);

  // Manual FLIP: just before a drop mutates state, snapshot every card's screen
  // rect. After the re-render, look each card up again by `data-flip-id`, and
  // animate it from where it *was* to where it now sits — so the dropped card
  // glides from the spot you released it into its final slot, and the other
  // cards slide over to close the gap. Done by hand (not the Flip plugin) so a
  // card that jumps to a brand-new DOM node in another zone always matches.
  const scopeRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const [flipTick, setFlipTick] = useState(0);

  useLayoutEffect(() => {
    const prev = prevRects.current;
    if (prev.size === 0) return;
    prevRects.current = new Map();
    const root = scopeRef.current;
    if (!root) return;
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
  }, [flipTick, dropDuration, dropEase]);

  const captureFlip = useCallback(() => {
    const root = scopeRef.current;
    if (!root) return;
    const rects = new Map<string, DOMRect>();
    root.querySelectorAll<HTMLElement>(FLIP_SELECTOR).forEach((el) => {
      const id = el.getAttribute('data-flip-id');
      if (id != null) rects.set(id, el.getBoundingClientRect());
    });
    prevRects.current = rects;
  }, []);

  const registerZone = useCallback((id: string, el: HTMLElement, accepts: ZoneAccept) => {
    zones.current.set(id, { el, accepts });
  }, []);
  const unregisterZone = useCallback((id: string) => {
    zones.current.delete(id);
  }, []);

  // Topmost registered zone whose rect contains the point (last match wins).
  const hitTest = useCallback((x: number, y: number): { id: string; entry: ZoneEntry } | null => {
    let found: { id: string; entry: ZoneEntry } | null = null;
    for (const [id, entry] of zones.current) {
      const r = entry.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = { id, entry };
    }
    return found;
  }, []);

  const beginDrag = useCallback(
    (cardId: number, fromZone: string | null) => {
      if (disabled) return;
      dragRef.current = { cardId, fromZone };
      setDraggingId(cardId);
      onDragStart?.(cardId, fromZone);
    },
    [disabled, onDragStart],
  );

  const moveDrag = useCallback(
    (x: number, y: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const hit = hitTest(x, y);
      if (!hit || hit.id === drag.fromZone) {
        setOverZoneId(null);
        setOverValid(false);
        return;
      }
      setOverZoneId(hit.id);
      setOverValid(hit.entry.accepts(drag.cardId, drag.fromZone));
    },
    [hitTest],
  );

  const finish = useCallback(
    (accepted: boolean) => {
      dragRef.current = null;
      setDraggingId(null);
      setOverZoneId(null);
      setOverValid(false);
      onDragEnd?.(accepted);
    },
    [onDragEnd],
  );

  const endDrag = useCallback(
    (x: number, y: number) => {
      const drag = dragRef.current;
      if (!drag) return false;
      const hit = hitTest(x, y);
      let accepted = false;
      if (hit && hit.id !== drag.fromZone && hit.entry.accepts(drag.cardId, drag.fromZone)) {
        // Snapshot positions while the card is still under the pointer…
        captureFlip();
        accepted = onDrop?.(drag.cardId, hit.id, drag.fromZone) !== false;
        // …and, if the move stuck, animate every card into its new slot.
        if (accepted) setFlipTick((t) => t + 1);
        else prevRects.current = new Map();
      }
      finish(accepted);
      return accepted;
    },
    [hitTest, onDrop, finish, captureFlip],
  );

  const cancelDrag = useCallback(() => finish(false), [finish]);

  const value = useMemo<DragDropContextValue>(
    () => ({
      registerZone,
      unregisterZone,
      beginDrag,
      moveDrag,
      endDrag,
      cancelDrag,
      disabled,
      draggingId,
      overZoneId,
      overValid,
    }),
    [registerZone, unregisterZone, beginDrag, moveDrag, endDrag, cancelDrag, disabled, draggingId, overZoneId, overValid],
  );

  return (
    <Ctx.Provider value={value}>
      {/* `display: contents` scopes the FLIP query without affecting layout. */}
      <div ref={scopeRef} style={{ display: 'contents' }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
