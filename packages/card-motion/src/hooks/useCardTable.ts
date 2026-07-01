'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { gsap, useGSAP } from '../internal/gsap';
import { buildDeck, shuffleInPlace } from '../lib/deck';
import { getZones as defaultGetZones, deckTarget, handTarget, tableTarget } from '../lib/layout';
import type { CardData, LayoutFn, Zones } from '../types';

/**
 * Timing knobs for the table's animations. Every field is optional and defaults
 * to the built-in choreography, so you override only what you want. Mirrors
 * `PileMotion` on `useCardPiles`.
 */
export interface CardTableMotion {
  /** Cards being dealt into the hand. Defaults: `0.45` / `'back.out(1.3)'`, stagger `0.09`. */
  dealDuration?: number;
  dealEase?: string;
  dealStagger?: number;
  /** Cards flying onto the table when played. Defaults: `0.5` / `'power3.inOut'`. */
  playDuration?: number;
  playEase?: string;
  /** Cards re-tweening into place (refan / deck slide / clear / reset). Overrides the built-in per-phase durations & eases. */
  moveDuration?: number;
  moveEase?: string;
  /** Time-scale for the riffle shuffle: `0.5` = twice as fast, `2` = half speed. Default `1`. */
  riffleScale?: number;
  /** How far (px) a hand card rises when selected. Default `30`. */
  selectLift?: number;
  /** Scale of a selected card. Default `1.06`. */
  selectScale?: number;
  /** Duration (s) of the select / deselect lift. Default `0.2`. */
  selectDuration?: number;
}

