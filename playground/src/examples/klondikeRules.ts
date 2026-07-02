import { buildDeck, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, isRed, isValidRun, rankVal, suitIdx } from './cards';

// ── Klondike (classic Solitaire) rules engine (pure) ─────────────────────────
// Draw-one. Face-up cards are tracked in a Set of ids; stock cards are face-down.

export interface KlondikeState {
  /** Face-down draw pile; top = last element. */
  stock: number[];
  /** Face-up discard; top = last element. */
  waste: number[];
  /** 7 tableau columns; only face-up tails are movable. */
  tableau: number[][];
  /** 4 foundations, one per suit index, Ace-low ascending. */
  foundations: number[][];
  /** Ids that are face-up (waste + foundations + exposed tableau cards). */
  faceUp: number[];
}

export type Dest = { type: 'tableau'; index: number } | { type: 'foundation'; index: number };

const topOf = (pile: number[]): number | undefined => pile[pile.length - 1];

export function deal(deck: CardData[] = shuffleInPlace(buildDeck())): { state: KlondikeState; deck: CardData[] } {
  const ids = deck.map((c) => c.id);
  const tableau: number[][] = Array.from({ length: 7 }, () => []);
  const faceUp: number[] = [];
  let k = 0;
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) tableau[col].push(ids[k++]);
    faceUp.push(tableau[col][tableau[col].length - 1]); // only the top is face-up
  }
  const stock = ids.slice(k); // remaining 24, all face-down
  return { state: { stock, waste: [], tableau, foundations: [[], [], [], []], faceUp }, deck };
}

const isUp = (state: KlondikeState, id: number): boolean => state.faceUp.includes(id);

/** Flip `count` stock cards to the waste, or recycle the waste when stock is empty. */
export function draw(state: KlondikeState, count = 1): KlondikeState {
  const next = clone(state);
  if (next.stock.length === 0) {
    if (next.waste.length === 0) return state;
    next.faceUp = next.faceUp.filter((id) => !next.waste.includes(id));
    next.stock = [...next.waste].reverse();
    next.waste = [];
    return next;
  }
  const n = Math.min(count, next.stock.length);
  for (let i = 0; i < n; i++) {
    const card = next.stock.pop()!;
    next.waste.push(card);
    next.faceUp.push(card);
  }
  return next;
}

export function canToFoundation(state: KlondikeState, byId: Map<number, CardData>, id: number): boolean {
  const c = byId.get(id)!;
  const f = state.foundations[suitIdx(c)];
  const top = topOf(f);
  const topVal = top === undefined ? 0 : rankVal(byId.get(top)!);
  return rankVal(c) === topVal + 1;
}

export function canToTableau(state: KlondikeState, byId: Map<number, CardData>, run: number[], index: number): boolean {
  const col = state.tableau[index];
  const head = byId.get(run[0])!;
  if (col.length === 0) return rankVal(head) === 13; // empty column: King only
  const t = byId.get(topOf(col)!)!;
  return rankVal(head) === rankVal(t) - 1 && isRed(head) !== isRed(t);
}

function clone(s: KlondikeState): KlondikeState {
  return {
    stock: [...s.stock],
    waste: [...s.waste],
    tableau: s.tableau.map((c) => [...c]),
    foundations: s.foundations.map((f) => [...f]),
    faceUp: [...s.faceUp],
  };
}

function source(
  state: KlondikeState,
  byId: Map<number, CardData>,
  id: number,
): { kind: 'tableau'; col: number; run: number[] } | { kind: 'waste' } | null {
  if (topOf(state.waste) === id) return { kind: 'waste' };
  const col = state.tableau.findIndex((c) => c.includes(id));
  if (col < 0 || !isUp(state, id)) return null;
  const run = state.tableau[col].slice(state.tableau[col].indexOf(id));
  if (!run.every((r) => isUp(state, r)) || !isValidRun(byId, run)) return null;
  return { kind: 'tableau', col, run };
}

export function move(state: KlondikeState, byId: Map<number, CardData>, id: number, dest: Dest): KlondikeState | null {
  const src = source(state, byId, id);
  if (!src) return null;
  const run = src.kind === 'tableau' ? src.run : [id];

  if (dest.type === 'foundation') {
    if (run.length !== 1) return null;
    if (suitIdx(byId.get(id)!) !== dest.index) return null;
    if (!canToFoundation(state, byId, id)) return null;
  } else {
    if (src.kind === 'tableau' && src.col === dest.index) return null;
    if (!canToTableau(state, byId, run, dest.index)) return null;
  }

  const next = clone(state);
  if (src.kind === 'waste') next.waste.pop();
  else {
    next.tableau[src.col] = next.tableau[src.col].slice(0, -run.length);
    const exposed = topOf(next.tableau[src.col]);
    if (exposed !== undefined && !next.faceUp.includes(exposed)) next.faceUp.push(exposed); // flip
  }
  if (dest.type === 'tableau') next.tableau[dest.index].push(...run);
  else {
    next.foundations[dest.index].push(id);
    if (!next.faceUp.includes(id)) next.faceUp.push(id);
  }
  return next;
}

export function toFoundation(state: KlondikeState, byId: Map<number, CardData>, id: number): KlondikeState | null {
  const c = byId.get(id);
  if (!c) return null;
  return move(state, byId, id, { type: 'foundation', index: suitIdx(c) });
}

export function isWon(state: KlondikeState): boolean {
  return state.foundations.reduce((n, f) => n + f.length, 0) === 52;
}

export { byIdMap };
