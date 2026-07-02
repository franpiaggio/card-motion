import { RANKS, shuffleInPlace, type CardData } from 'card-motion';
import { byIdMap, rankVal } from './cards';

// ── Spider solitaire (single suit) rules engine (pure) ───────────────────────
// Two decks, one suit (104 spades) so every deal is winnable. Build columns
// down; a descending run moves together. Complete a King→Ace run in a column
// and it is removed. Clear all eight runs to win.

export interface SpiderState {
  tableau: number[][]; // 10 columns
  stock: number[]; // dealt 10 at a time (one per column)
  faceUp: number[]; // face-up card ids
  completed: number; // removed K→A sequences (win at 8)
}

export type Dest = { type: 'tableau'; index: number };

/** 104 single-suit (spade) cards, ids 0–103. */
export function buildSpiderDeck(): CardData[] {
  return Array.from({ length: 104 }, (_, id) => ({ id, rank: RANKS[id % 13], suit: '♠' as const, color: 'black' as const }));
}

const topOf = (p: number[]): number | undefined => p[p.length - 1];

export function deal(deck: CardData[] = shuffleInPlace(buildSpiderDeck())): { state: SpiderState; deck: CardData[] } {
  const ids = deck.map((c) => c.id);
  const tableau: number[][] = Array.from({ length: 10 }, () => []);
  let k = 0;
  for (let col = 0; col < 10; col++) {
    const n = col < 4 ? 6 : 5; // 54 cards dealt
    for (let j = 0; j < n; j++) tableau[col].push(ids[k++]);
  }
  const faceUp = tableau.map((c) => c[c.length - 1]); // only tops face-up
  const stock = ids.slice(k); // 50 cards, dealt 10 at a time
  return { state: { tableau, stock, faceUp, completed: 0 }, deck };
}

const isUp = (s: SpiderState, id: number) => s.faceUp.includes(id);

/** A descending, consecutive run (same suit is implicit here). */
export function isRun(byId: Map<number, CardData>, ids: number[]): boolean {
  for (let i = 1; i < ids.length; i++) if (rankVal(byId.get(ids[i])!) !== rankVal(byId.get(ids[i - 1])!) - 1) return false;
  return true;
}

function source(s: SpiderState, byId: Map<number, CardData>, id: number): { col: number; run: number[] } | null {
  const col = s.tableau.findIndex((c) => c.includes(id));
  if (col < 0 || !isUp(s, id)) return null;
  const run = s.tableau[col].slice(s.tableau[col].indexOf(id));
  if (!run.every((r) => isUp(s, r)) || !isRun(byId, run)) return null;
  return { col, run };
}

export function canToTableau(s: SpiderState, byId: Map<number, CardData>, run: number[], index: number): boolean {
  const col = s.tableau[index];
  if (col.length === 0) return true;
  return rankVal(byId.get(topOf(col)!)!) === rankVal(byId.get(run[0])!) + 1;
}

function clone(s: SpiderState): SpiderState {
  return { tableau: s.tableau.map((c) => [...c]), stock: [...s.stock], faceUp: [...s.faceUp], completed: s.completed };
}

/** Remove a completed K→A run from the tail of a column, if present. */
function harvest(s: SpiderState, byId: Map<number, CardData>, col: number) {
  const c = s.tableau[col];
  if (c.length < 13) return;
  const tail = c.slice(-13);
  if (!tail.every((r) => isUp(s, r)) || !isRun(byId, tail) || rankVal(byId.get(tail[0])!) !== 13) return;
  s.tableau[col] = c.slice(0, -13);
  s.faceUp = s.faceUp.filter((id) => !tail.includes(id));
  s.completed += 1;
  const exposed = topOf(s.tableau[col]);
  if (exposed !== undefined && !s.faceUp.includes(exposed)) s.faceUp.push(exposed);
}

export function move(s: SpiderState, byId: Map<number, CardData>, id: number, dest: Dest): SpiderState | null {
  const src = source(s, byId, id);
  if (!src) return null;
  if (src.col === dest.index) return null;
  if (!canToTableau(s, byId, src.run, dest.index)) return null;

  const next = clone(s);
  next.tableau[src.col] = next.tableau[src.col].slice(0, -src.run.length);
  const exposed = topOf(next.tableau[src.col]);
  if (exposed !== undefined && !next.faceUp.includes(exposed)) next.faceUp.push(exposed);
  next.tableau[dest.index].push(...src.run);
  harvest(next, byId, dest.index);
  return next;
}

/** Deal one card face-up to every column (only when no column is empty). */
export function dealRow(s: SpiderState, byId: Map<number, CardData>): SpiderState | null {
  if (s.stock.length < 10) return null;
  if (s.tableau.some((c) => c.length === 0)) return null; // Spider rule
  const next = clone(s);
  for (let col = 0; col < 10; col++) {
    const card = next.stock.shift()!;
    next.tableau[col].push(card);
    next.faceUp.push(card);
  }
  for (let col = 0; col < 10; col++) harvest(next, byId, col);
  return next;
}

export function isWon(s: SpiderState): boolean {
  return s.completed === 8;
}

export { byIdMap };
