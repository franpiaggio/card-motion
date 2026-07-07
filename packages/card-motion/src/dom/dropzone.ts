import type { DragDropController, ZoneAccept } from '../core/dragdrop';

export interface AttachDropZoneOptions {
  /** Unique zone id, reported to `onDrop` as `toZone` / `fromZone`. */
  id: string;
  /** Reject cards this zone shouldn't accept (e.g. solitaire rules). */
  accepts?: ZoneAccept;
}

/**
 * Register `el` as a drop target on the controller and keep its hover
 * highlight classes (`cm-dropzone-over` / `-valid` / `-reject`) in sync with
 * the live drag state. Adds the `cm-dropzone` class and `data-zone-id`.
 * Returns a detach function.
 */
export function attachDropZone(el: HTMLElement, controller: DragDropController, { id, accepts }: AttachDropZoneOptions): () => void {
  el.classList.add('cm-dropzone');
  el.setAttribute('data-zone-id', id);
  controller.registerZone(id, el, (cardId, fromZone) => accepts?.(cardId, fromZone) ?? true);

  const sync = () => {
    const s = controller.getState();
    const isOver = s.draggingId != null && s.overZoneId === id;
    el.classList.toggle('cm-dropzone-over', isOver);
    el.classList.toggle('cm-dropzone-valid', isOver && s.overValid);
    el.classList.toggle('cm-dropzone-reject', isOver && !s.overValid);
  };
  sync();
  const unsubscribe = controller.subscribe(sync);

  return () => {
    unsubscribe();
    controller.unregisterZone(id);
    el.classList.remove('cm-dropzone-over', 'cm-dropzone-valid', 'cm-dropzone-reject');
  };
}

export interface MountDropZoneOptions extends AttachDropZoneOptions {
  /** Optional heading rendered above the drop area. */
  label?: Node | string;
  /** Accessible name. Defaults to `label` (if a string) or `id`. */
  ariaLabel?: string;
  className?: string;
}

export interface DropZoneHandle {
  /** The zone's root element (`.cm-dropzone`). */
  el: HTMLDivElement;
  /** Put your cards in here (`.cm-dropzone-body`) — flex row, stacked pile, grid… */
  body: HTMLDivElement;
  /** Unregister and remove the zone. */
  destroy: () => void;
}

/**
 * A registered drop target, framework-free. It highlights while a draggable
 * card hovers over it — green when the card is accepted, red when `accepts`
 * rejects it. Same DOM and classes as the React `DropZone`.
 */
export function mountDropZone(parent: HTMLElement, controller: DragDropController, options: MountDropZoneOptions): DropZoneHandle {
  const { id, accepts, label, ariaLabel, className } = options;

  const el = document.createElement('div');
  if (className) el.className = className; // attachDropZone adds cm-dropzone
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', ariaLabel ?? (typeof label === 'string' ? label : id));

  if (label != null) {
    const labelEl = document.createElement('div');
    labelEl.className = 'cm-dropzone-label';
    labelEl.append(typeof label === 'string' ? document.createTextNode(label) : label);
    el.append(labelEl);
  }
  const body = document.createElement('div');
  body.className = 'cm-dropzone-body';
  el.append(body);

  const detach = attachDropZone(el, controller, { id, accepts });
  parent.append(el);

  return {
    el,
    body,
    destroy: () => {
      detach();
      el.remove();
    },
  };
}
