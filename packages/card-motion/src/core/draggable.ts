import { gsap } from './gsap';
import type { DragDropController } from './dragdrop';

const SNAP = { duration: 0.35, ease: 'back.out(1.5)' } as const;

/**
 * The slice of a pointer event the draggable behavior reads. Both native
 * `PointerEvent`s and React's synthetic pointer events satisfy it structurally.
 */
export interface DraggablePointerLike {
  clientX: number;
  clientY: number;
  pointerId: number;
  button: number;
}

/** The subset of the drag-drop controller the behavior drives. */
export interface DragCoordinator {
  beginDrag: (cardId: number, fromZone: string | null) => void;
  moveDrag: (clientX: number, clientY: number) => void;
  endDrag: (clientX: number, clientY: number) => boolean;
  cancelDrag: () => void;
  isDisabled: () => boolean;
}

export interface DraggableBehaviorOptions {
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
}

export interface DraggableBehaviorHandlers {
  onPointerDown: (e: DraggablePointerLike) => void;
  onPointerMove: (e: DraggablePointerLike) => void;
  onPointerUp: (e: DraggablePointerLike) => void;
  onPointerCancel: (e: DraggablePointerLike) => void;
}

export interface DraggableBehavior {
  handlers: DraggableBehaviorHandlers;
  /** Swap in fresh per-card options (zone / disabled / threshold / stack). */
  updateOptions: (next: DraggableBehaviorOptions) => void;
}

/**
 * The drag gesture of one card wired to a drag-drop coordinator — the
 * framework-free behavior behind `DraggableCard`. While dragging it lifts the
 * element (and any stacked run) and follows the pointer; on release it either
 * leaves the settle to the controller's FLIP (accepted) or springs the group
 * back (rejected). `getEl` decouples it from *when* the element exists, so a
 * React ref or a plain element both work.
 */
export function createDraggableBehavior(
  getEl: () => HTMLElement | null,
  coordinator: DragCoordinator,
  initialOptions: DraggableBehaviorOptions,
): DraggableBehavior {
  let options = initialOptions;
  let press: { x: number; y: number; dragging: boolean } | null = null;
  let stackEls: HTMLElement[] = [];

  const settle = (accepted: boolean) => {
    const el = getEl();
    if (!el) return;
    el.classList.remove('cm-dragging');
    // On accept, the controller's FLIP animates the re-rendered nodes (this
    // card and its stack) into their new slots — we leave them. On reject,
    // spring the whole group back, then hand the transform to CSS so hover
    // still works.
    if (!accepted) {
      gsap.to([el, ...stackEls], { x: 0, y: 0, scale: 1, ...SNAP, clearProps: 'zIndex,transform' });
    }
    stackEls = [];
  };

  const handlers: DraggableBehaviorHandlers = {
    onPointerDown: (e) => {
      if (options.disabled || coordinator.isDisabled() || e.button !== 0) return;
      press = { x: e.clientX, y: e.clientY, dragging: false };
      getEl()?.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const p = press;
      const el = getEl();
      if (!p || !el) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.dragging) {
        if (Math.hypot(dx, dy) < (options.threshold ?? 4)) return;
        p.dragging = true;
        el.classList.add('cm-dragging');
        gsap.killTweensOf(el);
        // Lift the whole group above the board; keep the run's own stacking
        // order — the grabbed card sits *under* the cards stacked on top of it.
        gsap.set(el, { zIndex: 9900 });
        // Juicy pickup: the card lifts and straightens as you grab it.
        gsap.to(el, { scale: 1.08, rotation: 0, duration: 0.18, ease: 'power2.out' });
        // Pick up any stacked cards (a solitaire run) so they drag as a group.
        stackEls = (options.stack ?? [])
          .map((sid) => document.querySelector<HTMLElement>(`[data-flip-id="${sid}"]`))
          .filter((n): n is HTMLElement => n != null);
        stackEls.forEach((s, i) => gsap.set(s, { zIndex: 9901 + i }));
        coordinator.beginDrag(options.id, options.zone ?? null);
      }
      // Follow the pointer 1:1 (scale keeps animating underneath).
      gsap.set(el, { x: dx, y: dy });
      if (stackEls.length) gsap.set(stackEls, { x: dx, y: dy });
      coordinator.moveDrag(e.clientX, e.clientY);
    },
    onPointerUp: (e) => {
      const p = press;
      press = null;
      const el = getEl();
      try {
        el?.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be gone */
      }
      if (!p || !p.dragging) return;
      settle(coordinator.endDrag(e.clientX, e.clientY));
    },
    onPointerCancel: () => {
      const p = press;
      press = null;
      if (!p || !p.dragging) return;
      coordinator.cancelDrag();
      settle(false);
    },
  };

  return {
    handlers,
    updateOptions: (next) => {
      options = next;
    },
  };
}

/**
 * Convenience for vanilla use: makes `el` draggable into the controller's
 * zones. Sets `data-flip-id` (required for the post-drop FLIP and for `stack`
 * lookups) and the `cm-draggable` class, and wires native pointer listeners.
 * Returns a detach function.
 */
export function attachDraggable(
  el: HTMLElement,
  controller: DragDropController,
  options: DraggableBehaviorOptions,
): () => void {
  el.setAttribute('data-flip-id', String(options.id));
  el.classList.add('cm-draggable');
  const behavior = createDraggableBehavior(() => el, controller, options);
  const h = behavior.handlers;
  const wrap = (fn: (e: DraggablePointerLike) => void) => (e: PointerEvent) =>
    fn({ clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, button: e.button });
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
}
