import { gsap } from './gsap';
import { createStore } from './store';

/** A point in stage coordinates (px from the stage's top-left). */
export interface DragPoint {
  x: number;
  y: number;
}

/**
 * The slice of a pointer event the drag maths actually reads. Both native
 * `PointerEvent`s (with `currentTarget` narrowed to the element) and React's
 * synthetic pointer events satisfy it structurally.
 */
export interface DragPointerLike {
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: {
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    setPointerCapture: (pointerId: number) => void;
  };
}

export interface CardDragOptions<P extends string = string> {
  /** The stage element cards live in — its rect converts pointer → stage coords. */
  stageRef: { current: { getBoundingClientRect: () => { left: number; top: number; width: number; height: number } } | null };
  /**
   * Given the dragged card's `id`, the drop point (stage coords) and the stage
   * size, return the target pile — or `null` to reject the drop and snap the
   * card back. Receiving the `id` lets you enforce per-card rules (e.g. a card
   * only some zones accept).
   */
  resolveDrop: (id: number, point: DragPoint, stage: { width: number; height: number }) => P | null;
  /**
   * Handle the drop yourself — do the `move` and any side-effects here. `point`
   * is the release location in stage coords (use it to pick a drop index, e.g.
   * to reorder within a pile). If omitted, the engine calls
   * `move(id, target ?? pileOf(id))` for you.
   */
  onDrop?: (id: number, target: P | null, point: DragPoint) => void;
  /** Engine `move`, used by the default drop when `onDrop` is omitted. */
  move?: (id: number, toPile: P) => Promise<void> | void;
  /** Engine `pileOf`, used to snap back when a drop resolves to null. */
  pileOf?: (id: number) => P | null;
  /** Whether a card may be dragged (e.g. only the hand). Default: always. */
  canDrag?: (id: number) => boolean;
  /** Fires once, when a drag actually begins (after the threshold) — e.g. to mark the card selected. */
  onDragStart?: (id: number) => void;
  /** Fires when the pointer is released without dragging — a tap (use it to select). */
  onTap?: (id: number) => void;
  /** Px the pointer must travel before it counts as a drag (vs a tap). Default `6`. */
  threshold?: number;
}

export interface CardDragHandlers {
  onPointerDown: (e: DragPointerLike) => void;
  onPointerMove: (e: DragPointerLike) => void;
  onPointerUp: (e: DragPointerLike) => void;
  onPointerCancel: (e: DragPointerLike) => void;
}

export interface CardDragEngine<P extends string = string> {
  /** Reactive snapshot: the id currently being dragged, or null. */
  getState: () => { dragId: number | null };
  /** Subscribe to `dragId` changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Pointer handlers for one card. Feed them pointer events however you wire them. */
  handlers: (id: number) => CardDragHandlers;
  /** Convenience for vanilla use: wires native pointer listeners on `el`. Returns a detach function. */
  attach: (el: HTMLElement, id: number) => () => void;
  /** Swap in fresh options (rules / callbacks / threshold). */
  updateOptions: (next: CardDragOptions<P>) => void;
}

/**
 * Pointer-drag for engine-positioned cards — the framework-free core behind
 * `useCardDrag`. While dragging it takes over the node's transform (via GSAP)
 * to follow the pointer; on release it hands control back to the engine
 * (`move`, or your `onDrop`) which animates the card into its slot. A press
 * that doesn't move past `threshold` is reported as a tap, so click-to-select
 * keeps working on the same nodes.
 */
export function createCardDrag<P extends string = string>(initialOptions: CardDragOptions<P>): CardDragEngine<P> {
  let options = initialOptions;
  let drag: { id: number; offX: number; offY: number; sx: number; sy: number; moved: boolean } | null = null;
  const store = createStore<{ dragId: number | null }>({ dragId: null });
  const setDragId = (dragId: number | null) => store.set({ dragId });

  const handlers = (id: number): CardDragHandlers => ({
    onPointerDown: (e) => {
      const { canDrag } = options;
      if (canDrag && !canDrag(id)) return;
      const r = e.currentTarget.getBoundingClientRect();
      drag = {
        id,
        offX: e.clientX - (r.left + r.width / 2),
        offY: e.clientY - (r.top + r.height / 2),
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = drag;
      if (!d || d.id !== id) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < (options.threshold ?? 6)) return;
      if (!d.moved) {
        d.moved = true;
        setDragId(id);
        options.onDragStart?.(id);
        gsap.set(e.currentTarget, { zIndex: 99999 });
      }
      const stage = options.stageRef.current?.getBoundingClientRect();
      if (!stage) return;
      gsap.set(e.currentTarget, { x: e.clientX - d.offX - stage.left, y: e.clientY - d.offY - stage.top });
    },
    onPointerUp: (e) => {
      const d = drag;
      if (!d || d.id !== id) return;
      drag = null;
      if (!d.moved) {
        options.onTap?.(id);
        return;
      }
      setDragId(null);
      const stage = options.stageRef.current?.getBoundingClientRect();
      if (!stage) return;
      const point = { x: e.clientX - stage.left, y: e.clientY - stage.top };
      const target = options.resolveDrop(id, point, { width: stage.width, height: stage.height });
      if (options.onDrop) {
        options.onDrop(id, target, point);
      } else if (options.move) {
        const dest = target ?? options.pileOf?.(id) ?? null;
        if (dest) void options.move(id, dest);
      }
    },
    // The pointer stream can be canceled (OS gesture, context menu, touch
    // interruption) with no pointerup. Treat it as a rejected drop so the card
    // snaps home instead of being left lifted and stuck.
    onPointerCancel: (e) => {
      const d = drag;
      if (!d || d.id !== id) return;
      drag = null;
      if (!d.moved) return;
      setDragId(null);
      const stage = options.stageRef.current?.getBoundingClientRect();
      const point = stage ? { x: e.clientX - stage.left, y: e.clientY - stage.top } : { x: 0, y: 0 };
      if (options.onDrop) {
        options.onDrop(id, null, point);
      } else if (options.move) {
        const dest = options.pileOf?.(id) ?? null;
        if (dest) void options.move(id, dest);
      }
    },
  });

  const attach = (el: HTMLElement, id: number): (() => void) => {
    const h = handlers(id);
    const wrap = (fn: (e: DragPointerLike) => void) => (e: PointerEvent) =>
      fn({ clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, currentTarget: el });
    const down = wrap(h.onPointerDown);
    const move = wrap(h.onPointerMove);
    const up = wrap(h.onPointerUp);
    const cancel = wrap(h.onPointerCancel);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
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
    updateOptions: (next) => {
      options = next;
    },
  };
}
