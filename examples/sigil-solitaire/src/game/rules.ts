import type { SigilCard } from './deck';

// ── Pure rules ────────────────────────────────────────────────────────────────
// Golf-like: a board card plays onto the altar when it is one rank from the top
// card (optionally wrapping 1↔max). Chaining without drawing builds a streak
// multiplier; matching the altar's element pays an elemental bonus.

export function canPlay(card: SigilCard, top: SigilCard | undefined, maxRank: number, wrap: boolean): boolean {
  if (!top) return true; // an empty altar accepts anything
  const d = Math.abs(card.rank - top.rank);
  return d === 1 || (wrap && d === maxRank - 1);
}

export interface Score {
  score: number;
  streak: number; // consecutive plays since the last draw
  best: number; // longest streak this game
  lastGain: number; // points from the most recent play (for the toast)
  elemental: boolean; // was the last play an elemental match?
}

export const emptyScore: Score = { score: 0, streak: 0, best: 0, lastGain: 0, elemental: false };

/** Score a card played onto the altar, given the altar's previous top. */
export function scorePlay(card: SigilCard, prevTop: SigilCard | undefined, s: Score): Score {
  const streak = s.streak + 1;
  const elemental = !!prevTop && card.element === prevTop.element;
  const gain = card.rank * streak + (elemental ? 10 : 0);
  return {
    score: s.score + gain,
    streak,
    best: Math.max(s.best, streak),
    lastGain: gain,
    elemental,
  };
}

/** Drawing from the stock breaks the chain. */
export function breakStreak(s: Score): Score {
  return { ...s, streak: 0, lastGain: 0, elemental: false };
}
