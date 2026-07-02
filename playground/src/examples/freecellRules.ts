import { buildDeck, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, isRed, isValidRun, rankVal, suitIdx } from './cards';

// ── FreeCell rules engine (pure) ─────────────────────────────────────────────
// State is card ids only; a `byId` map resolves the payload. Every function is
// pure and returns a new state (or null when a move is illegal).

export interface FreeCellState {
  /** 8 tableau columns, top of each column is the last element. */
  tableau: number[][];
  /** 4 free cells, each holding one card id or null. */
  free: (number | null)[];
  /** 4 foundations, one per suit index (♠ ♥ ♦ ♣), Ace-low ascending. */
  foundations: number[][];
}

export type Dest =
  | { type: 'tableau'; index: number }
  | { type: 'free'; index: number }
  | { type: 'foundation'; index: number };

export function deal(deck: CardData[] = shuffleInPlace(buildDeck())): {
  state: FreeCellState;
  deck: CardData[];
} {
  const tableau: number[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((c, i) => tableau[i % 8].push(c.id));
  return {
    state: { tableau, free: [null, null, null, null], foundations: [[], [], [], []] },
    deck,
  };
}

const topOf = (pile: number[]): number | undefined => pile[pile.length - 1];

/** How many cards may move at once: (freeCells + 1) × 2^(emptyColumns). */
export function maxMove(state: FreeCellState, destIsEmptyColumn: boolean): number {
  const freeCount = state.free.filter((c) => c === null).length;
  let emptyCols = state.tableau.filter((t) => t.length === 0).length;
  if (destIsEmptyColumn) emptyCols -= 1;
  return (freeCount + 1) * 2 ** Math.max(0, emptyCols);
}

export function canToFoundation(state: FreeCellState, byId: Map<number, CardData>, id: number): boolean {
  const c = byId.get(id)!;
  const f = state.foundations[suitIdx(c)];
  const top = topOf(f);
  const topVal = top === undefined ? 0 : rankVal(byId.get(top)!);
  return rankVal(c) === topVal + 1;
}

/** Can the given run (already validated) drop on tableau column `index`? */
export function canToTableau(state: FreeCellState, byId: Map<number, CardData>, run: number[], index: number): boolean {
  const col = state.tableau[index];
  if (col.length === 0) return true; // empty column accepts anything
  const t = byId.get(topOf(col)!)!;
  const head = byId.get(run[0])!;
  return rankVal(head) === rankVal(t) - 1 && isRed(head) !== isRed(t);
}

/** Locates the card and the run it heads (a tableau tail, or a single free-cell card). */
function source(
  state: FreeCellState,
  byId: Map<number, CardData>,
  id: number,
): { kind: 'tableau'; col: number; run: number[] } | { kind: 'free'; cell: number } | null {
  const col = state.tableau.findIndex((c) => c.includes(id));
  if (col >= 0) {
    const run = state.tableau[col].slice(state.tableau[col].indexOf(id));
    return isValidRun(byId, run) ? { kind: 'tableau', col, run } : null;
  }
  const cell = state.free.indexOf(id);
  return cell >= 0 ? { kind: 'free', cell } : null;
}

/** Returns the next state after moving `id` (and its run) to `dest`, or null if illegal. */
export function move(state: FreeCellState, byId: Map<number, CardData>, id: number, dest: Dest): FreeCellState | null {
  const src = source(state, byId, id);
  if (!src) return null;
  const run = src.kind === 'tableau' ? src.run : [id];

  if (dest.type === 'foundation') {
    if (run.length !== 1) return null;
    if (suitIdx(byId.get(id)!) !== dest.index) return null;
    if (!canToFoundation(state, byId, id)) return null;
  } else if (dest.type === 'free') {
    if (run.length !== 1 || state.free[dest.index] !== null) return null;
  } else {
    if (src.kind === 'tableau' && src.col === dest.index) return null; // no-op
    const toEmpty = state.tableau[dest.index].length === 0;
    if (run.length > maxMove(state, toEmpty)) return null;
    if (!canToTableau(state, byId, run, dest.index)) return null;
  }

  // Apply on a shallow clone.
  const next: FreeCellState = {
    tableau: state.tableau.map((c) => [...c]),
    free: [...state.free],
    foundations: state.foundations.map((f) => [...f]),
  };
  if (src.kind === 'tableau') next.tableau[src.col] = next.tableau[src.col].slice(0, -run.length);
  else next.free[src.cell] = null;

  if (dest.type === 'tableau') next.tableau[dest.index].push(...run);
  else if (dest.type === 'free') next.free[dest.index] = id;
  else next.foundations[dest.index].push(id);
  return next;
}

/** Best legal foundation move for a card (used by double-click / autoplay). */
export function toFoundation(state: FreeCellState, byId: Map<number, CardData>, id: number): FreeCellState | null {
  const c = byId.get(id);
  if (!c) return null;
  return move(state, byId, id, { type: 'foundation', index: suitIdx(c) });
}

export function isWon(state: FreeCellState): boolean {
  return state.foundations.reduce((n, f) => n + f.length, 0) === 52;
}

export { byIdMap };
