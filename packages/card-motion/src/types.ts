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

/** Stage size in px, passed to a pile's `anchor`. */
export interface Stage {
  width: number;
  height: number;
}

/**
 * Context a {@link PileLayoutFn} receives: the pile's anchor, the stage size,
 * and the card itself — so a layout can branch on the card's payload (a
 * game-specific type, orientation, size…), not just its index. Generic over the
 * card shape `C`; defaults to {@link CardData}.
 */
export interface PileLayoutContext<C = CardData> {
  /** The pile's resolved anchor point (px). */
  anchor: Point;
  /** Stage width in px. */
  width: number;
  /** Stage height in px. */
  height: number;
  /** The card being placed (its full payload). */
  card: C;
}

/**
 * Computes the target transform for the card at `index` within a pile that
 * currently holds `count` cards — a generalized {@link LayoutFn} for arbitrary
 * piles (see `useCardPiles`). Generic over the card shape `C`.
 */
export type PileLayoutFn<C = CardData> = (
  index: number,
  count: number,
  ctx: PileLayoutContext<C>,
) => CardTarget;

/** Declares one pile: where it sits on the stage and how its cards arrange. */
export interface PileConfig<C = CardData> {
  /** Where the pile anchors, from the current stage size. */
  anchor: (stage: Stage) => Point;
  /** How cards stack/fan/spread within the pile. */
  layout: PileLayoutFn<C>;
}
