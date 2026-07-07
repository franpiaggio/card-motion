export interface DeckRevealOptions<C extends { id: number }> {
  /** Header text. Omit for no header. */
  title?: string;
  /** The cards to spread out (e.g. a pile from `createCardPiles`). */
  cards: C[];
  /** Renders a card face — drop in your own markup (an element, or an HTML-free string). */
  renderFace: (card: C) => Node | string;
  /** Called with the picked card's id. */
  onPick: (id: number) => void;
  /** Called when the overlay, close button or Escape is used. */
  onClose: () => void;
  /** Extra class on the overlay, for theming. */
  className?: string;
  /** Shown when `cards` is empty. Default `'Empty.'`. */
  emptyLabel?: Node | string;
}

export interface DeckRevealHandle {
  /** The overlay element (already appended to the parent). */
  el: HTMLDivElement;
  /** Remove the overlay and its key listener. */
  destroy: () => void;
}

/**
 * An "open the deck" modal, framework-free: spreads a pile so you can browse
 * and pick one card. Generic over the card shape, with the face as a render
 * callback — there is nothing card-game-specific here. Same DOM and
 * `cm-reveal-*` classes as the React `DeckReveal` (import
 * `card-motion/styles.css`); override those classes, or pass `className`, to
 * theme it.
 */
export function mountDeckReveal<C extends { id: number }>(parent: HTMLElement, options: DeckRevealOptions<C>): DeckRevealHandle {
  const { title, cards, renderFace, onPick, onClose, className, emptyLabel = 'Empty.' } = options;

  const overlay = document.createElement('div');
  overlay.className = `cm-reveal-overlay${className ? ` ${className}` : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.addEventListener('click', () => onClose());

  const panel = document.createElement('div');
  panel.className = 'cm-reveal-panel';
  panel.tabIndex = -1;
  panel.addEventListener('click', (e) => e.stopPropagation());
  overlay.append(panel);

  if (title !== undefined) {
    const head = document.createElement('div');
    head.className = 'cm-reveal-head';
    const span = document.createElement('span');
    span.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cm-reveal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => onClose());
    head.append(span, closeBtn);
    panel.append(head);
  }

  const grid = document.createElement('div');
  grid.className = 'cm-reveal-grid';
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cm-reveal-empty';
    empty.append(typeof emptyLabel === 'string' ? document.createTextNode(emptyLabel) : emptyLabel);
    grid.append(empty);
  }
  cards.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-reveal-card';
    btn.style.animationDelay = `${i * 0.028}s`;
    btn.addEventListener('click', () => onPick(c.id));
    const face = renderFace(c);
    btn.append(typeof face === 'string' ? document.createTextNode(face) : face);
    grid.append(btn);
  });
  panel.append(grid);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', onKey);

  parent.append(overlay);
  panel.focus(); // move focus into the dialog on open

  return {
    el: overlay,
    destroy: () => {
      window.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };
}
