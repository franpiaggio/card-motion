'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { gsap, useGSAP } from '../internal/gsap';
import { buildDeck, shuffleInPlace } from '../lib/deck';
import type { CardData, PileConfig, Point } from '../types';

/** z-index headroom between piles (declaration order → stack order). */
const PILE_Z = 1000;

/**
 * Timing knobs for the engine's animations. Every field is optional and
 * defaults to the built-in choreography, so you override only what you want.
 */
export interface PileMotion {
  /** Duration (s) settled cards take to slide into place. Default `0.4`. */
  moveDuration?: number;
  /** Ease for settled cards sliding into place. Default `'power3.inOut'`. */
  moveEase?: string;
  /** Duration (s) a card takes to settle as it arrives in a pile (deal/draw/move-in). Default `0.45`. */
  dealDuration?: number;
  /** Ease for cards arriving in a pile. Default `'back.out(1.2)'`. */
  dealEase?: string;
  /** Stagger (s) between successive arriving cards. Default `0.07`. */
  dealStagger?: number;
  /** Time-scale for the riffle (shuffle / gather): `0.5` = twice as fast, `2` = half speed. Default `1`. */
  riffleScale?: number;
  /** How far (px) a card rises when selected. Default `30`. */
  selectLift?: number;
  /** Scale of a selected card. Default `1.06`. */
  selectScale?: number;
  /** Duration (s) of the select / deselect lift. Default `0.2`. */
  selectDuration?: number;
}

export interface UseCardPilesOptions<P extends string = string, C extends { id: number } = CardData> {
  /**
   * The cards to manage — any object with a numeric `id`. The engine only ever
   * reads `id`; the rest of the payload is yours (rank/suit, or a token's
   * type/cost/effect). Defaults to a fresh 52-card French deck.
   */
  cards?: C[];
  /** Declares each pile: its anchor on the stage and how its cards arrange. */
  piles: Record<P, PileConfig<C>>;
  /**
   * Which cards start in which pile. Any cards not listed go into the first
   * declared pile. Defaults to all cards in the first pile.
   */
  initial?: Partial<Record<P, number[]>>;
  /** Override the engine's animation timings. Anything omitted keeps the default. */
  motion?: PileMotion;
}

export interface MoveOptions {
  /** Insert at this index in the target pile (default: append to the end). */
  index?: number;
}

export interface GatherOptions<P extends string = string> {
  /** Only pull from these piles (default: every pile). */
  from?: P[];
  /** Shuffle the resulting pile order (with a riffle animation). Default `false`. */
  shuffle?: boolean;
}

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
 */
