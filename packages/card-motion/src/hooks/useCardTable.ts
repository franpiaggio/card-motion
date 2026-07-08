'use client';

import { useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useGSAP } from '../internal/gsap';
import { createCardTable, type CardTableEngine, type CardTableOptions } from '../core/table-engine';
import type { CardData } from '../types';

export type { CardTableMotion } from '../core/table-engine';

/** Options for {@link useCardTable} — the same options the core engine takes. */
export interface UseCardTableOptions extends CardTableOptions {}

export interface CardTableApi {
  /** The full, stable deck. Render one node per card and wire {@link registerCard}. */
  cards: CardData[];
  /** Ref for the positioned stage element that contains the cards. */
  stageRef: RefObject<HTMLDivElement | null>;
  /** Ref callback to register each card's DOM node by id. */
  registerCard: (id: number, node: HTMLElement | null) => void;
  /** Collect everything to the deck, then riffle-shuffle. */
  shuffle: () => void;
  /** Fly cards from the deck into the hand fan. Deals up to `handSize` by default. */
  deal: (count?: number) => void;
  /** Move the whole hand into a row on the table. */
  play: () => void;
  /** Move only the currently selected hand cards onto the table. */
  playSelected: () => void;
  /** Send the table cards back to the deck (clears the table). */
  clearTable: () => void;
  /** Send every card back to the deck. */
  reset: () => void;
  /**
   * Toggle a hand card's selection: the first click **selects** it (lifts it),
   * the next click **deselects** it (lowers it). No-op for non-hand cards.
   */
  toggleCard: (id: number) => void;
  /** Ids of the currently selected (lifted) hand cards. */
  selected: ReadonlySet<number>;
  /** Reactive ids currently in the hand (in order). */
  hand: ReadonlyArray<number>;
  /** Reactive ids currently on the table (in order). */
  table: ReadonlyArray<number>;
  /** Reactive count of cards in each zone — handy to gate UI. */
  counts: { deck: number; hand: number; table: number };
}

/**
 * Headless engine for a classic card table. Owns the deck/hand/table
 * state and drives the GSAP timelines; you render the cards and the controls.
 *
 * This is the React binding of the framework-free `createCardTable` engine
 * (available from `card-motion/vanilla`).
 */
export function useCardTable(options: UseCardTableOptions = {}): CardTableApi {
  const [engine] = useState<CardTableEngine>(() => createCardTable(options));
  // Refresh the zones / layouts / timings the engine reads on its next action.
  // Cheap ref-style assignment, safe to do during render.
  engine.updateOptions(options);

  const stageRef = useRef<HTMLDivElement | null>(null);
  useGSAP(
    () => {
      const el = stageRef.current;
      if (!el) return;
      return engine.mount(el);
    },
    { scope: stageRef },
  );

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  return {
    cards: engine.cards,
    stageRef,
    registerCard: engine.registerCard,
    shuffle: engine.shuffle,
    deal: engine.deal,
    play: engine.play,
    playSelected: engine.playSelected,
    clearTable: engine.clearTable,
    reset: engine.reset,
    toggleCard: engine.toggleCard,
    selected: state.selected,
    hand: state.hand,
    table: state.table,
    counts: state.counts,
  };
}
