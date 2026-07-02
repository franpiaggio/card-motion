// The working-example games, shared by the #/examples index and the landing.
export interface GameCard {
  href: string;
  name: string;
  tag: string;
  accent: 'coral' | 'blue' | 'marigold';
  blurb: string;
  uses: string;
}

export const GAMES: ReadonlyArray<GameCard> = [
  { href: '#/freecell', name: 'FreeCell', tag: 'Drag & drop', accent: 'coral', blurb: 'All 52 cards face-up, four free cells, eight columns. Deterministic and pure logic.', uses: 'DragDropProvider · DropZone · DraggableCard' },
  { href: '#/klondike', name: 'Klondike', tag: 'Stock + waste', accent: 'blue', blurb: 'The classic Solitaire: a stock and waste, face-down tableau, King-only empty columns.', uses: 'DragDropProvider · DropZone · DraggableCard' },
  { href: '#/spider', name: 'Spider', tag: 'Single suit', accent: 'coral', blurb: 'Ten columns; build and clear King→Ace runs, deal a fresh row when you are stuck.', uses: 'DragDropProvider · DropZone · DraggableCard' },
  { href: '#/golf', name: 'Golf', tag: 'Climb ±1', accent: 'blue', blurb: 'Clear seven columns onto one waste pile, one rank up or down at a time.', uses: 'DragDropProvider · DropZone · Card' },
  { href: '#/pyramid', name: 'Pyramid', tag: 'Sum to 13', accent: 'marigold', blurb: 'Take pairs of free cards that add up to 13; a King leaves on its own.', uses: 'Card · custom layout' },
  { href: '#/tripeaks', name: 'Tri Peaks', tag: 'Climb + wrap', accent: 'marigold', blurb: 'Clear three peaks one rank at a time — Aces and Kings wrap around.', uses: 'Card · custom layout' },
];