export interface UseCardTableOptions {
  /** The cards to manage. Defaults to a fresh 52-card deck. */
  deck?: CardData[];
  /** How many cards `deal()` puts in the hand. Default `8`. */
  handSize?: number;
  /** Maps the stage size to zone anchors. Defaults to {@link getZones}. */
  getZones?: (w: number, h: number) => Zones;
  /** Override the per-zone layout functions. */
  layout?: Partial<Record<'deck' | 'hand' | 'table', LayoutFn>>;
  /** Override the table's animation timings. Anything omitted keeps the default. */
  motion?: CardTableMotion;
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

type Orders = Record<'deck' | 'hand' | 'table', number[]>;

/**
 * Headless engine for a classic card table. Owns the deck/hand/table
 * state and drives the GSAP timelines; you render the cards and the controls.
 */
export function useCardTable(options: UseCardTableOptions = {}): CardTableApi {
  const { handSize = 8, getZones = defaultGetZones, layout } = options;
  const deckT = layout?.deck ?? deckTarget;
  const handT = layout?.hand ?? handTarget;
  const tableT = layout?.table ?? tableTarget;

  // Animation timings — defaults reproduce the built-in choreography. MOVE_DUR /
  // MOVE_EASE stay possibly-undefined so each re-tween site keeps its own default.
  const mo = options.motion ?? {};
  const MOVE_DUR = mo.moveDuration;
  const MOVE_EASE = mo.moveEase;
  const DEAL_DUR = mo.dealDuration ?? 0.45;
  const DEAL_EASE = mo.dealEase ?? 'back.out(1.3)';
  const DEAL_STAGGER = mo.dealStagger ?? 0.09;
  const PLAY_DUR = mo.playDuration ?? 0.5;
  const PLAY_EASE = mo.playEase ?? 'power3.inOut';
  const RIFFLE = mo.riffleScale ?? 1;
  const LIFT = mo.selectLift ?? 30;
  const SELECT_SCALE = mo.selectScale ?? 1.06;
  const SELECT_DUR = mo.selectDuration ?? 0.2;

  const [cards] = useState<CardData[]>(() => options.deck ?? buildDeck());

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef(new Map<number, HTMLElement>());
  const sizeRef = useRef({ w: 0, h: 0 });
  const busyRef = useRef(false);
  const reduceRef = useRef(false);
  const ordersRef = useRef<Orders | null>(null);
  if (ordersRef.current === null) {
    ordersRef.current = { deck: cards.map((c) => c.id), hand: [], table: [] };
  }
  const selectedRef = useRef(new Set<number>());
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const syncSelected = () => setSelected(new Set(selectedRef.current));
  const clearSelection = () => {
    if (selectedRef.current.size) {
      selectedRef.current.clear();
      syncSelected();
    }
  };

  const [counts, setCounts] = useState(() => ({ deck: cards.length, hand: 0, table: 0 }));
  const [hand, setHand] = useState<ReadonlyArray<number>>([]);
  const [tableIds, setTableIds] = useState<ReadonlyArray<number>>([]);
  const syncSnapshot = () => {
    const o = ordersRef.current!;
    setCounts({ deck: o.deck.length, hand: o.hand.length, table: o.table.length });
    setHand([...o.hand]);
    setTableIds([...o.table]);
  };

  const registerCard = useCallback((id: number, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  const node = (id: number) => nodesRef.current.get(id) ?? null;

  // Zone anchors for the *current* state. While idle (nothing dealt) the deck
  // is centered; once cards are in play it sits on the side.
  const computeZones = (): Zones => {
    const { w, h } = sizeRef.current;
    const base = getZones(w, h);
    const o = ordersRef.current!;
    const active = o.hand.length > 0 || o.table.length > 0;
    return active ? base : { ...base, deck: { x: w * 0.5, y: h * 0.48 } };
  };

  // Place every card in its zone with no animation (mount / resize).
  const placeInstant = useCallback(() => {
    const z = computeZones();
    const orders = ordersRef.current!;
    orders.deck.forEach((id, i) => {
      const t = deckT(i, orders.deck.length, z);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: i });
    });
    orders.hand.forEach((id, i) => {
      const t = handT(i, orders.hand.length, z);
      const sel = selectedRef.current.has(id);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y - (sel ? LIFT : 0), rotation: t.rotation, scale: sel ? SELECT_SCALE : t.scale, zIndex: sel ? 150 : 100 + i });
    });
    orders.table.forEach((id, i) => {
      const t = tableT(i, orders.table.length, z);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: 200 + i });
    });
  }, [deckT, handT, tableT]);

  useGSAP(
    () => {
      const el = stageRef.current;
      if (!el) return;
      const measure = () => {
        sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
      };
      measure();
      reduceRef.current = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
  const run = (build: (tl: gsap.core.Timeline) => void) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = gsap.timeline({ onComplete: () => (busyRef.current = false) });
    build(tl);
    if (tl.getChildren().length === 0) busyRef.current = false;
    else if (reduceRef.current) tl.progress(1); // honor prefers-reduced-motion: snap to the end
  };

  // Re-tween the deck stack to its current anchor (centered ↔ side).
  const layoutDeck = (tl: gsap.core.Timeline, z: Zones, duration = 0.4) => {
    const orders = ordersRef.current!;
    orders.deck.forEach((id, i) => {
      const t = deckT(i, orders.deck.length, z);
      tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, duration: MOVE_DUR ?? duration, ease: MOVE_EASE ?? 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, 0);
    });
  };

  // Re-tween the hand fan + table row to their current targets.
  const relayout = (tl: gsap.core.Timeline, z: Zones) => {
    const orders = ordersRef.current!;
    orders.hand.forEach((id, i) => {
      const t = handT(i, orders.hand.length, z);
      const sel = selectedRef.current.has(id);
      tl.to(node(id), { x: t.x, y: t.y - (sel ? LIFT : 0), rotation: t.rotation, scale: sel ? SELECT_SCALE : t.scale, zIndex: sel ? 150 : 100 + i, duration: MOVE_DUR ?? 0.35, ease: MOVE_EASE ?? 'power2.out' }, 0);
    });
    orders.table.forEach((id, i) => {
      const t = tableT(i, orders.table.length, z);
      tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: 200 + i, duration: MOVE_DUR ?? 0.45, ease: MOVE_EASE ?? 'power3.inOut' }, 0);
    });
  };

  const shuffle = useCallback(
    () =>
      run((tl) => {
        clearSelection();
        const orders = ordersRef.current!;
        const all = [...orders.deck, ...orders.hand, ...orders.table];
        ordersRef.current = { deck: all, hand: [], table: [] };
        syncSnapshot();
        const z = computeZones(); // idle → deck centered

        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, scale: 1, duration: 0.3 * RIFFLE, ease: 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.003 * RIFFLE);
        });

        shuffleInPlace(all);
        all.forEach((id, i) => {
          const side = i % 2 ? 1 : -1;
          tl.to(node(id), { x: z.deck.x + side * 74, y: z.deck.y - i * 0.3, rotation: side * 5, duration: 0.2 * RIFFLE, ease: 'power1.inOut' }, (0.45 + i * 0.004) * RIFFLE);
        });
        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, duration: 0.24 * RIFFLE, ease: 'power2.out', onStart: () => gsap.set(node(id), { zIndex: i }) }, (0.78 + i * 0.012) * RIFFLE);
        });
      }),
    [deckT],
  );

  const deal = useCallback(
    (count: number = handSize) =>
      run((tl) => {
        clearSelection();
        const orders = ordersRef.current!;
        const need = Math.min(count - orders.hand.length, orders.deck.length);
        if (need <= 0) return;
        const taken = orders.deck.splice(orders.deck.length - need, need).reverse();
        orders.hand.push(...taken);
        syncSnapshot();
        const z = computeZones(); // active → deck slides to the side
        const hand = orders.hand;
        const n = hand.length;
        const firstNew = n - need;

        // remaining deck slides to its side position
        layoutDeck(tl, z, 0.45);

        // dealt / refanned hand
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
              duration: isNew ? DEAL_DUR : (MOVE_DUR ?? 0.3),
              ease: isNew ? DEAL_EASE : (MOVE_EASE ?? 'power2.out'),
              onStart: () => gsap.set(node(id), { zIndex: 100 + i }),
            },
            isNew ? (i - firstNew) * DEAL_STAGGER : 0,
          );
        });
      }),
    [handSize, handT, deckT],
  );

  const play = useCallback(
    () =>
      run((tl) => {
        clearSelection();
        const orders = ordersRef.current!;
        if (!orders.hand.length) return;
        const moving = orders.hand.splice(0);
        orders.table.push(...moving);
        syncSnapshot();
        const z = computeZones();
        const table = orders.table;
        const n = table.length;
        table.forEach((id, i) => {
          const t = tableT(i, n, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, duration: PLAY_DUR, ease: PLAY_EASE, onStart: () => gsap.set(node(id), { zIndex: 200 + i }) }, i * 0.06);
        });
      }),
    [tableT],
  );

  const playSelected = useCallback(
    () =>
      run((tl) => {
        const orders = ordersRef.current!;
        const chosen = orders.hand.filter((id) => selectedRef.current.has(id));
        if (!chosen.length) return;
        orders.hand = orders.hand.filter((id) => !selectedRef.current.has(id));
        orders.table.push(...chosen);
        selectedRef.current.clear();
        syncSelected();
        syncSnapshot();
        relayout(tl, computeZones());
      }),
    [handT, tableT],
  );

  const clearTable = useCallback(
    () =>
      run((tl) => {
        const orders = ordersRef.current!;
        if (!orders.table.length) return;
        const moving = orders.table.splice(0);
        orders.deck.push(...moving);
        syncSnapshot();
        const z = computeZones(); // recenters the deck if the hand is now empty too
        layoutDeck(tl, z, 0.4);
        relayout(tl, z);
      }),
    [deckT, handT, tableT],
  );

  const reset = useCallback(
    () =>
      run((tl) => {
        clearSelection();
        const orders = ordersRef.current!;
        const all = [...orders.deck, ...orders.hand, ...orders.table];
        ordersRef.current = { deck: all, hand: [], table: [] };
        syncSnapshot();
        const z = computeZones(); // idle → deck centered
        all.forEach((id, i) => {
          const t = deckT(i, all.length, z);
          tl.to(node(id), { x: t.x, y: t.y, rotation: 0, scale: 1, duration: MOVE_DUR ?? 0.4, ease: MOVE_EASE ?? 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.008);
        });
      }),
    [deckT],
  );

  const toggleCard = useCallback(
    (id: number) => {
      if (busyRef.current) return;
      const orders = ordersRef.current!;
      if (!orders.hand.includes(id)) return; // only hand cards are selectable
      const z = computeZones();
      const i = orders.hand.indexOf(id);
      const t = handT(i, orders.hand.length, z);

      const dur = reduceRef.current ? 0 : SELECT_DUR;
      if (selectedRef.current.has(id)) {
        selectedRef.current.delete(id);
        syncSelected();
        gsap.to(node(id), { y: t.y, scale: t.scale, zIndex: 100 + i, duration: dur, ease: 'power2.out' });
      } else {
        selectedRef.current.add(id);
        syncSelected();
        gsap.to(node(id), { y: t.y - LIFT, scale: SELECT_SCALE, zIndex: 150, duration: dur, ease: 'power2.out' });
      }
    },
    [handT],
  );

  return { cards, stageRef, registerCard, shuffle, deal, play, playSelected, clearTable, reset, toggleCard, selected, hand, table: tableIds, counts };
}
