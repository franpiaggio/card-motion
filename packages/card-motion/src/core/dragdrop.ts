import { createStore } from './store';
import { captureFlipRects, playFlip } from './flip';

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

/** The controller's reactive snapshot. */
export interface DragDropControllerState {
  /** Id of the card currently being dragged, or `null`. */
  draggingId: number | null;
  /** Id of the zone the pointer is over mid-drag, or `null`. */
  overZoneId: string | null;
  /** Whether the hovered zone would accept the dragged card. */
  overValid: boolean;
}

export interface DragDropControllerOptions {
  /**
   * Fired when a card is dropped on a zone. Return `false` to reject (snap
   * back). You own the data — move the card into `toZone` in your own state.
   */
  onDrop?: DropHandler;
  /** Fired when a drag begins (after the small movement threshold). */
  onDragStart?: (cardId: number, fromZone: string | null) => void;
  /** Fired when a drag ends, with whether a zone accepted the card. */
  onDragEnd?: (accepted: boolean) => void;
  /** Disable all dragging through this controller. Default `false`. */
  disabled?: boolean;
  /** Duration (s) of the "settle into the free slot" drop animation. Default `0.4`. */
  dropDuration?: number;
  /** Easing of the drop animation. Default `'power2.out'`. */
  dropEase?: string;
  /**
   * When a drop is accepted, the controller FLIP-animates every
   * `[data-flip-id]` element under the flip root from its pre-drop rect to its
   * new slot. With `'sync'` (the vanilla default) that happens immediately
   * after `onDrop` returns — mutate the DOM synchronously inside `onDrop`.
   * With `'manual'` (what the React provider uses) the rects stay pending and
   * you call `playPendingFlip()` yourself after your framework re-rendered.
   */
  flipTiming?: 'sync' | 'manual';
}

export interface DragDropController {
  /** Register a drop target. Re-registering an id replaces its entry. */
  registerZone: (id: string, el: HTMLElement, accepts: ZoneAccept) => void;
  unregisterZone: (id: string) => void;
  /** The element the FLIP query runs under. Defaults to `document` when unset. */
  setFlipRoot: (root: ParentNode | null) => void;
  /** Start tracking a drag for `cardId` (call once the movement threshold is passed). */
  beginDrag: (cardId: number, fromZone: string | null) => void;
  /** Report the pointer position mid-drag; updates the hovered-zone state. */
  moveDrag: (clientX: number, clientY: number) => void;
  /** Resolves the drop; returns `true` if a zone accepted the card. */
  endDrag: (clientX: number, clientY: number) => boolean;
  cancelDrag: () => void;
  /** The current reactive snapshot. Stable reference between changes. */
  getState: () => DragDropControllerState;
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Whether dragging is currently disabled (live view of the options). */
  isDisabled: () => boolean;
  /** `true` while an accepted drop's FLIP rects await `playPendingFlip` (manual timing). */
  hasPendingFlip: () => boolean;
  /** Play (and clear) the pending FLIP — call after your framework re-rendered the drop. */
  playPendingFlip: () => void;
  /** Swap in fresh options (callbacks / disabled / timings). */
  updateOptions: (next: DragDropControllerOptions) => void;
}

/**
 * Coordinates drag-and-drop between registered zones — the framework-free core
 * behind `DragDropProvider`. It supplies the *mechanics* (zone hit-testing,
 * drag state, the post-drop FLIP) and reports drops via `onDrop`; you own the
 * card state and game rules.
 */
export function createDragDropController(initialOptions: DragDropControllerOptions = {}): DragDropController {
  let options = initialOptions;
  const zones = new Map<string, ZoneEntry>();
  let drag: { cardId: number; fromZone: string | null } | null = null;
  let flipRoot: ParentNode | null = null;
  let pendingRects: Map<string, DOMRect> | null = null;

  const store = createStore<DragDropControllerState>({ draggingId: null, overZoneId: null, overValid: false });
  const root = () => flipRoot ?? (typeof document !== 'undefined' ? document : null);

  // Topmost registered zone whose rect contains the point (last match wins).
  const hitTest = (x: number, y: number): { id: string; entry: ZoneEntry } | null => {
    let found: { id: string; entry: ZoneEntry } | null = null;
    for (const [id, entry] of zones) {
      const r = entry.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = { id, entry };
    }
    return found;
  };

  const beginDrag = (cardId: number, fromZone: string | null) => {
    if (options.disabled) return;
    drag = { cardId, fromZone };
    store.set({ ...store.get(), draggingId: cardId });
    options.onDragStart?.(cardId, fromZone);
  };

  const moveDrag = (x: number, y: number) => {
    if (!drag) return;
    const hit = hitTest(x, y);
    if (!hit || hit.id === drag.fromZone) {
      store.set({ ...store.get(), overZoneId: null, overValid: false });
      return;
    }
    store.set({ ...store.get(), overZoneId: hit.id, overValid: hit.entry.accepts(drag.cardId, drag.fromZone) });
  };

  const finish = (accepted: boolean) => {
    drag = null;
    store.set({ draggingId: null, overZoneId: null, overValid: false });
    options.onDragEnd?.(accepted);
  };

  const playPendingFlip = () => {
    const rects = pendingRects;
    pendingRects = null;
    const r = root();
    if (!rects || !r) return;
    playFlip(r, rects, options.dropDuration ?? 0.4, options.dropEase ?? 'power2.out');
  };

  const endDrag = (x: number, y: number): boolean => {
    if (!drag) return false;
    const hit = hitTest(x, y);
    let accepted = false;
    if (hit && hit.id !== drag.fromZone && hit.entry.accepts(drag.cardId, drag.fromZone)) {
      // Snapshot positions while the card is still under the pointer…
      const r = root();
      pendingRects = r ? captureFlipRects(r) : null;
      accepted = options.onDrop?.(drag.cardId, hit.id, drag.fromZone) !== false;
      // …and, if the move stuck, animate every card into its new slot.
      if (!accepted) pendingRects = null;
      else if ((options.flipTiming ?? 'sync') === 'sync') playPendingFlip();
    }
    finish(accepted);
    return accepted;
  };

  const cancelDrag = () => finish(false);

  return {
    registerZone: (id, el, accepts) => {
      zones.set(id, { el, accepts });
    },
    unregisterZone: (id) => {
      zones.delete(id);
    },
    setFlipRoot: (r) => {
      flipRoot = r;
    },
    beginDrag,
    moveDrag,
    endDrag,
    cancelDrag,
    getState: store.get,
    subscribe: store.subscribe,
    isDisabled: () => !!options.disabled,
    hasPendingFlip: () => pendingRects != null,
    playPendingFlip,
    updateOptions: (next) => {
      options = next;
    },
  };
}
