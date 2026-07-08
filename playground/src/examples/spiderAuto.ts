import type { CardData } from 'card-motion';
import { rankVal } from './cards';
import { dealRow, move, type SpiderState } from './spiderRules';

// ── Spider auto-player (pure) ────────────────────────────────────────────────
// Each planning step runs a bounded best-first search from the current
// position toward the next *strict progress*: a completed K→A run, a
// face-down card flipped, or a net gain in in-suit adjacencies (two runs
// merged). The search freely uses multi-move maneuvers (parking runs on empty
// columns, temporary splits) as long as the path ends in net progress; the
// caller then plays the whole maneuver one animated move at a time before
// planning again. When no progress is reachable it deals a row.
//
// Termination is structural: `completed` never decreases, cards never turn
// face-down again, and a merge-only maneuver strictly raises a bounded
// counter — so the player can never walk in circles. Single-suit deals are
// won almost without exception; two-suit deals are played well but can be
// genuinely lost (the plan comes back `null` and the caller stops).

export type AutoAction = { type: 'move'; id: number; dest: number } | { type: 'deal' };

export function hashState(s: SpiderState): string {
  return s.tableau.map((c) => c.join(',')).join('|') + '#' + s.stock.length + '#' + s.completed;
}

const boardCount = (s: SpiderState): number => s.tableau.reduce((n, col) => n + col.length, 0);

const faceDownCount = (s: SpiderState): number => boardCount(s) - s.faceUp.length;

/**
 * A state that can never deal again: fewer than 10 cards on the board with
 * stock remaining (Spider forbids dealing over an empty column, and you can't
 * fill 10 columns with 9 cards). Completing a run into this is a trap — the
 * planner treats such states as forbidden.
 */
const doomed = (s: SpiderState): boolean => s.stock.length >= 10 && boardCount(s) < 10;

/** Adjacent face-up, in-suit, descending pairs — the "how merged is the board" counter. */
function pairCount(s: SpiderState, byId: Map<number, CardData>): number {
  let pairs = 0;
  for (const col of s.tableau) {
    for (let i = 1; i < col.length; i++) {
      if (!s.faceUp.includes(col[i - 1]) || !s.faceUp.includes(col[i])) continue;
      const a = byId.get(col[i - 1])!;
      const b = byId.get(col[i])!;
      if (a.suit === b.suit && rankVal(b) === rankVal(a) - 1) pairs++;
    }
  }
  return pairs;
}

type Move = { id: number; dest: number };

interface Node {
  state: SpiderState;
  path: Move[];
  depth: number;
}

/** All legal single-run moves from `s`. */
function expand(s: SpiderState, byId: Map<number, CardData>): Array<Move & { after: SpiderState }> {
  const out: Array<Move & { after: SpiderState }> = [];
  for (let srcCol = 0; srcCol < s.tableau.length; srcCol++) {
    const col = s.tableau[srcCol];
    for (let idx = 0; idx < col.length; idx++) {
      const id = col[idx];
      if (!s.faceUp.includes(id)) continue;
      for (let dest = 0; dest < s.tableau.length; dest++) {
        if (dest === srcCol) continue;
        const after = move(s, byId, id, { type: 'tableau', index: dest });
        if (after) out.push({ id, dest, after });
      }
    }
  }
  return out;
}

/** Ordering heuristic for the search frontier: closer-to-progress first. */
function heuristic(s: SpiderState, byId: Map<number, CardData>): number {
  const empties = s.tableau.filter((c) => c.length === 0).length;
  return s.completed * 10000 - faceDownCount(s) * 500 + pairCount(s, byId) * 40 + empties * 25;
}

/** Top progress maneuvers from `start`, best first (distinct end states). */
function searchProgressTop(
  start: SpiderState,
  byId: Map<number, CardData>,
  k: number,
  budget?: { nodes: number; depth: number },
): Array<{ path: Move[]; after: SpiderState }> {
  // With stock in reserve a shallow search is plenty (a deal resets the board
  // anyway); once the stock is out, the endgame tangles need real depth.
  const MAX_NODES = budget?.nodes ?? (start.stock.length === 0 ? 30000 : 4000);
  const MAX_DEPTH = budget?.depth ?? (start.stock.length === 0 ? 24 : 9);
  const basePairs = pairCount(start, byId);
  const baseDown = faceDownCount(start);
  const isProgress = (s: SpiderState) =>
    s.completed > start.completed || faceDownCount(s) < baseDown || pairCount(s, byId) > basePairs;
  // How *good* a progress state is: completions beat flips beat merges, and
  // among equals prefer the healthier position (empties kept, runs together).
  const progressValue = (s: SpiderState) =>
    (s.completed - start.completed) * 10000 + (baseDown - faceDownCount(s)) * 500 + heuristic(s, byId);

  const visited = new Set<string>([hashState(start)]);
  let frontier: Node[] = [];
  const goals = new Map<string, { path: Move[]; after: SpiderState; value: number }>();
  const consider = (path: Move[], after: SpiderState) => {
    const h = hashState(after);
    const value = progressValue(after);
    const prev = goals.get(h);
    if (!prev || value > prev.value) goals.set(h, { path, after, value });
  };
  const collect = () =>
    [...goals.values()].sort((a, b) => b.value - a.value).slice(0, k).map(({ path, after }) => ({ path, after }));

  for (const m of expand(start, byId)) {
    if (doomed(m.after)) continue; // never complete a run into an undealable board
    const path = [{ id: m.id, dest: m.dest }];
    if (isProgress(m.after)) {
      consider(path, m.after);
      continue;
    }
    const h = hashState(m.after);
    if (visited.has(h)) continue;
    visited.add(h);
    frontier.push({ state: m.after, path, depth: 1 });
  }
  // A whole generation is explored before committing, so the best immediate
  // progress wins — not merely the first one enumerated.
  if (goals.size) return collect();

  let nodes = frontier.length;
  while (frontier.length && nodes < MAX_NODES) {
    // Best-first in generations: a sorted frontier is plenty at this size.
    frontier.sort((a, b) => heuristic(b.state, byId) - heuristic(a.state, byId));
    const next: Node[] = [];
    for (const node of frontier) {
      if (node.depth >= MAX_DEPTH) continue;
      for (const m of expand(node.state, byId)) {
        if (doomed(m.after)) continue;
        const path = [...node.path, { id: m.id, dest: m.dest }];
        if (isProgress(m.after)) {
          consider(path, m.after);
          continue;
        }
        const h = hashState(m.after);
        if (visited.has(h)) continue;
        visited.add(h);
        next.push({ state: m.after, path, depth: node.depth + 1 });
        if (++nodes >= MAX_NODES) break;
      }
      if (nodes >= MAX_NODES) break;
    }
    if (goals.size) return collect();
    frontier = next;
  }
  return collect();
}

