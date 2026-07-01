import type { LayoutFn, PileLayoutFn, Zones } from '../types';

/** Default card width / height in px (the visual reference size). */
export const CARD_W = 96;
export const CARD_H = 134;

/**
 * Default anchor points for each zone (the "active" layout, i.e. once cards are
 * in play): deck on the left, table in the play area to its right, hand fanned
 * at the bottom. The engine recenters the deck while it's idle.
 */
export function getZones(w: number, h: number): Zones {
  return {
    deck: { x: w * 0.13, y: h * 0.44 },
    table: { x: w * 0.5, y: h * 0.34 },
    hand: { x: w * 0.5, y: h * 0.74 },
    width: w,
    height: h,
  };
}

/** Deck: a tight stack with a slight offset for volume. */
export const deckTarget: LayoutFn = (index, _count, zones) => ({
  x: zones.deck.x + index * 0.35,
  y: zones.deck.y - index * 0.35,
  rotation: 0,
  scale: 1,
});

/** Hand: an arc fan — the center card sits highest and straight, edges rotate and dip. */
export const handTarget: LayoutFn = (index, count, zones) => {
  const off = index - (count - 1) / 2;
  const spacingX = count > 1 ? Math.min(112, (zones.width * 0.92) / count) : 0;
  const tiltPerCard = 5; // degrees
  const dip = 4; // px per unit² of offset
  return {
    x: zones.hand.x + off * spacingX,
    y: zones.hand.y + off * off * dip,
    rotation: off * tiltPerCard,
    scale: 1,
  };
};

/**
 * Table: a straight row centered in the play area to the *right* of the deck,
 * so played cards never overlap the deck (and never overflow the stage).
 */
export const tableTarget: LayoutFn = (index, count, zones) => {
  const clearX = zones.deck.x + 110; // keep clear of the deck on the left
  const right = zones.width - 50;
  const span = Math.max(0, right - clearX);
  const spacingX = count > 1 ? Math.min(112, span / count) : 0;
  const rowWidth = spacingX * (count - 1);
  const center = clearX + span / 2;
  return {
    x: center - rowWidth / 2 + index * spacingX,
    y: zones.table.y,
    rotation: 0,
    scale: 0.92,
  };
};

// ── Generic pile layouts (for `useCardPiles`) ───────────────────────────────
// Each is a `PileLayoutFn` anchored at the pile's own point, so the same layout
// works for any pile you declare.

/** A tight stack with a slight offset for volume (deck / discard pile). */
export const stackLayout: PileLayoutFn = (index, _count, { anchor }) => ({
  x: anchor.x + index * 0.35,
  y: anchor.y - index * 0.35,
  rotation: 0,
  scale: 1,
});

/** An arc fan centered on the anchor — the center card highest, edges tilted. */
export const fanLayout: PileLayoutFn = (index, count, { anchor, width }) => {
  const off = index - (count - 1) / 2;
  const spacingX = count > 1 ? Math.min(112, (width * 0.92) / count) : 0;
  return {
    x: anchor.x + off * spacingX,
    y: anchor.y + off * off * 4,
    rotation: off * 5,
    scale: 1,
  };
};

/** A straight row centered on the anchor, clamped so it never overflows. */
export const rowLayout: PileLayoutFn = (index, count, { anchor, width }) => {
  const spacingX = count > 1 ? Math.min(108, (width * 0.6) / count) : 0;
  const rowWidth = spacingX * (count - 1);
  return {
    x: anchor.x - rowWidth / 2 + index * spacingX,
    y: anchor.y,
    rotation: 0,
    scale: 0.92,
  };
};
