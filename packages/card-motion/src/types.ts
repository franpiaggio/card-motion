/** The four French-deck suit glyphs. */
export type Suit = '♠' | '♥' | '♦' | '♣';

/** Visual color of a card, derived from its suit. */
export type CardColor = 'red' | 'black';

/** A single card in the deck. */
export interface CardData {
  /** Stable unique id, used to track the card's DOM node across animations. */
  id: number;
  /** Rank label: `A`, `2`–`10`, `J`, `Q`, `K`. */
  rank: string;
  suit: Suit;
  color: CardColor;
}

/** The three zones a card can live in. */
export type Zone = 'deck' | 'hand' | 'table';

/** A point on the stage, in pixels, measured from the stage's top-left. */
export interface Point {
  x: number;
  y: number;
}

/** The resolved transform target for one card. */
export interface CardTarget {
  /** Center X in px (cards are centered via `xPercent: -50`). */
  x: number;
  /** Center Y in px. */
  y: number;
  /** Z-rotation in degrees. */
  rotation: number;
  scale: number;
}

/** Anchor points for each zone, plus the stage size (for responsive layouts). */
export interface Zones {
  deck: Point;
  hand: Point;
  table: Point;
  /** Stage width in px. */
  width: number;
  /** Stage height in px. */
  height: number;
}

/**
 * Computes the target transform for the card at `index` within a zone that
 * currently holds `count` cards. Swap these to customize the look of a layout.
 */
export type LayoutFn = (index: number, count: number, zones: Zones) => CardTarget;
