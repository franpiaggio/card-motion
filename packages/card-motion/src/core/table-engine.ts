import { gsap } from './gsap';
import { createStore } from './store';
import { buildDeck, shuffleInPlace } from '../lib/deck';
import { getZones as defaultGetZones, deckTarget, handTarget, tableTarget } from '../lib/layout';
import type { CardData, LayoutFn, Zones } from '../types';

/**
 * Timing knobs for the table's animations. Every field is optional and defaults
 * to the built-in choreography, so you override only what you want. Mirrors
 * `PileMotion` on the piles engine.
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

export interface CardTableOptions {
  /** The cards to manage. Defaults to a fresh 52-card deck. */
  deck?: CardData[];
  /** How many cards `deal()` puts in the hand. Default `8`. */
  handSize?: number;
  /** Maps the stage size to zone anchors. Defaults to the built-in `getZones`. */
  getZones?: (w: number, h: number) => Zones;
  /** Override the per-zone layout functions. */
  layout?: Partial<Record<'deck' | 'hand' | 'table', LayoutFn>>;
  /** Override the table's animation timings. Anything omitted keeps the default. */
  motion?: CardTableMotion;
}

/** The engine's reactive snapshot: selection, zone membership and counts. */
export interface CardTableState {
  /** Ids of the currently selected (lifted) hand cards. */
  selected: ReadonlySet<number>;
  /** Ids currently in the hand (in order). */
  hand: ReadonlyArray<number>;
  /** Ids currently on the table (in order). */
  table: ReadonlyArray<number>;
  /** Count of cards in each zone — handy to gate UI. */
  counts: { deck: number; hand: number; table: number };
}

export interface CardTableEngine {
  /** The full, stable deck. Render one node per card and wire {@link registerCard}. */
  cards: CardData[];
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
  getState: () => CardTableState;
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
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
  /** Swap in fresh options (zones / layouts / motion). The deck itself is fixed at creation. */
  updateOptions: (next: CardTableOptions) => void;
  /** Unmount (if mounted) and kill any tweens on the registered nodes. */
  destroy: () => void;
}

type Orders = Record<'deck' | 'hand' | 'table', number[]>;

/**
 * Headless engine for a classic card table — the framework-free core behind
 * `useCardTable`. Owns the deck/hand/table state and drives the GSAP
 * timelines; you render the cards and the controls, and read the reactive
 * state via `getState`/`subscribe`.
 */
