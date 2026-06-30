import type { LayoutFn, Zones } from '../types';

/** Default card width / height in px (the visual reference size). */
export const CARD_W = 96;
export const CARD_H = 134;

/**
 * Default anchor points for each zone as a function of the stage size:
 * deck on the left, table center-top, hand center-bottom (fanned).
 */
export function getZones(w: number, h: number): Zones {
  return {
    deck: { x: w * 0.15, y: h * 0.44 },
    table: { x: w * 0.5, y: h * 0.36 },
    hand: { x: w * 0.5, y: h * 0.72 },
    width: w,
    height: h,
  };
}

/** Horizontal spacing that never lets a centered row overflow the stage. */
function fitSpacing(count: number, width: number, max: number) {
  if (count <= 1 || width <= 0) return 0;
  return Math.min(max, (width * 0.92) / count);
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
  const spacingX = fitSpacing(count, zones.width, 112);
  const tiltPerCard = 5; // degrees
  const dip = 4; // px per unit² of offset
  return {
    x: zones.hand.x + off * spacingX,
    y: zones.hand.y + off * off * dip,
    rotation: off * tiltPerCard,
    scale: 1,
  };
};

/** Table: a straight, centered row, slightly smaller. */
export const tableTarget: LayoutFn = (index, count, zones) => {
  const mid = (count - 1) / 2;
  const spacingX = fitSpacing(count, zones.width, 112);
  return {
    x: zones.table.x + (index - mid) * spacingX,
    y: zones.table.y,
    rotation: 0,
    scale: 0.92,
  };
};
