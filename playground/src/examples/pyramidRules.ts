import { buildDeck, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, rankVal } from './cards';

// ── Pyramid rules engine (pure) ──────────────────────────────────────────────
// 28 cards in a 7-row triangle. A card is "free" when the two cards resting on
// it are gone. Remove a free King (13) alone, or a pair of free cards summing
// to 13. Flip the stock to the waste (recyclable) to expose more matches.

export interface PyramidState {
  tableau: (number | null)[]; // 28 slots, row-major; null = removed
  stock: number[];
  waste: number[];
}

/** Slot index for (row, i). */
export const slotIndex = (row: number, i: number): number => (row * (row + 1)) / 2 + i;
/** Row of a slot index. */
export function rowOf(slot: number): number {
  let r = 0;
  while (slotIndex(r + 1, 0) <= slot) r++;
  return r;
}
/** The two slots resting on `slot` (empty for the base row). */
export function children(slot: number): number[] {
  const r = rowOf(slot);
  if (r === 6) return [];
  const i = slot - slotIndex(r, 0);
  return [slotIndex(r + 1, i), slotIndex(r + 1, i + 1)];
}

export function deal(deck: CardData[] = shuffleInPlace(buildDeck())): { state: PyramidState; deck: CardData[] } {
  const ids = deck.map((c) => c.id);
  return { state: { tableau: ids.slice(0, 28), stock: ids.slice(28), waste: [] }, deck };
}

const wasteTop = (s: PyramidState): number | undefined => s.waste[s.waste.length - 1];

/** A tableau slot is free when it still holds a card and both children are gone. */
export function isFreeSlot(s: PyramidState, slot: number): boolean {
  if (s.tableau[slot] == null) return false;
  return children(slot).every((c) => s.tableau[c] == null);
}

/** Is this card id currently playable (a free tableau card, or the waste top)? */
export function isFreeId(s: PyramidState, id: number): boolean {
  if (wasteTop(s) === id) return true;
  const slot = s.tableau.indexOf(id);
  return slot >= 0 && isFreeSlot(s, slot);
}

function removeId(next: PyramidState, id: number) {
  if (wasteTop(next) === id) {
    next.waste.pop();
    return;
  }
  const slot = next.tableau.indexOf(id);
  if (slot >= 0) next.tableau[slot] = null;
}

/** Remove a free King alone, or two free cards summing to 13. Returns null if illegal. */
export function remove(s: PyramidState, byId: Map<number, CardData>, ids: number[]): PyramidState | null {
  if (!ids.every((id) => isFreeId(s, id))) return null;
  if (ids.length === 1) {
    if (rankVal(byId.get(ids[0])!) !== 13) return null;
  } else if (ids.length === 2) {
    if (ids[0] === ids[1]) return null;
    if (rankVal(byId.get(ids[0])!) + rankVal(byId.get(ids[1])!) !== 13) return null;
  } else return null;
  const next: PyramidState = { tableau: [...s.tableau], stock: [...s.stock], waste: [...s.waste] };
  for (const id of ids) removeId(next, id);
  return next;
}

export function draw(s: PyramidState, recycle = true): PyramidState {
  if (s.stock.length === 0) {
    // recycle the waste back into the stock (only when redeals are allowed)
    if (!recycle || s.waste.length === 0) return s;
    return { tableau: [...s.tableau], stock: [...s.waste].reverse(), waste: [] };
  }
  const next: PyramidState = { tableau: [...s.tableau], stock: [...s.stock], waste: [...s.waste] };
  next.waste.push(next.stock.pop()!);
  return next;
}

export function isWon(s: PyramidState): boolean {
  return s.tableau.every((c) => c == null);
}

/**
 * Stuck = not won, no more draws available, and no legal match among the
 * currently-playable cards (free tableau cards plus the waste top).
 * With `recycle`, a non-empty waste can still be redealt, so the game isn't stuck.
 */
export function isStuck(s: PyramidState, byId: Map<number, CardData>, recycle = true): boolean {
  if (isWon(s)) return false;
  const canDraw = s.stock.length > 0 || (recycle && s.waste.length > 0);
  if (canDraw) return false;
  const playable: number[] = [];
  s.tableau.forEach((id, slot) => {
    if (id != null && isFreeSlot(s, slot)) playable.push(id);
  });
  const top = wasteTop(s);
  if (top !== undefined) playable.push(top);
  if (playable.some((id) => rankVal(byId.get(id)!) === 13)) return false;
  for (let a = 0; a < playable.length; a++)
    for (let b = a + 1; b < playable.length; b++) if (rankVal(byId.get(playable[a])!) + rankVal(byId.get(playable[b])!) === 13) return false;
  return true;
}

export { byIdMap };
