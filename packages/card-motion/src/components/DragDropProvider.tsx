'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createDragDropController, type DragDropController, type DropHandler, type ZoneAccept } from '../core/dragdrop';

export type { ZoneAccept, DropHandler } from '../core/dragdrop';

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

/**
 * Coordinates drag-and-drop between `DropZone`s. It supplies the *mechanics*
 * (pointer tracking, zone hit-testing, snap-back) and reports drops via
 * `onDrop`; you own the card state and game rules. Build solitaire, freecell,
 * or any "drag a card into a slot" interaction on top of it.
 *
 * This is the React binding of the framework-free `createDragDropController`
 * (available from `card-motion/vanilla`). The controller captures the FLIP
 * rects before `onDrop` mutates your state; after React re-renders, the layout
 * effect below plays the FLIP so every card glides into its new slot.
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
  const [ctrl] = useState<DragDropController>(() =>
    createDragDropController({ onDrop, onDragStart, onDragEnd, disabled, dropDuration, dropEase, flipTiming: 'manual' }),
  );
  // Refresh the callbacks / timings the controller reads on its next event.
  // Cheap ref-style assignment, safe to do during render.
  ctrl.updateOptions({ onDrop, onDragStart, onDragEnd, disabled, dropDuration, dropEase, flipTiming: 'manual' });

  // `display: contents` scopes the FLIP query without affecting layout.
  const scopeRef = useRef<HTMLDivElement>(null);
  const [flipTick, setFlipTick] = useState(0);

  useLayoutEffect(() => {
    ctrl.setFlipRoot(scopeRef.current);
    return () => ctrl.setFlipRoot(null);
  }, [ctrl]);

  // After a drop re-renders the cards into their new zones, animate each one
  // from its captured pre-drop rect to where it now sits.
  useLayoutEffect(() => {
    ctrl.playPendingFlip();
  }, [flipTick, ctrl]);

  const state = useSyncExternalStore(ctrl.subscribe, ctrl.getState, ctrl.getState);

  const endDrag = useCallback(
    (x: number, y: number) => {
      const accepted = ctrl.endDrag(x, y);
      // An accepted drop leaves its rects pending: re-render, then FLIP.
      if (ctrl.hasPendingFlip()) setFlipTick((t) => t + 1);
      return accepted;
    },
    [ctrl],
  );

  const value = useMemo<DragDropContextValue>(
    () => ({
      registerZone: ctrl.registerZone,
      unregisterZone: ctrl.unregisterZone,
      beginDrag: ctrl.beginDrag,
      moveDrag: ctrl.moveDrag,
      endDrag,
      cancelDrag: ctrl.cancelDrag,
      disabled,
      draggingId: state.draggingId,
      overZoneId: state.overZoneId,
      overValid: state.overValid,
    }),
    [ctrl, endDrag, disabled, state],
  );

  return (
    <Ctx.Provider value={value}>
      <div ref={scopeRef} style={{ display: 'contents' }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
