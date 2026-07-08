'use client';

import { useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { createCardDrag, type CardDragEngine, type CardDragOptions } from '../core/drag';

export type { DragPoint } from '../core/drag';

export interface UseCardDragOptions<P extends string = string> extends Omit<CardDragOptions<P>, 'stageRef'> {
  /** The stage element cards live in — its rect converts pointer → stage coords. */
  stageRef: RefObject<HTMLElement | null>;
}

export interface CardDragApi {
  /** The id currently being dragged, or null. */
  dragId: number | null;
  /** Spread onto each draggable card node: `<div {...dragProps(id)} />`. */
  dragProps: (id: number) => {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  };
}

/**
 * Pointer-drag for engine-positioned cards. While dragging it takes over the
 * node's transform (via GSAP) to follow the pointer; on release it hands control
 * back to the engine (`move`, or your `onDrop`) which animates the card into its
 * slot. A press that doesn't move past `threshold` is reported as a tap, so
 * click-to-select keeps working on the same nodes.
 *
 * This is the React binding of the framework-free `createCardDrag` engine
 * (available from `card-motion/vanilla`).
 */
export function useCardDrag<P extends string = string>(opts: UseCardDragOptions<P>): CardDragApi {
  const [engine] = useState<CardDragEngine<P>>(() => createCardDrag<P>(opts));
  // Refresh the rules / callbacks the engine reads on its next pointer event.
  // Cheap ref-style assignment, safe to do during render.
  engine.updateOptions(opts);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  return { dragId: state.dragId, dragProps: engine.handlers };
}
