import { createStore } from './store';

/** What opens the inspector. `hover` (mouse dwell), `press` (touch/mouse hold), `tap` (quick click toggles). */
export type InspectTrigger = 'hover' | 'press' | 'tap';

export interface CardInspectOptions {
  /** Master switch. Default `true`. */
  enabled?: boolean;
  /**
   * Which gestures open the inspector. Default `['hover', 'press']`. Anything
   * else — a button, right-click, a keyboard shortcut — can open it too by
   * calling `open` directly.
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

/**
 * The slice of a pointer event the inspect gestures actually read. Both native
 * `PointerEvent`s (with `currentTarget` narrowed to the element) and React's
 * synthetic pointer events satisfy it structurally.
 */
export interface InspectPointerLike {
  clientX: number;
  clientY: number;
  pointerType: string;
  currentTarget: HTMLElement;
}

export interface CardInspectPointerHandlers {
  onPointerEnter: (e: InspectPointerLike) => void;
  onPointerLeave: (e: InspectPointerLike) => void;
  onPointerDown: (e: InspectPointerLike) => void;
  onPointerMove: (e: InspectPointerLike) => void;
  onPointerUp: (e: InspectPointerLike) => void;
  onPointerCancel: (e: InspectPointerLike) => void;
}

/** The engine's reactive snapshot. */
export interface CardInspectState {
  /** The card being inspected, or `null`. */
  inspectId: number | null;
  /** The source card's on-screen rect when it opened — feed it to the inspect layer for the magnify FLIP. */
  sourceRect: DOMRect | null;
  /** `true` for a held/tapped inspect (stays up until dismissed); `false` for a transient hover peek. */
  pinned: boolean;
}

export interface CardInspectEngine {
  /** The current reactive snapshot. Stable reference between changes. */
  getState: () => CardInspectState;
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Pointer handlers for one card. Feed them pointer events however you wire them. */
  handlers: (id: number) => CardInspectPointerHandlers;
  /** Convenience for vanilla use: wires native pointer listeners on `el`. Returns a detach function. */
  attach: (el: HTMLElement, id: number) => () => void;
  /** Open the inspector from any event you like. Pass the source element to animate the magnify from it. */
  open: (id: number, sourceEl?: HTMLElement | null, pinned?: boolean) => void;
  /** Dismiss the inspector. */
  close: () => void;
  /** Swap in fresh options (triggers / delays / gates). */
  updateOptions: (next: CardInspectOptions) => void;
  /** Close and drop the window key listener. */
  destroy: () => void;
}

/**
 * Tap/hold/hover to inspect a card — the framework-free core behind
 * `useCardInspect`. State + gesture detection only; you render the magnified
 * content.
 *
 * It is movement-aware: a press that starts sliding is a drag, so a pending
 * inspect is cancelled and a drag engine on the same node wins. Hover opens a
 * transient peek that closes on leave; press/tap pin the inspector open until
 * dismissed (Escape, or your close control).
 */
export function createCardInspect(initialOptions: CardInspectOptions = {}): CardInspectEngine {
  let options = initialOptions;

  const store = createStore<CardInspectState>({ inspectId: null, sourceRect: null, pinned: false });

  let timer: ReturnType<typeof setTimeout> | null = null;
  let press: { id: number; sx: number; sy: number } | null = null;
  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Escape dismisses while open — bound only while something is inspected.
  let keyBound = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const bindKey = () => {
    if (!keyBound && typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
      keyBound = true;
    }
  };
  const unbindKey = () => {
    if (keyBound) {
      window.removeEventListener('keydown', onKey);
      keyBound = false;
    }
  };

  const open = (id: number, sourceEl?: HTMLElement | null, pin = true) => {
    const prev = store.get();
    store.set({
      inspectId: id,
      sourceRect: sourceEl ? sourceEl.getBoundingClientRect() : prev.sourceRect,
      pinned: pin,
    });
    bindKey();
  };

  const close = () => {
    clearTimer();
    press = null;
    store.set({ ...store.get(), inspectId: null, pinned: false });
    unbindKey();
  };

  const canOpen = (id: number) => (options.enabled ?? true) && (!options.canInspect || options.canInspect(id));
  const has = (t: InspectTrigger) => (options.triggers ?? ['hover', 'press']).includes(t);

  const handlers = (id: number): CardInspectPointerHandlers => ({
    onPointerEnter: (e) => {
      if (!canOpen(id) || !has('hover') || e.pointerType !== 'mouse') return;
      const el = e.currentTarget;
      clearTimer();
      timer = setTimeout(() => open(id, el, false), options.hoverDelay ?? 350); // transient peek
    },
    onPointerLeave: () => {
      clearTimer();
      const s = store.get();
      if (s.inspectId === id && !s.pinned) close(); // only dismiss a peek
    },
    onPointerDown: (e) => {
      if (!canOpen(id) || !has('press')) return;
      press = { id, sx: e.clientX, sy: e.clientY };
      const el = e.currentTarget;
      clearTimer();
      timer = setTimeout(() => {
        press = null;
        open(id, el, true); // hold pins it open
      }, options.pressDelay ?? 320);
    },
    onPointerMove: (e) => {
      const p = press;
      if (p && p.id === id && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (options.moveTolerance ?? 8)) {
        clearTimer(); // moved — it's a drag, yield to it
        press = null;
      }
    },
    onPointerUp: (e) => {
      const quick = press?.id === id; // released before the hold fired
      clearTimer();
      press = null;
      if (quick && has('tap')) {
        if (store.get().inspectId === id) close();
        else open(id, e.currentTarget, true);
      }
    },
    onPointerCancel: () => {
      clearTimer();
      press = null;
    },
  });

  const attach = (el: HTMLElement, id: number): (() => void) => {
    const h = handlers(id);
    const wrap = (fn: (e: InspectPointerLike) => void) => (e: PointerEvent) =>
      fn({ clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, currentTarget: el });
    const enter = wrap(h.onPointerEnter);
    const leave = wrap(h.onPointerLeave);
    const down = wrap(h.onPointerDown);
    const move = wrap(h.onPointerMove);
    const up = wrap(h.onPointerUp);
    const cancel = wrap(h.onPointerCancel);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  };

  return {
    getState: store.get,
    subscribe: store.subscribe,
    handlers,
    attach,
    open,
    close,
    updateOptions: (next) => {
      options = next;
    },
    destroy: () => {
      clearTimer();
      press = null;
      unbindKey();
    },
  };
}
