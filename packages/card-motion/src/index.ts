export { Card, cardLabel } from './components/Card';
export type { CardProps } from './components/Card';

export { BackgroundShader } from './components/BackgroundShader';
export type { BackgroundShaderProps, BackgroundShaderColors } from './components/BackgroundShader';

export { CardTable } from './components/CardTable';
export type { CardTableProps, CardTableHandle } from './components/CardTable';

export { useCardTable } from './hooks/useCardTable';
export type { UseCardTableOptions, CardTableApi } from './hooks/useCardTable';

export { useCardTilt } from './hooks/useCardTilt';
export type { UseCardTiltOptions } from './hooks/useCardTilt';

export { buildDeck, shuffleInPlace, SUITS, RANKS } from './lib/deck';
export { getZones, deckTarget, handTarget, tableTarget, CARD_W, CARD_H } from './lib/layout';

export type { Suit, CardColor, CardData, Zone, Point, CardTarget, Zones, LayoutFn } from './types';
