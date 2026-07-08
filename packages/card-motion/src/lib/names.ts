import type { Suit } from '../types';

export const RED_SUITS: Suit[] = ['♥', '♦'];
export const SUIT_NAMES: Record<Suit, string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
export const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

/** Human-readable card name, e.g. "Ace of spades". */
export function cardLabel(rank: string, suit: Suit): string {
  return `${RANK_NAMES[rank] ?? rank} of ${SUIT_NAMES[suit]}`;
}
