import type { CardData, CardColor, Suit } from '../types';

interface SuitDef {
  glyph: Suit;
  color: CardColor;
}

/** The four suits with their color, in canonical order. */
export const SUITS: readonly SuitDef[] = [
  { glyph: '♠', color: 'black' },
  { glyph: '♥', color: 'red' },
  { glyph: '♦', color: 'red' },
  { glyph: '♣', color: 'black' },
];

/** Ranks from Ace to King. */
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

/** Builds a standard, ordered 52-card deck. */
export function buildDeck(): CardData[] {
  const cards: CardData[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: id++, rank, suit: suit.glyph, color: suit.color });
    }
  }
  return cards;
}

/** Shuffles an array in place with the Fisher–Yates algorithm. Mutates and returns it. */
export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
