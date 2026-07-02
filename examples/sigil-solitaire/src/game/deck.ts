import { shuffleInPlace } from 'card-motion';
import type { Difficulty } from './difficulties';

// The four sigils. The engine never reads any of this — only `id` — so the whole
// payload is ours to invent. That is the point of this demo.
export type ElementKey = 'ember' | 'tide' | 'gale' | 'terra';

export interface ElementDef {
  key: ElementKey;
  name: string;
}

export const ELEMENTS: readonly ElementDef[] = [
  { key: 'ember', name: 'Ember' },
  { key: 'tide', name: 'Tide' },
  { key: 'gale', name: 'Gale' },
  { key: 'terra', name: 'Terra' },
] as const;

export interface SigilCard {
  id: number;
  rank: number; // 1..maxRank
  element: ElementKey;
}

export interface Deal {
  cards: SigilCard[];
  columns: number[][]; // card ids per board column (top card = last)
  stock: number[]; // face-down draw pile (top = last)
  foundation: number[]; // the altar; starts with one card
}

const randInt = (n: number) => Math.floor(Math.random() * n);

/**
 * Build a fresh deal for a difficulty. Ranks and sigils are random — with wrap on
 * (Relaxed / Standard) a deal is almost always clearable; Hard can dead-end, which
 * the game detects and reports. No standard 52-card deck anywhere in sight.
 */
export function deal(cfg: Difficulty): Deal {
  const total = cfg.cols * cfg.rows + cfg.stock + 1; // +1 seeds the altar
  const cards: SigilCard[] = Array.from({ length: total }, (_, id) => ({
    id,
    rank: 1 + randInt(cfg.maxRank),
    element: ELEMENTS[randInt(ELEMENTS.length)].key,
  }));

  const ids = shuffleInPlace(cards.map((c) => c.id));
  const columns: number[][] = Array.from({ length: cfg.cols }, () => []);
  let k = 0;
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) columns[c].push(ids[k++]);
  }
  const foundation = [ids[k++]];
  const stock = ids.slice(k);
  return { cards, columns, stock, foundation };
}

// A hand-authored deal for the tutorial, arranged so a scripted path shows off
// each rule: a plain play, a chained + elemental bonus, a wrap, and a draw.
export function tutorialDeal(): Deal {
  const spec: Array<[number, ElementKey]> = [
    [6, 'terra'], // 0 · altar seed
    [5, 'tide'], // 1 · col0 under
    [7, 'ember'], // 2 · col0 top
    [4, 'gale'], // 3 · col1 under
    [8, 'ember'], // 4 · col1 top
    [1, 'tide'], // 5 · col2 under
    [9, 'tide'], // 6 · col2 top
    [4, 'gale'], // 7 · stock
    [2, 'ember'], // 8 · stock top
  ];
  const cards: SigilCard[] = spec.map(([rank, element], id) => ({ id, rank, element }));
  return {
    cards,
    columns: [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    stock: [7, 8],
    foundation: [0],
  };
}
