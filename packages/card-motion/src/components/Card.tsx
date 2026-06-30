'use client';

import { forwardRef, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { useCardTilt } from '../hooks/useCardTilt';
import type { CardColor, Suit } from '../types';

const RED_SUITS: Suit[] = ['♥', '♦'];
const SUIT_NAMES: Record<Suit, string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

/** Human-readable card name, e.g. "Ace of spades". */
export function cardLabel(rank: string, suit: Suit): string {
  return `${RANK_NAMES[rank] ?? rank} of ${SUIT_NAMES[suit]}`;
}

export interface CardProps {
  /** Rank label, e.g. `A`, `7`, `10`, `K`. */
  rank: string;
  suit: Suit;
  /** Overrides the color inferred from the suit. */
  color?: CardColor;
  /** Card width in px; height scales proportionally. Default `96`. */
  width?: number;
  /** Enable the pointer-following 3D tilt. Default `true`. */
  tilt?: boolean;
  /** Maximum tilt in degrees. Default `16`. */
  maxTilt?: number;
  /** Always-on holographic foil overlay (special cards). Default `false`. */
  foil?: boolean;
  /** Reflected as `aria-pressed` and the `cm-selected` class. Default `false`. */
  selected?: boolean;
  /**
   * Make the card a keyboard-operable button: focusable, `role="button"`, and
   * activated by Enter/Space (which fires `onClick`). Default `false`.
   */
  interactive?: boolean;
  /** Accessible name. Defaults to e.g. "Ace of spades". */
  label?: string;
  /** Tab order — pass `-1` for the non-active cards in a roving-tabindex group. */
  tabIndex?: number;
  /** Hide from assistive tech (e.g. cards buried in the deck stack). */
  hiddenFromAt?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * A single playing card: cream face, corner indices, big center pip, an
 * optional always-on holographic foil, and a pointer-driven 3D tilt. When
 * `interactive`, it behaves as an accessible toggle button.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    rank,
    suit,
    color,
    width = 96,
    tilt = true,
    maxTilt = 16,
    foil = false,
    selected = false,
    interactive = false,
    label,
    tabIndex,
    hiddenFromAt = false,
    className,
    style,
    onClick,
    onKeyDown,
  },
  ref,
) {
  const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt({ maxTilt });
  const resolvedColor: CardColor = color ?? (RED_SUITS.includes(suit) ? 'red' : 'black');
  const height = width * (134 / 96);
  const name = label ?? cardLabel(rank, suit);

  const setOuter = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (interactive && !e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  // ARIA: hidden in the deck, a toggle button in the hand, an image otherwise.
  const aria = hiddenFromAt
    ? ({ 'aria-hidden': true } as const)
    : interactive
      ? ({ role: 'button', tabIndex: tabIndex ?? 0, 'aria-label': name, 'aria-pressed': selected } as const)
      : ({ role: 'img', 'aria-label': name } as const);

  const classes =
    'cm-card' + (foil ? ' cm-foil' : '') + (selected ? ' cm-selected' : '') + (className ? ` ${className}` : '');

  return (
    <div
      ref={setOuter}
      className={classes}
      style={{ width, height, '--cm-w': `${width}px`, ...style } as CSSProperties}
      onPointerMove={tilt ? onPointerMove : undefined}
      onPointerLeave={tilt ? onPointerLeave : undefined}
      onClick={onClick}
      onKeyDown={interactive || onKeyDown ? handleKeyDown : undefined}
      {...aria}
    >
      <div ref={contentRef} className="cm-card-inner">
        <div className={`cm-card-face cm-${resolvedColor}`}>
          <span className="cm-corner cm-tl" aria-hidden="true">
            <b>{rank}</b>
            <i>{suit}</i>
          </span>
          <span className="cm-pip" aria-hidden="true">{suit}</span>
          <span className="cm-corner cm-br" aria-hidden="true">
            <b>{rank}</b>
            <i>{suit}</i>
          </span>
        </div>
        {foil && <div className="cm-card-foil" />}
      </div>
    </div>
  );
});
