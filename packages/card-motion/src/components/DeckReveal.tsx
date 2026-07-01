'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface DeckRevealProps<C extends { id: number }> {
  /** Header text. */
  title?: string;
  /** The cards to spread out (e.g. a pile from `useCardPiles`). */
  cards: C[];
  /** Render prop for a card face — drop in your own card component. */
  renderFace: (card: C) => ReactNode;
  /** Called with the picked card's id. */
  onPick: (id: number) => void;
  /** Called when the overlay or close button is clicked. */
  onClose: () => void;
  /** Extra class on the overlay, for theming. */
  className?: string;
  /** Shown when `cards` is empty. */
  emptyLabel?: ReactNode;
}

/**
 * A headless "open the deck" modal: spreads a pile so you can browse and pick
 * one card. Generic over the card shape, with the face as a render prop — there
 * is nothing card-game-specific here, so it's reusable across games. Ships
 * functional styles under the `cm-reveal-*` classes (import `card-motion/styles.css`);
 * override those classes, or pass `className`, to theme it.
 */
export function DeckReveal<C extends { id: number }>({
  title,
  cards,
  renderFace,
  onPick,
  onClose,
  className,
  emptyLabel = 'Empty.',
}: DeckRevealProps<C>) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus(); // move focus into the dialog on open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`cm-reveal-overlay${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cm-reveal-panel" ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        {(title || title === '') && (
          <div className="cm-reveal-head">
            <span>{title}</span>
            <button type="button" className="cm-reveal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="cm-reveal-grid">
          {cards.length === 0 && <div className="cm-reveal-empty">{emptyLabel}</div>}
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="cm-reveal-card"
              style={{ animationDelay: `${i * 0.028}s` }}
              onClick={() => onPick(c.id)}
            >
              {renderFace(c)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
