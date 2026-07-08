'use client';

import { useEffect, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { createCardInspect, type CardInspectEngine, type CardInspectOptions } from '../core/inspect';

export type { InspectTrigger } from '../core/inspect';

export interface UseCardInspectOptions extends CardInspectOptions {}

export interface CardInspectHandlers {
  onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

export interface CardInspectApi {
  /** The card being inspected, or `null`. */
  inspectId: number | null;
  /** The source card's on-screen rect when it opened — feed it to {@link CardInspectLayer} for the magnify FLIP. */
  sourceRect: DOMRect | null;
  /** `true` for a held/tapped inspect (stays up until dismissed); `false` for a transient hover peek. */
  pinned: boolean;
  /** Spread onto each card node: `<div {...inspectProps(id)} />`. Composes with `useCardDrag`'s props. */
  inspectProps: (id: number) => CardInspectHandlers;
  /** Open the inspector from any event you like. Pass the source element to animate the magnify from it. */
  open: (id: number, sourceEl?: HTMLElement | null, pinned?: boolean) => void;
  /** Dismiss the inspector. */
  close: () => void;
}

/**
 * Tap/hold/hover to inspect a card. State + gesture detection only — you render
 * the magnified content (pair it with {@link CardInspectLayer} for the motion).
 *
 * It is movement-aware: a press that starts sliding is a drag, so a pending
 * inspect is cancelled and `useCardDrag` on the same node wins. Hover opens a
 * transient peek that closes on leave; press/tap pin the inspector open until
 * dismissed (Escape, or your close control).
 *
 * This is the React binding of the framework-free `createCardInspect` engine
 * (available from `card-motion/vanilla`).
 */
export function useCardInspect(opts: UseCardInspectOptions = {}): CardInspectApi {
  const [engine] = useState<CardInspectEngine>(() => createCardInspect(opts));
  // Refresh the triggers / delays / gates the engine reads on its next gesture.
  // Cheap ref-style assignment, safe to do during render.
  engine.updateOptions(opts);

  // Drop pending timers and the window key listener on unmount.
  useEffect(() => () => engine.destroy(), [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  return {
    inspectId: state.inspectId,
    sourceRect: state.sourceRect,
    pinned: state.pinned,
    inspectProps: engine.handlers,
    open: engine.open,
    close: engine.close,
  };
}