export function useCardPiles<P extends string = string, C extends { id: number } = CardData>(
  options: UseCardPilesOptions<P, C>,
): CardPilesApi<P, C> {
  const { piles: pileConfig } = options;
  const pileIds = Object.keys(pileConfig) as P[];

  const [cards] = useState<C[]>(() => options.cards ?? (buildDeck() as unknown as C[]));
  // id → card, for handing the payload to layouts (built once; cards are stable).
  const cardByIdRef = useRef<Map<number, C> | null>(null);
  if (cardByIdRef.current === null) cardByIdRef.current = new Map(cards.map((c) => [c.id, c]));

  // Animation timings — defaults reproduce the built-in choreography exactly.
  const mo = options.motion ?? {};
  const MOVE_DUR = mo.moveDuration ?? 0.4;
  const MOVE_EASE = mo.moveEase ?? 'power3.inOut';
  const DEAL_DUR = mo.dealDuration ?? 0.45;
  const DEAL_EASE = mo.dealEase ?? 'back.out(1.2)';
  const DEAL_STAGGER = mo.dealStagger ?? 0.07;
  const RIFFLE = mo.riffleScale ?? 1;
  const LIFT = mo.selectLift ?? 30;
  const SELECT_SCALE = mo.selectScale ?? 1.06;
  const SELECT_DUR = mo.selectDuration ?? 0.2;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef(new Map<number, HTMLElement>());
  const sizeRef = useRef({ w: 0, h: 0 });
  const busyRef = useRef(false);
  const reduceRef = useRef(false);

  // ordersRef: pileId → card ids, in stack/fan order. Seeded from `initial`,
  // with any leftover cards dropped into the first declared pile.
  const ordersRef = useRef<Record<P, number[]> | null>(null);
  if (ordersRef.current === null) {
    const orders = {} as Record<P, number[]>;
    for (const p of pileIds) orders[p] = [...(options.initial?.[p] ?? [])];
    const placed = new Set(pileIds.flatMap((p) => orders[p]));
    const leftovers = cards.map((c) => c.id).filter((id) => !placed.has(id));
    orders[pileIds[0]].push(...leftovers);
    ordersRef.current = orders;
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

  const snapshot = () => {
    const o = ordersRef.current!;
    const p = {} as Record<P, ReadonlyArray<number>>;
    const c = {} as Record<P, number>;
    for (const id of pileIds) {
      p[id] = [...o[id]];
      c[id] = o[id].length;
    }
    return { piles: p, counts: c };
  };
  const [state, setState] = useState(snapshot);
  const syncSnapshot = () => setState(snapshot());

  const registerCard = useCallback((id: number, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);
  const node = (id: number) => nodesRef.current.get(id) ?? null;

  const anchors = (): Record<P, Point> => {
    const stage = { width: sizeRef.current.w, height: sizeRef.current.h };
    const a = {} as Record<P, Point>;
    for (const id of pileIds) a[id] = pileConfig[id].anchor(stage);
    return a;
  };

  // Target transform for a card at index `i` in pile `p`, honoring selection.
  const targetOf = (p: P, i: number, count: number, anchor: Point, id: number, zBase: number) => {
    const card = cardByIdRef.current!.get(id)!;
    const t = pileConfig[p].layout(i, count, { anchor, width: sizeRef.current.w, height: sizeRef.current.h, card });
    const sel = selectedRef.current.has(id);
    return {
      x: t.x,
      y: t.y - (sel ? LIFT : 0),
      rotation: t.rotation,
      scale: sel ? SELECT_SCALE : t.scale,
      zIndex: sel ? 90000 : zBase + i,
    };
  };

  const placeInstant = useCallback(() => {
    const a = anchors();
    const orders = ordersRef.current!;
    pileIds.forEach((p, pi) => {
      const zBase = pi * PILE_Z;
      orders[p].forEach((id, i) => {
        const t = targetOf(p, i, orders[p].length, a[p], id, zBase);
        gsap.set(node(id), { xPercent: -50, yPercent: -50, ...t });
      });
    });
  }, []);

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

  // Runs a timeline for one action and resolves when it finishes. State changes
  // happen synchronously in `build` (before the animation), so an action is
  // NEVER dropped — even if a previous animation is still playing — which keeps
  // game logic correct regardless of animation timing. The returned promise is
  // a convenience for callers that want to await the visual; correctness must
  // not depend on it resolving.
  const run = (build: (tl: gsap.core.Timeline) => void): Promise<void> => {
    busyRef.current = true;
    return new Promise<void>((resolve) => {
      const done = () => {
        busyRef.current = false;
        resolve();
      };
      const tl = gsap.timeline({ onComplete: done });
      build(tl);
      if (tl.getChildren().length === 0) {
        tl.kill();
        done();
      } else if (reduceRef.current) {
        tl.progress(1); // reduced motion: snap to the end (fires onComplete)
      }
    });
  };

  // Re-tween the given piles' cards to their current targets. Cards in
  // `incoming` (just moved here) fly in staggered with a bit of overshoot.
  const relayout = (tl: gsap.core.Timeline, a: Record<P, Point>, which: P[], incoming?: Set<number>) => {
    const orders = ordersRef.current!;
    let arriving = 0;
    for (const p of which) {
      const zBase = pileIds.indexOf(p) * PILE_Z;
      orders[p].forEach((id, i) => {
        const t = targetOf(p, i, orders[p].length, a[p], id, zBase);
        const isNew = incoming?.has(id);
        tl.to(
          node(id),
          {
            ...t,
            duration: isNew ? DEAL_DUR : MOVE_DUR,
            ease: isNew ? DEAL_EASE : MOVE_EASE,
            onStart: () => gsap.set(node(id), { zIndex: t.zIndex }),
          },
          isNew ? arriving++ * DEAL_STAGGER : 0,
        );
      });
    }
  };

  const move = useCallback((ids: number | number[], toPile: P, opts?: MoveOptions) => {
    return run((tl) => {
      const orders = ordersRef.current!;
      const list = (Array.isArray(ids) ? ids : [ids]).filter((id) => pileIds.some((p) => orders[p].includes(id)));
      if (!list.length) return;
      const moving = new Set(list);
      const affected = new Set<P>([toPile]);
      for (const p of pileIds) {
        const before = orders[p].length;
        orders[p] = orders[p].filter((id) => !moving.has(id));
        if (orders[p].length !== before) affected.add(p);
      }
      const at = opts?.index ?? orders[toPile].length;
      orders[toPile].splice(Math.max(0, Math.min(at, orders[toPile].length)), 0, ...list);
      for (const id of list) selectedRef.current.delete(id);
      syncSelected();
      syncSnapshot();
      relayout(tl, anchors(), [...affected], moving);
    });
  }, []);

  const draw = useCallback(
    (fromPile: P, toPile: P, count: number, opts?: MoveOptions): Promise<void> => {
      const n = Math.max(0, count);
      if (n === 0) return Promise.resolve(); // slice(-0) would take the whole pile
      const orders = ordersRef.current!;
      const take = orders[fromPile].slice(-n); // the top of the pile
      return take.length ? move(take, toPile, opts) : Promise.resolve();
    },
    [move],
  );

  // A riffle animation gathering `ids` onto `center`, then settling as a stack.
  const riffle = (tl: gsap.core.Timeline, ids: number[], center: Point, layoutStack: () => void) => {
    ids.forEach((id, i) => {
      tl.to(node(id), { x: center.x, y: center.y, rotation: 0, scale: 1, duration: 0.3 * RIFFLE, ease: 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.003 * RIFFLE);
    });
    ids.forEach((id, i) => {
      const side = i % 2 ? 1 : -1;
      tl.to(node(id), { x: center.x + side * 60, y: center.y - i * 0.3, rotation: side * 5, duration: 0.2 * RIFFLE, ease: 'power1.inOut' }, (0.45 + i * 0.004) * RIFFLE);
    });
    layoutStack();
  };

  const gather = useCallback((toPile: P, opts?: GatherOptions<P>) => {
    return run((tl) => {
      clearSelection();
      const orders = ordersRef.current!;
      const sources = opts?.from ?? pileIds;
      const gathered: number[] = [...orders[toPile]];
      for (const p of sources) {
        if (p === toPile) continue;
        gathered.push(...orders[p]);
        orders[p] = [];
      }
      if (opts?.shuffle) shuffleInPlace(gathered);
      orders[toPile] = gathered;
      syncSnapshot();

      const a = anchors();
      const center = a[toPile];
      const zBase = pileIds.indexOf(toPile) * PILE_Z;
      riffle(tl, gathered, center, () => {
        gathered.forEach((id, i) => {
          const t = targetOf(toPile, i, gathered.length, center, id, zBase);
          tl.to(node(id), { ...t, duration: 0.24 * RIFFLE, ease: 'power2.out', onStart: () => gsap.set(node(id), { zIndex: t.zIndex }) }, (0.78 + i * 0.012) * RIFFLE);
        });
      });
    });
  }, []);

  const shuffle = useCallback((pile: P) => {
    return run((tl) => {
      clearSelection();
      const orders = ordersRef.current!;
      const ids = orders[pile];
      if (ids.length < 2) return;
      shuffleInPlace(ids);
      syncSnapshot();
      const a = anchors();
      const center = a[pile];
      const zBase = pileIds.indexOf(pile) * PILE_Z;
      riffle(tl, ids, center, () => {
        ids.forEach((id, i) => {
          const t = targetOf(pile, i, ids.length, center, id, zBase);
          tl.to(node(id), { ...t, duration: 0.24 * RIFFLE, ease: 'power2.out', onStart: () => gsap.set(node(id), { zIndex: t.zIndex }) }, (0.78 + i * 0.012) * RIFFLE);
        });
      });
    });
  }, []);

  const toggle = useCallback((id: number) => {
    if (busyRef.current) return;
    const orders = ordersRef.current!;
    const p = pileIds.find((pid) => orders[pid].includes(id));
    if (!p) return;
    const i = orders[p].indexOf(id);
    const a = pileConfig[p].anchor({ width: sizeRef.current.w, height: sizeRef.current.h });
    const base = pileConfig[p].layout(i, orders[p].length, {
      anchor: a,
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      card: cardByIdRef.current!.get(id)!,
    });
    const dur = reduceRef.current ? 0 : SELECT_DUR;
    if (selectedRef.current.has(id)) {
      selectedRef.current.delete(id);
      syncSelected();
      gsap.to(node(id), { y: base.y, scale: base.scale, zIndex: pileIds.indexOf(p) * PILE_Z + i, duration: dur, ease: 'power2.out' });
    } else {
      selectedRef.current.add(id);
      syncSelected();
      gsap.to(node(id), { y: base.y - LIFT, scale: SELECT_SCALE, zIndex: 90000, duration: dur, ease: 'power2.out' });
    }
  }, []);

  const doRelayout = useCallback((which?: P | P[]) => {
    return run((tl) => {
      const list = which == null ? pileIds : Array.isArray(which) ? which : [which];
      relayout(tl, anchors(), list);
    });
  }, []);

  const pileOf = useCallback((id: number): P | null => {
    const orders = ordersRef.current!;
    return pileIds.find((p) => orders[p].includes(id)) ?? null;
  }, []);

  return {
    cards,
    stageRef,
    registerCard,
    piles: state.piles,
    counts: state.counts,
    pileOf,
    move,
    draw,
    gather,
    shuffle,
    relayout: doRelayout,
    toggle,
    selected,
  };
}
