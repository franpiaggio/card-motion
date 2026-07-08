import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCardTable } from './table-engine';
import { createCardPiles } from './piles-engine';
import { createCardDrag } from './drag';
import { createCardInspect } from './inspect';
import { createDragDropController } from './dragdrop';
import { gsap } from './gsap';
import { stackLayout, fanLayout } from '../lib/layout';
import type { CardData } from '../types';

// Vanilla mirror of the React hook tests: the engines must behave identically
// with plain DOM elements and no framework on top.

const makeCards = (n: number): CardData[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

beforeEach(() => {
  // Reduced motion → timelines snap to the end, so state can be read synchronously.
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as never;
});

function mountStage() {
  const stage = document.createElement('div');
  Object.defineProperty(stage, 'clientWidth', { value: 800 });
  Object.defineProperty(stage, 'clientHeight', { value: 600 });
  document.body.append(stage);
  return stage;
}

describe('createCardTable (vanilla)', () => {
  function setup(n = 10, handSize = 3) {
    const engine = createCardTable({ deck: makeCards(n), handSize });
    const stage = mountStage();
    for (const c of engine.cards) {
      const el = document.createElement('div');
      stage.append(el);
      engine.registerCard(c.id, el);
    }
    engine.mount(stage);
    return engine;
  }

  it('deals, plays, selects and resets like the hook', () => {
    const engine = setup(10, 3);
    expect(engine.getState().counts).toEqual({ deck: 10, hand: 0, table: 0 });

    engine.deal();
    expect(engine.getState().counts).toMatchObject({ deck: 7, hand: 3 });
    engine.deal(); // hand already full
    expect(engine.getState().counts.hand).toBe(3);

    const id = engine.getState().hand[0];
    engine.toggleCard(id);
    expect(engine.getState().selected.has(id)).toBe(true);
    engine.playSelected();
    expect(engine.getState().counts).toMatchObject({ hand: 2, table: 1 });
    expect(engine.getState().selected.size).toBe(0);

    engine.play();
    expect(engine.getState().counts).toMatchObject({ hand: 0, table: 3 });
    engine.clearTable();
    expect(engine.getState().counts).toMatchObject({ table: 0, deck: 10 });

    engine.deal();
    engine.shuffle();
    expect(engine.getState().counts).toEqual({ deck: 10, hand: 0, table: 0 });
  });

  it('notifies subscribers on every state change', () => {
    const engine = setup(6, 3);
    const spy = vi.fn();
    engine.subscribe(spy);
    engine.deal();
    expect(spy).toHaveBeenCalled();
  });

  it('applies a custom selectLift to the selected card', () => {
    const engine = createCardTable({ deck: makeCards(6), handSize: 3, motion: { selectLift: 50 } });
    const stage = mountStage();
    const nodes = new Map<number, HTMLElement>();
    for (const c of engine.cards) {
      const el = document.createElement('div');
      stage.append(el);
      nodes.set(c.id, el);
      engine.registerCard(c.id, el);
    }
    engine.mount(stage);
    engine.deal();
    const id = engine.getState().hand[0];
    const node = nodes.get(id)!;
    engine.toggleCard(id);
    const ySelected = gsap.getProperty(node, 'y') as number;
    engine.toggleCard(id);
    const yBase = gsap.getProperty(node, 'y') as number;
    expect(yBase - ySelected).toBeCloseTo(50);
  });
});

describe('createCardPiles (vanilla)', () => {
  type Pile = 'deck' | 'hand' | 'discard';
  const PILES = {
    deck: { anchor: () => ({ x: 100, y: 300 }), layout: stackLayout },
    hand: { anchor: () => ({ x: 450, y: 500 }), layout: fanLayout },
    discard: { anchor: () => ({ x: 800, y: 300 }), layout: stackLayout },
  } as const;

  function setup(n = 8, initial?: Partial<Record<Pile, number[]>>) {
    const engine = createCardPiles<Pile>({ cards: makeCards(n), piles: PILES, initial });
    for (const c of engine.cards) engine.registerCard(c.id, document.createElement('div'));
    return engine;
  }

  it('seeds initial piles and conserves cards through draw/move/gather', async () => {
    const engine = setup(8, { hand: [0, 1, 2] });
    expect(engine.getState().counts).toEqual({ deck: 5, hand: 3, discard: 0 });
    expect(engine.getState().piles.deck).toEqual([3, 4, 5, 6, 7]);

    await engine.draw('deck', 'hand', 2);
    expect(engine.getState().piles.hand).toEqual([0, 1, 2, 6, 7]); // top of the deck

    await engine.move([0, 1], 'discard');
    expect(engine.getState().piles.discard).toEqual([0, 1]);

    await engine.gather('deck', { shuffle: true });
    expect([...engine.getState().piles.deck].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(engine.getState().counts).toEqual({ deck: 8, hand: 0, discard: 0 });
  });

  it('pileOf, toggle and selection-clear-on-move behave like the hook', async () => {
    const engine = setup(8);
    expect(engine.pileOf(0)).toBe('deck');
    engine.toggle(3);
    expect(engine.getState().selected.has(3)).toBe(true);
    await engine.move([3], 'discard');
    expect(engine.getState().selected.has(3)).toBe(false);
    expect(engine.pileOf(3)).toBe('discard');
    expect(engine.pileOf(999)).toBeNull();
  });

  it('relayout keeps membership and resolves', async () => {
    const engine = setup(8, { hand: [0, 1, 2] });
    const before = engine.getState().piles.hand;
    await engine.relayout('hand');
    await engine.relayout(['deck', 'discard']);
    await engine.relayout();
    expect(engine.getState().piles.hand).toEqual(before);
  });
});

describe('createCardDrag (vanilla)', () => {
  const stageRef = { current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) } };
  const target = () =>
    ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 80, height: 112 }), setPointerCapture: () => {} });
  const ptr = (clientX: number, clientY: number, t: ReturnType<typeof target>) =>
    ({ clientX, clientY, pointerId: 1, currentTarget: t });

  it('distinguishes tap from drag and resolves drops', () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    const engine = createCardDrag<'zoneA'>({ stageRef, resolveDrop: () => 'zoneA', onDrop, onTap });
    const h = engine.handlers(3);
    const t = target();
    h.onPointerDown(ptr(40, 56, t));
    h.onPointerUp(ptr(41, 57, t)); // < threshold → a tap
    expect(onTap).toHaveBeenCalledWith(3);
    expect(onDrop).not.toHaveBeenCalled();

    h.onPointerDown(ptr(40, 56, t));
    h.onPointerMove(ptr(120, 120, t));
    expect(engine.getState().dragId).toBe(3);
    h.onPointerUp(ptr(120, 120, t));
    expect(engine.getState().dragId).toBeNull();
    expect(onDrop).toHaveBeenCalledWith(3, 'zoneA', { x: 120, y: 120 });
  });

  it('attach() wires native listeners that drive the same gesture', () => {
    const onTap = vi.fn();
    const engine = createCardDrag({ stageRef, resolveDrop: () => null, onTap });
    const el = document.createElement('div');
    el.setPointerCapture = () => {};
    document.body.append(el);
    const detach = engine.attach(el, 5);
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10, bubbles: true }));
    el.dispatchEvent(new MouseEvent('pointerup', { clientX: 11, clientY: 11, bubbles: true }));
    expect(onTap).toHaveBeenCalledWith(5);
    detach();
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10, bubbles: true }));
    el.dispatchEvent(new MouseEvent('pointerup', { clientX: 11, clientY: 11, bubbles: true }));
    expect(onTap).toHaveBeenCalledTimes(1); // detached → inert
  });
});

