import { buildDeck, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, rankVal } from './cards';

// ── Tri Peaks rules engine (pure) ────────────────────────────────────────────
// 28 cards in three overlapping peaks over a base row of 10. Take a free card
// (nothing resting on it) onto the waste when it is one rank away — with wrap,
// so an Ace plays on a King and vice-versa. Deal from the stock when stuck.

/** Slot layout in card-width units: {row, x}. A card rests on the two cards at x±0.5 below it. */
export const SLOTS: ReadonlyArray<{ row: number; x: number }> = [
  { row: 0, x: 1.5 }, { row: 0, x: 4.5 }, { row: 0, x: 7.5 },
  { row: 1, x: 1 }, { row: 1, x: 2 }, { row: 1, x: 4 }, { row: 1, x: 5 }, { row: 1, x: 7 }, { row: 1, x: 8 },
  { row: 2, x: 0.5 }, { row: 2, x: 1.5 }, { row: 2, x: 2.5 }, { row: 2, x: 3.5 }, { row: 2, x: 4.5 }, { row: 2, x: 5.5 }, { row: 2, x: 6.5 }, { row: 2, x: 7.5 }, { row: 2, x: 8.5 },
  { row: 3, x: 0 }, { row: 3, x: 1 }, { row: 3, x: 2 }, { row: 3, x: 3 }, { row: 3, x: 4 }, { row: 3, x: 5 }, { row: 3, x: 6 }, { row: 3, x: 7 }, { row: 3, x: 8 }, { row: 3, x: 9 },
];

/** The slots resting on `slot` (the two cards at row+1, x±0.5). */
export const CHILDREN: ReadonlyArray<number[]> = SLOTS.map((s) =>
  SLOTS.reduce<number[]>((acc, o, j) => {
    if (o.row === s.row + 1 && Math.abs(o.x - s.x) === 0.5) acc.push(j);
    return acc;
  }, []),
);

export interface TriPeaksState {
  tableau: (number | null)[]; // 28 slots
  stock: number[];
  waste: number[]; // top = last
}

export function deal(deck: CardData[] = shuffleInPlace(buildDeck())): { state: TriPeaksState; deck: CardData[] } {
  const ids = deck.map((c) => c.id);
  const rest = ids.slice(28);
  return { state: { tableau: ids.slice(0, 28), stock: rest.slice(1), waste: [rest[0]] }, deck };
}

const wasteTop = (s: TriPeaksState): number | undefined => s.waste[s.waste.length - 1];

export function isFreeSlot(s: TriPeaksState, slot: number): boolean {
  if (s.tableau[slot] == null) return false;
  return CHILDREN[slot].every((c) => s.tableau[c] == null);
}

export function canPlay(s: TriPeaksState, byId: Map<number, CardData>, id: number): boolean {
  const slot = s.tableau.indexOf(id);
  if (slot < 0 || !isFreeSlot(s, slot)) return false;
  const top = wasteTop(s);
  if (top === undefined) return false;
  const diff = Math.abs(rankVal(byId.get(id)!) - rankVal(byId.get(top)!));
  return diff === 1 || diff === 12; // ±1, with King↔Ace wrap
}

export function play(s: TriPeaksState, byId: Map<number, CardData>, id: number): TriPeaksState | null {
  if (!canPlay(s, byId, id)) return null;
  const slot = s.tableau.indexOf(id);
  const next: TriPeaksState = { tableau: [...s.tableau], stock: [...s.stock], waste: [...s.waste] };
  next.tableau[slot] = null;
  next.waste.push(id);
  return next;
}

export function draw(s: TriPeaksState): TriPeaksState {
  if (s.stock.length === 0) return s;
  const next: TriPeaksState = { tableau: [...s.tableau], stock: [...s.stock], waste: [...s.waste] };
  next.waste.push(next.stock.pop()!);
  return next;
}

export function isWon(s: TriPeaksState): boolean {
  return s.tableau.every((c) => c == null);
}

export function isStuck(s: TriPeaksState, byId: Map<number, CardData>): boolean {
  if (isWon(s)) return false;
  if (s.stock.length > 0) return false;
  return !s.tableau.some((id, slot) => id != null && isFreeSlot(s, slot) && canPlay(s, byId, id));
}

export { byIdMap };
