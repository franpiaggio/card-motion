import { RANKS, SUITS, type CardData } from 'card-motion';

/** Rank as a solitaire value: Ace = 1 … King = 13. */
export const rankVal = (c: CardData): number => (RANKS as readonly string[]).indexOf(c.rank) + 1;

/** Suit index 0–3 (♠ ♥ ♦ ♣), matching the foundation slots. */
export const suitIdx = (c: CardData): number => SUITS.findIndex((s) => s.glyph === c.suit);

export const isRed = (c: CardData): boolean => c.color === 'red';

/** Build a lookup so the pure engines can work on card ids alone. */
export function byIdMap(deck: CardData[]): Map<number, CardData> {
  return new Map(deck.map((c) => [c.id, c]));
}

/** A descending, alternating-color run (the movable sequence in both games). */
export function isValidRun(byId: Map<number, CardData>, ids: number[]): boolean {
  for (let i = 1; i < ids.length; i++) {
    const a = byId.get(ids[i - 1])!;
    const b = byId.get(ids[i])!;
    if (rankVal(b) !== rankVal(a) - 1 || isRed(a) === isRed(b)) return false;
  }
  return true;
}
