import { gsap } from './gsap';
import { createStore } from './store';
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

export interface CardPilesOptions<P extends string = string, C extends { id: number } = CardData> {
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

/** The engine's reactive snapshot: pile membership, counts and selection. */
export interface CardPilesState<P extends string = string> {
  /** Card ids in each pile, in order. */
  piles: Record<P, ReadonlyArray<number>>;
  /** Card count in each pile. */
  counts: Record<P, number>;
  /** Ids of the currently selected (lifted) cards. */
  selected: ReadonlySet<number>;
}

export interface CardPilesEngine<P extends string = string, C extends { id: number } = CardData> {
  /** The full, stable set of cards. Render one node per card and wire {@link registerCard}. */
  cards: C[];
  /** Register (node) / unregister (null) each card's DOM element by id. */
  registerCard: (id: number, node: HTMLElement | null) => void;
  /**
   * Attach the engine to its positioned stage element: measures it, places
   * every registered card instantly, and re-places on window resize. Returns
   * an unmount function that removes the listeners (state is kept, so the
   * engine can be re-mounted).
   */
  mount: (stage: HTMLElement) => () => void;
  /** The current reactive snapshot. Stable reference between changes. */
  getState: () => CardPilesState<P>;
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
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
  /**
   * Swap in fresh options (piles config / motion). The pile *structure* (the
   * set of pile ids and the cards) is fixed at creation; this refreshes the
   * anchors, layouts and timings that later animations read.
   */
  updateOptions: (next: CardPilesOptions<P, C>) => void;
  /** Unmount (if mounted) and kill any tweens on the registered nodes. */
  destroy: () => void;
}

/**
 * Headless engine for card games with **arbitrary piles** — the framework-free
 * core behind `useCardPiles`. You declare the piles (deck, hand, discard,
 * foundations, tableau columns…), render the cards, and drive them with
 * `move` / `gather` / `shuffle`; the engine owns the GSAP timelines and card
 * positions, and publishes its reactive state via `getState`/`subscribe`.
 */
export function createCardPiles<P extends string = string, C extends { id: number } = CardData>(
  initialOptions: CardPilesOptions<P, C>,
): CardPilesEngine<P, C> {
  let options = initialOptions;
  const pileIds = Object.keys(options.piles) as P[];

  const cards: C[] = options.cards ?? (buildDeck() as unknown as C[]);
  // id → card, for handing the payload to layouts (built once; cards are stable).
  const cardById = new Map<number, C>(cards.map((c) => [c.id, c]));

  // Animation timings — resolved on demand so `updateOptions` applies live.
  // Defaults reproduce the built-in choreography exactly.
  const m = () => {
    const mo = options.motion ?? {};
    return {
      MOVE_DUR: mo.moveDuration ?? 0.4,
      MOVE_EASE: mo.moveEase ?? 'power3.inOut',
      DEAL_DUR: mo.dealDuration ?? 0.45,
      DEAL_EASE: mo.dealEase ?? 'back.out(1.2)',
      DEAL_STAGGER: mo.dealStagger ?? 0.07,
      RIFFLE: mo.riffleScale ?? 1,
      LIFT: mo.selectLift ?? 30,
      SELECT_SCALE: mo.selectScale ?? 1.06,
      SELECT_DUR: mo.selectDuration ?? 0.2,
    };
  };

  const nodes = new Map<number, HTMLElement>();
  const size = { w: 0, h: 0 };
  let busy = false;
  let reduce = false;

  // orders: pileId → card ids, in stack/fan order. Seeded from `initial`,
  // with any leftover cards dropped into the first declared pile.
  const orders = {} as Record<P, number[]>;
  for (const p of pileIds) orders[p] = [...(options.initial?.[p] ?? [])];
  {
    const placed = new Set(pileIds.flatMap((p) => orders[p]));
    const leftovers = cards.map((c) => c.id).filter((id) => !placed.has(id));
    orders[pileIds[0]].push(...leftovers);
  }

  const selected = new Set<number>();

  const snapshot = (prev?: CardPilesState<P>): CardPilesState<P> => {
    const p = {} as Record<P, ReadonlyArray<number>>;
    const c = {} as Record<P, number>;
    for (const id of pileIds) {
      p[id] = [...orders[id]];
      c[id] = orders[id].length;
    }
    return { piles: p, counts: c, selected: prev?.selected ?? new Set(selected) };
  };
  const store = createStore<CardPilesState<P>>(snapshot());
  // Keep sub-object identity for the untouched half, mirroring the two separate
  // React states (selection vs pile snapshot) this engine replaced.
  const syncSelected = () => store.set({ ...store.get(), selected: new Set(selected) });
  const syncSnapshot = () => store.set(snapshot(store.get()));
  const clearSelection = () => {
    if (selected.size) {
      selected.clear();
      syncSelected();
    }
  };

  const registerCard = (id: number, node: HTMLElement | null) => {
    if (node) nodes.set(id, node);
    else nodes.delete(id);
  };
  const node = (id: number) => nodes.get(id) ?? null;

  const cfg = (p: P): PileConfig<C> => options.piles[p];

  const anchors = (): Record<P, Point> => {
    const stage = { width: size.w, height: size.h };
    const a = {} as Record<P, Point>;
    for (const id of pileIds) a[id] = cfg(id).anchor(stage);
    return a;
  };

  // Target transform for a card at index `i` in pile `p`, honoring selection.
  const targetOf = (p: P, i: number, count: number, anchor: Point, id: number, zBase: number) => {
    const { LIFT, SELECT_SCALE } = m();
    const card = cardById.get(id)!;
    const t = cfg(p).layout(i, count, { anchor, width: size.w, height: size.h, card });
    const sel = selected.has(id);
    return {
      x: t.x,
      y: t.y - (sel ? LIFT : 0),
      rotation: t.rotation,
      scale: sel ? SELECT_SCALE : t.scale,
      zIndex: sel ? 90000 : zBase + i,
    };
  };

  const placeInstant = () => {
    const a = anchors();
    pileIds.forEach((p, pi) => {
      const zBase = pi * PILE_Z;
      orders[p].forEach((id, i) => {
        const t = targetOf(p, i, orders[p].length, a[p], id, zBase);
        gsap.set(node(id), { xPercent: -50, yPercent: -50, ...t });
      });
    });
  };

  const mount = (el: HTMLElement): (() => void) => {
    const measure = () => {
      size.w = el.clientWidth;
      size.h = el.clientHeight;
    };
    measure();
    reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    placeInstant();
    const onResize = () => {
      measure();
      placeInstant();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  };

  // Runs a timeline for one action and resolves when it finishes. State changes
  // happen synchronously in `build` (before the animation), so an action is
  // NEVER dropped — even if a previous animation is still playing — which keeps
  // game logic correct regardless of animation timing. The returned promise is
  // a convenience for callers that want to await the visual; correctness must
  // not depend on it resolving.
  const run = (build: (tl: gsap.core.Timeline) => void): Promise<void> => {
    busy = true;
    return new Promise<void>((resolve) => {
      const done = () => {
        busy = false;
        resolve();
      };
      const tl = gsap.timeline({ onComplete: done });
      build(tl);
      if (tl.getChildren().length === 0) {
        tl.kill();
        done();
      } else if (reduce) {
        tl.progress(1); // reduced motion: snap to the end (fires onComplete)
      }
    });
  };

  // Re-tween the given piles' cards to their current targets. Cards in
  // `incoming` (just moved here) fly in staggered with a bit of overshoot.
  const relayout = (tl: gsap.core.Timeline, a: Record<P, Point>, which: P[], incoming?: Set<number>) => {
    const { MOVE_DUR, MOVE_EASE, DEAL_DUR, DEAL_EASE, DEAL_STAGGER } = m();
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

  const move = (ids: number | number[], toPile: P, opts?: MoveOptions) => {
    return run((tl) => {
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
      for (const id of list) selected.delete(id);
      syncSelected();
      syncSnapshot();
      relayout(tl, anchors(), [...affected], moving);
    });
  };

  const draw = (fromPile: P, toPile: P, count: number, opts?: MoveOptions): Promise<void> => {
    const n = Math.max(0, count);
    if (n === 0) return Promise.resolve(); // slice(-0) would take the whole pile
    const take = orders[fromPile].slice(-n); // the top of the pile
    return take.length ? move(take, toPile, opts) : Promise.resolve();
  };

  // A riffle animation gathering `ids` onto `center`, then settling as a stack.
  const riffle = (tl: gsap.core.Timeline, ids: number[], center: Point, layoutStack: () => void) => {
    const { RIFFLE } = m();
    ids.forEach((id, i) => {
      tl.to(node(id), { x: center.x, y: center.y, rotation: 0, scale: 1, duration: 0.3 * RIFFLE, ease: 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.003 * RIFFLE);
    });
    ids.forEach((id, i) => {
      const side = i % 2 ? 1 : -1;
      tl.to(node(id), { x: center.x + side * 60, y: center.y - i * 0.3, rotation: side * 5, duration: 0.2 * RIFFLE, ease: 'power1.inOut' }, (0.45 + i * 0.004) * RIFFLE);
    });
    layoutStack();
  };

  const gather = (toPile: P, opts?: GatherOptions<P>) => {
    return run((tl) => {
      clearSelection();
      const { RIFFLE } = m();
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
  };

  const shuffle = (pile: P) => {
    return run((tl) => {
      clearSelection();
      const { RIFFLE } = m();
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
  };

  const toggle = (id: number) => {
    if (busy) return;
    const { LIFT, SELECT_SCALE, SELECT_DUR } = m();
    const p = pileIds.find((pid) => orders[pid].includes(id));
    if (!p) return;
    const i = orders[p].indexOf(id);
    const a = cfg(p).anchor({ width: size.w, height: size.h });
    const base = cfg(p).layout(i, orders[p].length, {
      anchor: a,
      width: size.w,
      height: size.h,
      card: cardById.get(id)!,
    });
    const dur = reduce ? 0 : SELECT_DUR;
    if (selected.has(id)) {
      selected.delete(id);
      syncSelected();
      gsap.to(node(id), { y: base.y, scale: base.scale, zIndex: pileIds.indexOf(p) * PILE_Z + i, duration: dur, ease: 'power2.out' });
    } else {
      selected.add(id);
      syncSelected();
      gsap.to(node(id), { y: base.y - LIFT, scale: SELECT_SCALE, zIndex: 90000, duration: dur, ease: 'power2.out' });
    }
  };

  const doRelayout = (which?: P | P[]) => {
    return run((tl) => {
      const list = which == null ? pileIds : Array.isArray(which) ? which : [which];
      relayout(tl, anchors(), list);
    });
  };

  const pileOf = (id: number): P | null => {
    return pileIds.find((p) => orders[p].includes(id)) ?? null;
  };

  return {
    cards,
    registerCard,
    mount,
    getState: store.get,
    subscribe: store.subscribe,
    pileOf,
    move,
    draw,
    gather,
    shuffle,
    relayout: doRelayout,
    toggle,
    updateOptions: (next) => {
      options = next;
    },
    destroy: () => {
      for (const el of nodes.values()) gsap.killTweensOf(el);
    },
  };
}
