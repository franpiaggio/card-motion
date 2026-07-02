export interface Difficulty {
  key: string;
  name: string;
  blurb: string;
  cols: number; // board columns
  rows: number; // cards per column
  stock: number; // draw-pile size
  maxRank: number; // ranks run 1..maxRank
  wrap: boolean; // does rank 1 meet maxRank?
  target: number; // score for a "gold" clear
}

// A small fixed board for the guided tutorial.
export const TUTORIAL_CFG: Difficulty = {
  key: 'tutorial',
  name: 'Tutorial',
  blurb: '',
  cols: 3,
  rows: 2,
  stock: 2,
  maxRank: 9,
  wrap: true,
  target: 0,
};

export const DIFFICULTIES: readonly Difficulty[] = [
  {
    key: 'relaxed',
    name: 'Relaxed',
    blurb: 'Ranks 1–7 wrap around, and the stock runs deep. A gentle place to learn the flow.',
    cols: 4,
    rows: 3,
    stock: 12,
    maxRank: 7,
    wrap: true,
    target: 120,
  },
  {
    key: 'standard',
    name: 'Standard',
    blurb: 'A wider board and the full 1–9 range. Wrap is still on, so chains stay alive.',
    cols: 5,
    rows: 3,
    stock: 14,
    maxRank: 9,
    wrap: true,
    target: 250,
  },
  {
    key: 'hard',
    name: 'Hard',
    blurb: 'No wrap, taller columns, a thin stock. One wrong order and the altar goes cold.',
    cols: 5,
    rows: 4,
    stock: 10,
    maxRank: 9,
    wrap: false,
    target: 400,
  },
];
