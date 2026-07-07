/**
 * card-motion/vanilla — the framework-free build. Everything here is plain
 * TypeScript + GSAP: no React (or any other framework) required. The React
 * entry (`card-motion`) is a thin binding over these same engines, so both
 * builds share one behavior.
 */

// ── Engines (headless state + animation) ─────────────────────────────────────
export { createCardTable } from './core/table-engine';
export type { CardTableEngine, CardTableOptions, CardTableState, CardTableMotion } from './core/table-engine';

export { createCardPiles } from './core/piles-engine';
export type {
  CardPilesEngine,
  CardPilesOptions,
  CardPilesState,
  PileMotion,
  MoveOptions,
  GatherOptions,
} from './core/piles-engine';

// ── Interaction (pointer gestures) ───────────────────────────────────────────
export { createCardDrag } from './core/drag';
export type { CardDragEngine, CardDragOptions, CardDragHandlers, DragPoint, DragPointerLike } from './core/drag';

export { createCardInspect } from './core/inspect';
export type {
  CardInspectEngine,
  CardInspectOptions,
  CardInspectState,
  CardInspectPointerHandlers,
  InspectPointerLike,
  InspectTrigger,
} from './core/inspect';

export { createCardTilt, attachCardTilt } from './core/tilt';
export type { CardTiltController, CardTiltOptions } from './core/tilt';

export { createDragDropController } from './core/dragdrop';
export type {
  DragDropController,
  DragDropControllerOptions,
  DragDropControllerState,
  ZoneAccept,
  DropHandler,
} from './core/dragdrop';

export { createDraggableBehavior, attachDraggable } from './core/draggable';
export type {
  DraggableBehavior,
  DraggableBehaviorHandlers,
  DraggableBehaviorOptions,
  DraggablePointerLike,
  DragCoordinator,
} from './core/draggable';

export { captureFlipRects, playFlip, prefersReducedMotion, FLIP_SELECTOR } from './core/flip';

export { createStore } from './core/store';
export type { Store } from './core/store';

// ── DOM building blocks (rendered UI) ────────────────────────────────────────
export { createCard } from './dom/card';
export type { CreateCardOptions, CardHandle } from './dom/card';

export { mountCardTable } from './dom/card-table';
export type { MountCardTableOptions, CardTableMount } from './dom/card-table';

export { attachBackgroundShader, mountBackgroundShader } from './dom/background-shader';
export type {
  BackgroundShaderOptions,
  BackgroundShaderControls,
  BackgroundShaderHandle,
  BackgroundShaderColors,
} from './dom/background-shader';

export { mountDeckReveal } from './dom/deck-reveal';
export type { DeckRevealOptions, DeckRevealHandle } from './dom/deck-reveal';

export { createInspectLayer } from './dom/inspect-layer';
export type { InspectLayerOptions, InspectLayerHandle } from './dom/inspect-layer';

export { attachDropZone, mountDropZone } from './dom/dropzone';
export type { AttachDropZoneOptions, MountDropZoneOptions, DropZoneHandle } from './dom/dropzone';

// ── Deck & layout helpers (shared with the React entry) ─────────────────────
export { buildDeck, shuffleInPlace, SUITS, RANKS } from './lib/deck';
export { cardLabel } from './lib/names';
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