/**
 * The fill-empty-columns-then-deal maneuver, or `null` when it's impossible
 * (no stock, or an empty column nothing can legally fill). The fills and the
 * deal are ONE plan: re-planning in between would let the search undo the
 * fill as "progress" and loop forever.
 */
function dealPlan(s: SpiderState, byId: Map<number, CardData>): { plan: AutoAction[]; after: SpiderState } | null {
  if (s.stock.length < 10) return null;
  const fills: AutoAction[] = [];
  let cur = s;
  for (let empty = cur.tableau.findIndex((c) => c.length === 0); empty >= 0; empty = cur.tableau.findIndex((c) => c.length === 0)) {
    let best: (Move & { after: SpiderState }) | null = null;
    let bestLen = -1;
    for (const m of expand(cur, byId)) {
      if (m.dest !== empty) continue;
      if (doomed(m.after)) continue; // e.g. a K→A run harvesting itself away
      const srcCol = cur.tableau.find((c) => c.includes(m.id))!;
      const len = srcCol.length - srcCol.indexOf(m.id);
      // Never empty another column to fill this one (that's a shuffle).
      if (srcCol.length === len) continue;
      if (len > bestLen) {
        bestLen = len;
        best = m;
      }
    }
    if (!best) return null; // empty column and nothing can fill it: stuck
    fills.push({ type: 'move', id: best.id, dest: best.dest });
    cur = best.after;
  }
  const dealt = dealRow(cur, byId);
  if (!dealt) return null;
  return { plan: [...fills, { type: 'deal' }], after: dealt };
}

/**
 * Plan the next maneuver from `s`: a sequence of moves ending in strict
 * progress, a column-fill + row deal when no progress is reachable, or
 * `null` when the position is genuinely stuck.
 */
export function planNext(s: SpiderState, byId: Map<number, CardData>): AutoAction[] | null {
  const [best] = searchProgressTop(s, byId, 1);
  if (best) return best.path.map((m) => ({ type: 'move' as const, ...m }));
  return dealPlan(s, byId)?.plan ?? null;
}

/**
 * Game-level solver: follow the best maneuver, and when the game later dies,
 * backtrack and try the runners-up (including dealing earlier than strictly
 * needed). Memoizes dead positions and respects a wall-clock deadline.
 * Returns the full action list to a win, or `null` (out of time / unwinnable
 * within budget) — callers can then fall back to the greedy `planNext` line.
 */
export function solveGame(start: SpiderState, byId: Map<number, CardData>, timeBudgetMs = 6000): AutoAction[] | null {
  const deadline = performance.now() + timeBudgetMs;
  const dead = new Set<string>();

  const apply = (s: SpiderState, plan: AutoAction[]): SpiderState => {
    let cur = s;
    for (const act of plan) {
      cur = act.type === 'deal' ? dealRow(cur, byId)! : move(cur, byId, act.id, { type: 'tableau', index: act.dest })!;
    }
    return cur;
  };

  const dfs = (s: SpiderState): AutoAction[] | null => {
    if (s.completed === 8) return [];
    if (performance.now() > deadline) return null;
    const h = hashState(s);
    if (dead.has(h)) return null;

    // Inside the solver, per-node searches stay modest — the backtracking
    // supplies the depth; a fat per-node budget just burns the deadline.
    const budget = s.stock.length === 0 ? { nodes: 8000, depth: 16 } : { nodes: 3000, depth: 8 };
    const options: Array<{ plan: AutoAction[]; after: SpiderState }> = searchProgressTop(s, byId, 3, budget).map(({ path, after }) => ({
      plan: path.map((m) => ({ type: 'move' as const, ...m })),
      after,
    }));
    const deal = dealPlan(s, byId);
    if (deal) options.push(deal); // dealing is always a branch, not only a last resort
    // Explore the healthiest resulting position first.
    options.sort((a, b) => heuristic(b.after, byId) - heuristic(a.after, byId));

    for (const opt of options) {
      const rest = dfs(opt.after);
      if (rest) return [...opt.plan, ...rest];
      if (performance.now() > deadline) return null; // don't mark states dead on timeout
    }
    dead.add(h);
    return null;
  };

  const solution = dfs(start);
  if (!solution) return null;
  // Sanity: replay the whole line; a bug here must never reach the UI.
  const end = apply(start, solution);
  return end.completed === 8 ? solution : null;
}
