'use client';

import { forwardRef, type CSSProperties, type MouseEvent } from 'react';
import { useCardTilt } from '../hooks/useCardTilt';
import type { CardColor, Suit } from '../types';

const RED_SUITS: Suit[] = ['♥', '♦'];

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
  /**
   * Show the always-on holographic foil overlay. Reserved for "special" cards;
   * it is subtle and not triggered by hover. Default `false`.
   */
  foil?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/**
 * A single playing card: cream face, corner indices, big center pip, an
 * optional always-on holographic foil, and a pointer-driven 3D tilt.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { rank, suit, color, width = 96, tilt = true, maxTilt = 16, foil = false, className, style, onClick },
  ref,
) {
  const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt({ maxTilt });
  const resolvedColor: CardColor = color ?? (RED_SUITS.includes(suit) ? 'red' : 'black');
  const height = width * (134 / 96);

  const setOuter = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div
      ref={setOuter}
      className={`cm-card${foil ? ' cm-foil' : ''}${className ? ` ${className}` : ''}`}
      style={{ width, height, '--cm-w': `${width}px`, ...style } as CSSProperties}
      onPointerMove={tilt ? onPointerMove : undefined}
      onPointerLeave={tilt ? onPointerLeave : undefined}
      onClick={onClick}
    >
      <div ref={contentRef} className="cm-card-inner">
        <div className={`cm-card-face cm-${resolvedColor}`}>
          <span className="cm-corner cm-tl">
            <b>{rank}</b>
            <i>{suit}</i>
          </span>
          <span className="cm-pip">{suit}</span>
          <span className="cm-corner cm-br">
            <b>{rank}</b>
            <i>{suit}</i>
          </span>
        </div>
        {foil && <div className="cm-card-foil" />}
      </div>
    </div>
  );
});
