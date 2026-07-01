import type { CardData } from 'card-motion';

/** Base chips and multiplier for each poker hand (chips-times-mult scoring, no jokers). */
export const HAND_SCORES: Record<string, [number, number]> = {
  'High Card': [5, 1],
  Pair: [10, 2],
  'Two Pair': [20, 2],
  'Three of a Kind': [30, 3],
  Straight: [30, 4],
  Flush: [35, 4],
  'Full House': [40, 4],
  'Four of a Kind': [60, 7],
  'Straight Flush': [100, 8],
};

/** Rank ordering used for straights and high-card (Ace high). */
export const rankValue = (c: CardData) =>
  ({ A: 14, K: 13, Q: 12, J: 11 } as Record<string, number>)[c.rank] ?? parseInt(c.rank, 10);

/** Chips a card contributes when it scores (face cards 10, Ace 11). */
export const chipValue = (c: CardData) =>
  ({ A: 11, K: 10, Q: 10, J: 10 } as Record<string, number>)[c.rank] ?? parseInt(c.rank, 10);

export interface Evaluation {
  type: string;
  baseChips: number;
  mult: number;
  total: number;
  scoringOrder: number[];
}

/** Classifies a set of 1–5 cards and computes its (chips + card chips) × mult score. */
export function evaluate(cards: CardData[]): Evaluation {
  const n = cards.length;
  const byRank = new Map<number, CardData[]>();
  for (const c of cards) {
    const v = rankValue(c);
    const group = byRank.get(v);
    if (group) group.push(c);
    else byRank.set(v, [c]);
  }
  const groups = [...byRank.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
  const counts = groups.map((g) => g[1].length);

  const isFlush = n === 5 && new Set(cards.map((c) => c.suit)).size === 1;
  let isStraight = false;
  if (n === 5) {
    const vals = [...new Set(cards.map(rankValue))].sort((a, b) => a - b);
    if (vals.length === 5) isStraight = vals[4] - vals[0] === 4 || vals.join(',') === '2,3,4,5,14';
  }

  let type: string;
  let scoring: CardData[];
  if (isStraight && isFlush) [type, scoring] = ['Straight Flush', cards];
  else if (counts[0] === 4) [type, scoring] = ['Four of a Kind', groups[0][1]];
  else if (counts[0] === 3 && counts[1] === 2) [type, scoring] = ['Full House', cards];
  else if (isFlush) [type, scoring] = ['Flush', cards];
  else if (isStraight) [type, scoring] = ['Straight', cards];
  else if (counts[0] === 3) [type, scoring] = ['Three of a Kind', groups[0][1]];
  else if (counts[0] === 2 && counts[1] === 2) [type, scoring] = ['Two Pair', [...groups[0][1], ...groups[1][1]]];
  else if (counts[0] === 2) [type, scoring] = ['Pair', groups[0][1]];
  else [type, scoring] = ['High Card', [cards.reduce((hi, c) => (rankValue(c) > rankValue(hi) ? c : hi))]];

  const [baseChips, mult] = HAND_SCORES[type];
  const total = (baseChips + scoring.reduce((s, c) => s + chipValue(c), 0)) * mult;
  return { type, baseChips, mult, total, scoringOrder: scoring.map((c) => c.id) };
}