describe('createCardInspect (vanilla)', () => {
  it('opens pinned via the API, closes on Escape, and reports the source rect', () => {
    const engine = createCardInspect();
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ left: 10, top: 20, width: 80, height: 112, right: 90, bottom: 132, x: 10, y: 20, toJSON() {} }) as DOMRect;
    engine.open(7, el);
    expect(engine.getState().inspectId).toBe(7);
    expect(engine.getState().pinned).toBe(true);
    expect(engine.getState().sourceRect?.left).toBe(10);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(engine.getState().inspectId).toBeNull();
    engine.destroy();
  });

  it('a quick tap toggles when the tap trigger is on', () => {
    vi.useFakeTimers();
    const engine = createCardInspect({ triggers: ['press', 'tap'] });
    const el = document.createElement('div');
    const h = engine.handlers(4);
    const e = { clientX: 0, clientY: 0, pointerType: 'touch', currentTarget: el };
    h.onPointerDown(e);
    h.onPointerUp(e); // released before the hold fired → tap
    expect(engine.getState().inspectId).toBe(4);
    h.onPointerDown(e);
    h.onPointerUp(e); // tap again → toggles closed
    expect(engine.getState().inspectId).toBeNull();
    vi.useRealTimers();
    engine.destroy();
  });
});

describe('createDragDropController (vanilla)', () => {
  const rect = (left: number, top: number, right: number, bottom: number): DOMRect =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} }) as DOMRect;

  it('hit-tests zones, honors accepts, and reports the drop', () => {
    const onDrop = vi.fn();
    const onDragEnd = vi.fn();
    const ctrl = createDragDropController({ onDrop, onDragEnd });
    const a = document.createElement('div');
    a.getBoundingClientRect = () => rect(0, 0, 100, 100);
    const b = document.createElement('div');
    b.getBoundingClientRect = () => rect(100, 0, 200, 100);
    ctrl.registerZone('a', a, () => true);
    ctrl.registerZone('b', b, () => true);

    ctrl.beginDrag(1, 'a');
    ctrl.moveDrag(150, 50);
    expect(ctrl.getState()).toMatchObject({ draggingId: 1, overZoneId: 'b', overValid: true });
    expect(ctrl.endDrag(150, 50)).toBe(true);
    expect(onDrop).toHaveBeenCalledWith(1, 'b', 'a');
    expect(onDragEnd).toHaveBeenCalledWith(true);
    expect(ctrl.getState().draggingId).toBeNull();
  });

  it('a refusing zone rejects the drop', () => {
    const onDrop = vi.fn();
    const ctrl = createDragDropController({ onDrop });
    const b = document.createElement('div');
    b.getBoundingClientRect = () => rect(100, 0, 200, 100);
    ctrl.registerZone('b', b, () => false);
    ctrl.beginDrag(1, 'a');
    expect(ctrl.endDrag(150, 50)).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('disabled blocks beginDrag', () => {
    const ctrl = createDragDropController({ disabled: true });
    ctrl.beginDrag(1, null);
    expect(ctrl.getState().draggingId).toBeNull();
  });
});
