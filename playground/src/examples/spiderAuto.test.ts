import { describe, expect, it } from 'vitest';
import { shuffleInPlace, type CardData } from 'card-motion';
import { buildSpiderDeck, byIdMap, deal, dealRow, isWon, move, type SpiderState } from './spiderRules';
import { planNext, solveGame } from './spiderAuto';

// Replay helper: applies actions exactly like the UI does.
function play(state: SpiderState, byId: ReturnType<typeof byIdMap>, actions: Array<{ type: string; id?: number; dest?: number }>) {
  let s = state;
  for (const act of actions) {
    const next = act.type === 'deal' ? dealRow(s, byId) : move(s, byId, act.id!, { type: 'tableau', index: act.dest! });
    if (!next) throw new Error('solver proposed an illegal action');
    s = next;
  }
  return s;
}

// Greedy fallback loop (what the UI does when the solver times out).
function greedy(state: SpiderState, byId: ReturnType<typeof byIdMap>, maxSteps = 3000) {
  let s = state;
  let steps = 0;
  while (!isWon(s) && steps < maxSteps) {
    const plan = planNext(s, byId);
    if (!plan) break;
    s = play(s, byId, plan);
    steps += plan.length;
  }
  return { state: s, steps, won: isWon(s) };
}

// Deterministic shuffle so CI always sees the same (known-solvable) deals.
const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function seededDeck(seed: number): CardData[] {
  const rand = mulberry32(seed);
  const deck = buildSpiderDeck(1);
  for (let j = deck.length - 1; j > 0; j--) {
    const k = Math.floor(rand() * (j + 1));
    [deck[j], deck[k]] = [deck[k], deck[j]];
  }
  return deck;
}

describe('spider auto-player', () => {
  it('solves an unshuffled single-suit deal end to end', () => {
    const d = deal(buildSpiderDeck(1));
    const byId = byIdMap(d.deck);
    const solution = solveGame(d.state, byId, 15000);
    expect(solution).not.toBeNull();
    expect(isWon(play(d.state, byId, solution!))).toBe(true);
  });

  it('solves known winnable shuffled deals', () => {
    for (const seed of [1000, 1001, 1002]) {
      const d = deal(seededDeck(seed));
      const byId = byIdMap(d.deck);
      const solution = solveGame(d.state, byId, 15000);
      expect(solution, `seed ${seed}`).not.toBeNull();
      expect(isWon(play(d.state, byId, solution!)), `seed ${seed}`).toBe(true);
    }
  });

  it('finishes a nearly-complete position in one move', () => {
    // Seven runs done; the eighth (K→A, ids 12..0) split across two columns.
    const state: SpiderState = {
      tableau: [[12, 11, 10, 9, 8, 7], [6, 5, 4, 3, 2, 1, 0], [], [], [], [], [], [], [], []],
      stock: [],
      faceUp: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      completed: 7,
    };
    const byId = byIdMap(buildSpiderDeck(1));
    const solution = solveGame(state, byId, 5000);
    expect(solution).toEqual([{ type: 'move', id: 6, dest: 0 }]);
  });

  it('the greedy fallback always terminates and never proposes illegal actions', () => {
    for (let i = 0; i < 3; i++) {
      const d = deal(shuffleInPlace(buildSpiderDeck(1)));
      const result = greedy(d.state, byIdMap(d.deck));
      expect(result.steps).toBeLessThan(3000); // terminated, no infinite loop
    }
  });
});
