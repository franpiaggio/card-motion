'use client';

import { useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useGSAP } from '../internal/gsap';
import {
  createCardPiles,
  type CardPilesEngine,
  type CardPilesOptions,
  type GatherOptions,
  type MoveOptions,
} from '../core/piles-engine';
import type { CardData } from '../types';

export type { PileMotion, MoveOptions, GatherOptions } from '../core/piles-engine';

/** Options for {@link useCardPiles} — the same options the core engine takes. */
export interface UseCardPilesOptions<P extends string = string, C extends { id: number } = CardData>
  extends CardPilesOptions<P, C> {}

export interface CardPilesApi<P extends string = string, C extends { id: number } = CardData> {
  /** The full, stable set of cards. Render one node per card and wire {@link registerCard}. */
  cards: C[];
  /** Ref for the positioned stage element that contains the cards. */
  stageRef: RefObject<HTMLDivElement | null>;
  /** Ref callback to register each card's DOM node by id. */
  registerCard: (id: number, node: HTMLElement | null) => void;
  /** Reactive card ids in each pile, in order. */
  piles: Record<P, ReadonlyArray<number>>;
  /** Reactive card count in each pile. */
  counts: Record<P, number>;
  /** The pile a card currently lives in (or `null`). */
  pileOf: (id: number) => P | null;
  /** Move one or more cards to a pile, animating them into place. Resolves when the animation finishes. */
  move: (ids: number | number[], toPile: P, opts?: MoveOptions) => Promise<void>;
  /** Deal `count` cards from the top of one pile to another (a draw / deal). Resolves when done. */
  draw: (fromPile: P, toPile: P, count: number, opts?: MoveOptions) => Promise<void>;
  /** Collect cards from piles into one, optionally shuffling — the "reset" move. Resolves when done. */
  gather: (toPile: P, opts?: GatherOptions<P>) => Promise<void>;
  /** Riffle-shuffle the order of a single pile in place. Resolves when done. */
  shuffle: (pile: P) => Promise<void>;
  /**
   * Re-run the layout for one/all piles and animate cards to the new targets —
   * e.g. after mutating a card's payload (rotate, flip, resize). Resolves when
   * done. Pass nothing to relayout every pile.
   */
  relayout: (which?: P | P[]) => Promise<void>;
  /** Toggle a card's selection (lifts it). Works in any pile. */
  toggle: (id: number) => void;
  /** Ids of the currently selected (lifted) cards. */
  selected: ReadonlySet<number>;
}

/**
 * Headless engine for card games with **arbitrary piles**. You declare the
 * piles (deck, hand, discard, foundations, tableau columns…), render the cards,
 * and drive them with `move` / `gather` / `shuffle`; the hook owns the GSAP
 * timelines and card positions. `useCardTable` is a deck/hand/table preset; this
 * is the general primitive for solitaire, discard piles, and anything else.
 *
 * This is the React binding of the framework-free `createCardPiles` engine
 * (available from `card-motion/vanilla`).
 */
export function useCardPiles<P extends string = string, C extends { id: number } = CardData>(
  options: UseCardPilesOptions<P, C>,
): CardPilesApi<P, C> {
  const [engine] = useState<CardPilesEngine<P, C>>(() => createCardPiles<P, C>(options));
  // Refresh the anchors / layouts / timings the engine reads on its next
  // action. Cheap ref-style assignment, safe to do during render.
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
    piles: state.piles,
    counts: state.counts,
    pileOf: engine.pileOf,
    move: engine.move,
    draw: engine.draw,
    gather: engine.gather,
    shuffle: engine.shuffle,
    relayout: engine.relayout,
    toggle: engine.toggle,
    selected: state.selected,
  };
}