export function createCardTable(initialOptions: CardTableOptions = {}): CardTableEngine {
  let options = initialOptions;

  const zonesOf = (w: number, h: number) => (options.getZones ?? defaultGetZones)(w, h);
  const deckT: LayoutFn = (i, n, z) => (options.layout?.deck ?? deckTarget)(i, n, z);
  const handT: LayoutFn = (i, n, z) => (options.layout?.hand ?? handTarget)(i, n, z);
  const tableT: LayoutFn = (i, n, z) => (options.layout?.table ?? tableTarget)(i, n, z);

  // Animation timings — resolved on demand so `updateOptions` applies live.
  // MOVE_DUR / MOVE_EASE stay possibly-undefined so each re-tween site keeps
  // its own default.
  const m = () => {
    const mo = options.motion ?? {};
    return {
      MOVE_DUR: mo.moveDuration,
      MOVE_EASE: mo.moveEase,
      DEAL_DUR: mo.dealDuration ?? 0.45,
      DEAL_EASE: mo.dealEase ?? 'back.out(1.3)',
      DEAL_STAGGER: mo.dealStagger ?? 0.09,
      PLAY_DUR: mo.playDuration ?? 0.5,
      PLAY_EASE: mo.playEase ?? 'power3.inOut',
      RIFFLE: mo.riffleScale ?? 1,
      LIFT: mo.selectLift ?? 30,
      SELECT_SCALE: mo.selectScale ?? 1.06,
      SELECT_DUR: mo.selectDuration ?? 0.2,
    };
  };

  const cards: CardData[] = options.deck ?? buildDeck();

  const nodes = new Map<number, HTMLElement>();
  const size = { w: 0, h: 0 };
  let busy = false;
  let reduce = false;
  let orders: Orders = { deck: cards.map((c) => c.id), hand: [], table: [] };
  const selected = new Set<number>();

  const store = createStore<CardTableState>({
    selected: new Set(),
    hand: [],
    table: [],
    counts: { deck: cards.length, hand: 0, table: 0 },
  });
  // Keep sub-object identity for the untouched half, mirroring the separate
  // React states (selection vs zone snapshot) this engine replaced.
  const syncSelected = () => store.set({ ...store.get(), selected: new Set(selected) });
  const syncSnapshot = () =>
    store.set({
      ...store.get(),
      counts: { deck: orders.deck.length, hand: orders.hand.length, table: orders.table.length },
      hand: [...orders.hand],
      table: [...orders.table],
    });
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

  // Zone anchors for the *current* state. While idle (nothing dealt) the deck
  // is centered; once cards are in play it sits on the side.
  const computeZones = (): Zones => {
    const { w, h } = size;
    const base = zonesOf(w, h);
    const active = orders.hand.length > 0 || orders.table.length > 0;
    return active ? base : { ...base, deck: { x: w * 0.5, y: h * 0.48 } };
  };

  // Place every card in its zone with no animation (mount / resize).
  const placeInstant = () => {
    const { LIFT, SELECT_SCALE } = m();
    const z = computeZones();
    orders.deck.forEach((id, i) => {
      const t = deckT(i, orders.deck.length, z);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: i });
    });
    orders.hand.forEach((id, i) => {
      const t = handT(i, orders.hand.length, z);
      const sel = selected.has(id);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y - (sel ? LIFT : 0), rotation: t.rotation, scale: sel ? SELECT_SCALE : t.scale, zIndex: sel ? 150 : 100 + i });
    });
    orders.table.forEach((id, i) => {
      const t = tableT(i, orders.table.length, z);
      gsap.set(node(id), { xPercent: -50, yPercent: -50, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: 200 + i });
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

  // Build a timeline behind an anti-overlap guard.
  const run = (build: (tl: gsap.core.Timeline) => void) => {
    if (busy) return;
    busy = true;
    const tl = gsap.timeline({ onComplete: () => (busy = false) });
    build(tl);
    if (tl.getChildren().length === 0) busy = false;
    else if (reduce) tl.progress(1); // honor prefers-reduced-motion: snap to the end
  };

  // Re-tween the deck stack to its current anchor (centered ↔ side).
  const layoutDeck = (tl: gsap.core.Timeline, z: Zones, duration = 0.4) => {
    const { MOVE_DUR, MOVE_EASE } = m();
    orders.deck.forEach((id, i) => {
      const t = deckT(i, orders.deck.length, z);
      tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, duration: MOVE_DUR ?? duration, ease: MOVE_EASE ?? 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, 0);
    });
  };

  // Re-tween the hand fan + table row to their current targets.
  const relayout = (tl: gsap.core.Timeline, z: Zones) => {
    const { MOVE_DUR, MOVE_EASE, LIFT, SELECT_SCALE } = m();
    orders.hand.forEach((id, i) => {
      const t = handT(i, orders.hand.length, z);
      const sel = selected.has(id);
      tl.to(node(id), { x: t.x, y: t.y - (sel ? LIFT : 0), rotation: t.rotation, scale: sel ? SELECT_SCALE : t.scale, zIndex: sel ? 150 : 100 + i, duration: MOVE_DUR ?? 0.35, ease: MOVE_EASE ?? 'power2.out' }, 0);
    });
    orders.table.forEach((id, i) => {
      const t = tableT(i, orders.table.length, z);
      tl.to(node(id), { x: t.x, y: t.y, rotation: t.rotation, scale: t.scale, zIndex: 200 + i, duration: MOVE_DUR ?? 0.45, ease: MOVE_EASE ?? 'power3.inOut' }, 0);
    });
  };

  const shuffle = () =>
    run((tl) => {
      clearSelection();
      const { RIFFLE } = m();
      const all = [...orders.deck, ...orders.hand, ...orders.table];
      orders = { deck: all, hand: [], table: [] };
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
    });

  const deal = (count?: number) =>
    run((tl) => {
      clearSelection();
      const { MOVE_DUR, MOVE_EASE, DEAL_DUR, DEAL_EASE, DEAL_STAGGER } = m();
      const wanted = count ?? options.handSize ?? 8;
      const need = Math.min(wanted - orders.hand.length, orders.deck.length);
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
    });

  const play = () =>
    run((tl) => {
      clearSelection();
      const { PLAY_DUR, PLAY_EASE } = m();
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
    });

  const playSelected = () =>
    run((tl) => {
      const chosen = orders.hand.filter((id) => selected.has(id));
      if (!chosen.length) return;
      orders.hand = orders.hand.filter((id) => !selected.has(id));
      orders.table.push(...chosen);
      selected.clear();
      syncSelected();
      syncSnapshot();
      relayout(tl, computeZones());
    });

  const clearTable = () =>
    run((tl) => {
      if (!orders.table.length) return;
      const moving = orders.table.splice(0);
      orders.deck.push(...moving);
      syncSnapshot();
      const z = computeZones(); // recenters the deck if the hand is now empty too
      layoutDeck(tl, z, 0.4);
      relayout(tl, z);
    });

  const reset = () =>
    run((tl) => {
      clearSelection();
      const { MOVE_DUR, MOVE_EASE } = m();
      const all = [...orders.deck, ...orders.hand, ...orders.table];
      orders = { deck: all, hand: [], table: [] };
      syncSnapshot();
      const z = computeZones(); // idle → deck centered
      all.forEach((id, i) => {
        const t = deckT(i, all.length, z);
        tl.to(node(id), { x: t.x, y: t.y, rotation: 0, scale: 1, duration: MOVE_DUR ?? 0.4, ease: MOVE_EASE ?? 'power2.inOut', onStart: () => gsap.set(node(id), { zIndex: i }) }, i * 0.008);
      });
    });

  const toggleCard = (id: number) => {
    if (busy) return;
    if (!orders.hand.includes(id)) return; // only hand cards are selectable
    const { LIFT, SELECT_SCALE, SELECT_DUR } = m();
    const z = computeZones();
    const i = orders.hand.indexOf(id);
    const t = handT(i, orders.hand.length, z);

    const dur = reduce ? 0 : SELECT_DUR;
    if (selected.has(id)) {
      selected.delete(id);
      syncSelected();
      gsap.to(node(id), { y: t.y, scale: t.scale, zIndex: 100 + i, duration: dur, ease: 'power2.out' });
    } else {
      selected.add(id);
      syncSelected();
      gsap.to(node(id), { y: t.y - LIFT, scale: SELECT_SCALE, zIndex: 150, duration: dur, ease: 'power2.out' });
    }
  };

  return {
    cards,
    registerCard,
    mount,
    getState: store.get,
    subscribe: store.subscribe,
    shuffle,
    deal,
    play,
    playSelected,
    clearTable,
    reset,
    toggleCard,
    updateOptions: (next) => {
      options = next;
    },
    destroy: () => {
      for (const el of nodes.values()) gsap.killTweensOf(el);
    },
  };
}
