export { Card, cardLabel } from './components/Card';
export type { CardProps } from './components/Card';

export { BackgroundShader } from './components/BackgroundShader';
export type { BackgroundShaderProps, BackgroundShaderColors } from './components/BackgroundShader';

export { CardTable } from './components/CardTable';
export type { CardTableProps, CardTableHandle } from './components/CardTable';

export { DragDropProvider, useDragDrop } from './components/DragDropProvider';
export type { DragDropProviderProps, DropHandler, ZoneAccept, DragState } from './components/DragDropProvider';
export { DropZone } from './components/DropZone';
export type { DropZoneProps } from './components/DropZone';
export { DraggableCard } from './components/DraggableCard';
export type { DraggableCardProps } from './components/DraggableCard';

export { useCardTable } from './hooks/useCardTable';
export type { UseCardTableOptions, CardTableApi } from './hooks/useCardTable';

export { useCardTilt } from './hooks/useCardTilt';
export type { UseCardTiltOptions } from './hooks/useCardTilt';

export { buildDeck, shuffleInPlace, SUITS, RANKS } from './lib/deck';
export { getZones, deckTarget, handTarget, tableTarget, CARD_W, CARD_H } from './lib/layout';

export type { Suit, CardColor, CardData, Zone, Point, CardTarget, Zones, LayoutFn } from './types';
