import { buildDeck, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, rankVal } from './cards';

// ── Golf solitaire rules engine (pure) ───────────────────────────────────────
// 7 columns of 5 face-up cards. Move a column's exposed (bottom) card onto the
// waste when it is exactly one rank above or below the waste's top card (no
// wrap: A does not join K). Deal from the stock when stuck. Clear the tableau.

export interface GolfState {
  tableau: number[][]; // 7 columns; the playable card is the last of each
  stock: number[]; // face-down draw pile; top = last
  waste: number[]; // the building pile; top = last
}

export function deal(deck: CardData[] = shuffleInPlace(buildDeck())): { state: GolfState; deck: CardData[] } {
  const ids = deck.map((c) => c.id);
  const tableau: number[][] = Array.from({ length: 7 }, (_, c) => ids.slice(c * 5, c * 5 + 5));
  const rest = ids.slice(35);
  const waste = [rest[0]]; // flip one card up to start the pile
  const stock = rest.slice(1);
  return { state: { tableau, stock, waste }, deck };
}

const topOf = (pile: number[]): number | undefined => pile[pile.length - 1];

/** A tableau top card plays if it is one rank away from the waste top. */
export function canPlay(state: GolfState, byId: Map<number, CardData>, id: number): boolean {
  const col = state.tableau.find((c) => topOf(c) === id);
  if (!col) return false;
  const top = topOf(state.waste);
  if (top === undefined) return false;
  return Math.abs(rankVal(byId.get(id)!) - rankVal(byId.get(top)!)) === 1;
}

/** Move a playable tableau top onto the waste. Returns the next state or null. */
export function play(state: GolfState, byId: Map<number, CardData>, id: number): GolfState | null {
  if (!canPlay(state, byId, id)) return null;
  const col = state.tableau.findIndex((c) => topOf(c) === id);
  const next: GolfState = { tableau: state.tableau.map((c) => [...c]), stock: [...state.stock], waste: [...state.waste] };
  next.tableau[col].pop();
  next.waste.push(id);
  return next;
}

/** Flip the top of the stock onto the waste. */
export function draw(state: GolfState): GolfState {
  if (state.stock.length === 0) return state;
  const next: GolfState = { tableau: state.tableau.map((c) => [...c]), stock: [...state.stock], waste: [...state.waste] };
  next.waste.push(next.stock.pop()!);
  return next;
}

export function isWon(state: GolfState): boolean {
  return state.tableau.every((c) => c.length === 0);
}

/** Lost = tableau not clear, stock empty, and no column top is playable. */
export function isStuck(state: GolfState, byId: Map<number, CardData>): boolean {
  if (isWon(state)) return false;
  if (state.stock.length > 0) return false;
  return !state.tableau.some((c) => c.length > 0 && canPlay(state, byId, topOf(c)!));
}

export { byIdMap };
