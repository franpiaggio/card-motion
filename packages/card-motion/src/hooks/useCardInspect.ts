'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** What opens the inspector. `hover` (mouse dwell), `press` (touch/mouse hold), `tap` (quick click toggles). */
export type InspectTrigger = 'hover' | 'press' | 'tap';

export interface UseCardInspectOptions {
  /** Master switch. Default `true`. */
  enabled?: boolean;
  /**
   * Which gestures open the inspector. Default `['hover', 'press']`. Anything
   * else — a button, right-click, a keyboard shortcut — can open it too by
   * calling {@link CardInspectApi.open} directly.
   */
  triggers?: InspectTrigger[];
  /** ms the mouse must dwell before a hover peek opens. Default `350`. */
  hoverDelay?: number;
  /** ms to hold before a long-press opens. Default `320`. */
  pressDelay?: number;
  /**
   * Px of movement that cancels a pending press — that's a drag, not a hold, so
   * the inspector yields to it. Default `8`.
   */
  moveTolerance?: number;
  /** Gate inspection per card (e.g. skip face-down cards). Default: any card. */
  canInspect?: (id: number) => boolean;
}

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
 */
export function useCardInspect(opts: UseCardInspectOptions = {}): CardInspectApi {
  const { enabled = true, triggers = ['hover', 'press'], hoverDelay = 350, pressDelay = 320, moveTolerance = 8, canInspect } = opts;

  const [inspectId, setInspectId] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [pinned, setPinned] = useState(false);

  // Refs mirror state so the pointer handlers read live values without re-binding.
  const inspectIdRef = useRef<number | null>(null);
  inspectIdRef.current = inspectId;
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ id: number; sx: number; sy: number } | null>(null);
  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const open = useCallback((id: number, sourceEl?: HTMLElement | null, pin = true) => {
    if (sourceEl) setSourceRect(sourceEl.getBoundingClientRect());
    setPinned(pin);
    setInspectId(id);
  }, []);

  const close = useCallback(() => {
    clearTimer();
    press.current = null;
    setInspectId(null);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (inspectId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspectId, close]);

  const canOpen = (id: number) => enabled && (!canInspect || canInspect(id));
  const has = (t: InspectTrigger) => triggers.includes(t);

  const inspectProps = useCallback(
    (id: number): CardInspectHandlers => ({
      onPointerEnter: (e) => {
        if (!canOpen(id) || !has('hover') || e.pointerType !== 'mouse') return;
        const el = e.currentTarget;
        clearTimer();
        timer.current = setTimeout(() => open(id, el, false), hoverDelay); // transient peek
      },
      onPointerLeave: () => {
        clearTimer();
        if (inspectIdRef.current === id && !pinnedRef.current) close(); // only dismiss a peek
      },
      onPointerDown: (e) => {
        if (!canOpen(id) || !has('press')) return;
        press.current = { id, sx: e.clientX, sy: e.clientY };
        const el = e.currentTarget;
        clearTimer();
        timer.current = setTimeout(() => {
          press.current = null;
          open(id, el, true); // hold pins it open
        }, pressDelay);
      },
      onPointerMove: (e) => {
        const p = press.current;
        if (p && p.id === id && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > moveTolerance) {
          clearTimer(); // moved — it's a drag, yield to it
          press.current = null;
        }
      },
      onPointerUp: (e) => {
        const quick = press.current?.id === id; // released before the hold fired
        clearTimer();
        press.current = null;
        if (quick && has('tap')) {
          if (inspectIdRef.current === id) close();
          else open(id, e.currentTarget, true);
        }
      },
      onPointerCancel: () => {
        clearTimer();
        press.current = null;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, triggers.join(','), hoverDelay, pressDelay, moveTolerance, canInspect, open, close],
  );

  return { inspectId, sourceRect, pinned, inspectProps, open, close };
}
