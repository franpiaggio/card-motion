'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { gsap, useGSAP } from '../internal/gsap';
import { buildDeck, shuffleInPlace } from '../lib/deck';
import { getZones as defaultGetZones, deckTarget, handTarget, tableTarget } from '../lib/layout';
import type { CardData, LayoutFn, Zones } from '../types';

export interface UseCardTableOptions {
  /** The cards to manage. Defaults to a fresh 52-card deck. */
  deck?: CardData[];
  /** How many cards `deal()` puts in the hand. Default `8`. */
  handSize?: number;
  /** Maps the stage size to zone anchors. Defaults to {@link getZones}. */
  getZones?: (w: number, h: number) => Zones;
  /** Override the per-zone layout functions. */
  layout?: Partial<Record<'deck' | 'hand' | 'table', LayoutFn>>;
}

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
  /** Send every card back to the deck. */
  reset: () => void;
}

type Orders = Record<'deck' | 'hand' | 'table', number[]>;

/**
 * Headless engine for a Balatro-style card table. Owns the deck/hand/table
 * state and drives the GSAP timelines; you render the cards and the controls.
 */
export function useCardTable(options: UseCardTableOptions = {}): CardTableApi {
  const { handSize = 8, getZones = defaultGetZones, layout } = options;
  const deckT = layout?.deck ?? deckTarget;
  const handT = layout?.hand ?? handTarget;
  const tableT = layout?.table ?? tableTarget;

  const [cards] = useState<CardData[]>(() => options.deck ?? buildDeck());

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef(new Map<number, HTMLElement>());
  const zonesRef = useRef<Zones>(getZones(0, 0));
  const busyRef = useRef(false);
  const ordersRef = useRef<Orders | null>(null);
  if (ordersRef.current === null) {
    ordersRef.current = { deck: cards.map((c) => c.id), hand: [], table: [] };
  }

  const registerCard = useCallback((id: number, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  const node = (id: number) => nodesRef.current.get(id) ?? null;

  // Place every card in its zone with no animation (mount / resize).
  const placeInstant = useCallback(() => {
    const z = zonesRef.current;
    const orders = ordersRef.current!;
    const set = (id: number, t: ReturnType<LayoutFn>, zi: number) =>
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: zi });
    orders.deck.forEach((id, i) => set(id, deckT(i, orders.deck.length, z), i));
    orders.hand.forEach((id, i) => set(id, handT(i, orders.hand.length, z), 100 + i));
    orders.table.forEach((id, i) => set(id, tableT(i, orders.table.length, z), 200 + i));
  }, [deckT, handT, tableT]);

  useGSAP(
    () => {
      const el = stageRef.current;
      if (!el) return;
      const measure = () => {
        zonesRef.current = getZones(el.clientWidth, el.clientHeight);
      };
      measure();
      placeInstant();
      const onResize = () => {
        measure();
        placeInstant();
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    },
    { scope: stageRef },
  );

  // Build a timeline behind an anti-overlap guard.
  const run = (build: (tl: gsap.core.Timeline, z: Zones) => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = gsap.timeline({ onComplete: () => (busyRef.current = false) });
    build(tl, zonesRef.current);
    if (tl.getChildren().length === 0) busyRef.current = false;
  };

  const shuffle = useCallback(
    () =>
      run((tl, z) => {
        const orders = ordersRef.current!;
        const all = [...orders.deck, ...orders.hand, ...orders.table];
        ordersRef.current = { deck: all, hand: [], table: [] };

        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, scale: 1, duration: 0.3, ease: 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.003);
        });

        shuffleInPlace(all);
        all.forEach((id, i) => {
          const side = i % 2 ? 1 : -1;
          tl.to(node(id), { x: z.deck.x + side * 74, y: z.deck.y - i * 0.3, rotation: side * 5, duration: 0.2, ease: 'power1.inOut' }, 0.45 + i * 0.004);
        });
        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, duration: 0.24, ease: 'power2.out', onStart: () => gsap.set(node(id), { zIndex: i }) }, 0.78 + i * 0.012);
        });
      }),
    [deckT],
  );

  const deal = useCallback(
    (count: number = handSize) =>
      run((tl, z) => {
        const orders = ordersRef.current!;
        const need = Math.min(count - orders.hand.length, orders.deck.length);
        if (need <= 0) return;
        const taken = orders.deck.splice(orders.deck.length - need, need).reverse();
        orders.hand.push(...taken);
        const hand = orders.hand;
        const n = hand.length;
        const firstNew = n - need;

        hand.forEach((id, i) => {
          const t = handT(i, n, z);
          const isNew = i >= firstNew;
          tl.to(
            node(id),
            {
              x: t.x,
              y: t.y,
              rotation: t.rotation,
              scale: t.scale,
              duration: isNew ? 0.45 : 0.3,
              ease: isNew ? 'back.out(1.3)' : 'power2.out',
              onStart: () => gsap.set(node(id), { zIndex: 100 + i }),
            },
            isNew ? (i - firstNew) * 0.09 : 0,
          );
        });
      }),
    [handSize, handT],
  );

  const play = useCallback(
    () =>
      run((tl, z) => {
        const orders = ordersRef.current!;
        if (!orders.hand.length) return;
        const moving = orders.hand.splice(0);
        orders.table.push(...moving);
        const table = orders.table;
        const n = table.length;
        table.forEach((id, i) => {
          const t = tableT(i, n, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, duration: 0.5, ease: 'power3.inOut', onStart: () => gsap.set(node(id), { zIndex: 200 + i }) }, i * 0.06);
        });
      }),
    [tableT],
  );

  const reset = useCallback(
    () =>
      run((tl, z) => {
        const orders = ordersRef.current!;
        const all = [...orders.deck, ...orders.hand, ...orders.table];
        ordersRef.current = { deck: all, hand: [], table: [] };
        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, scale: 1, duration: 0.4, ease: 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.008);
        });
      }),
    [deckT],
  );

  return { cards, stageRef, registerCard, shuffle, deal, play, reset };
}
