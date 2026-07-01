export { Card, cardLabel } from './components/Card';
export type { CardProps } from './components/Card';

export { BackgroundShader } from './components/BackgroundShader';
export type { BackgroundShaderProps, BackgroundShaderColors } from './components/BackgroundShader';

export { DeckReveal } from './components/DeckReveal';
export type { DeckRevealProps } from './components/DeckReveal';

export { CardTable } from './components/CardTable';
export type { CardTableProps, CardTableHandle } from './components/CardTable';

export { DragDropProvider, useDragDrop } from './components/DragDropProvider';
export type { DragDropProviderProps, DropHandler, ZoneAccept, DragState } from './components/DragDropProvider';
export { DropZone } from './components/DropZone';
export type { DropZoneProps } from './components/DropZone';
export { DraggableCard } from './components/DraggableCard';
export type { DraggableCardProps } from './components/DraggableCard';

export { useCardTable } from './hooks/useCardTable';
export type { UseCardTableOptions, CardTableApi, CardTableMotion } from './hooks/useCardTable';

export { useCardPiles } from './hooks/useCardPiles';
export type {
  UseCardPilesOptions,
  CardPilesApi,
  MoveOptions,
  GatherOptions,
  PileMotion,
} from './hooks/useCardPiles';

export { useCardTilt } from './hooks/useCardTilt';
export type { UseCardTiltOptions } from './hooks/useCardTilt';

export { useCardDrag } from './hooks/useCardDrag';
export type { UseCardDragOptions, CardDragApi, DragPoint } from './hooks/useCardDrag';

export { buildDeck, shuffleInPlace, SUITS, RANKS } from './lib/deck';
export {
  getZones,
  deckTarget,
  handTarget,
  tableTarget,
  stack,
  fan,
  row,
  stackLayout,
  fanLayout,
  rowLayout,
  CARD_W,
  CARD_H,
} from './lib/layout';
export type { StackOptions, FanOptions, RowOptions } from './lib/layout';

export type {
  Suit,
  CardColor,
  CardData,
  Zone,
  Point,
  CardTarget,
  Zones,
  LayoutFn,
  Stage,
  PileLayoutContext,
  PileLayoutFn,
  PileConfig,
} from './types';
