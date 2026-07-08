import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCard } from './card';
import { mountCardTable } from './card-table';
import { mountDeckReveal } from './deck-reveal';
import { mountBackgroundShader } from './background-shader';
import { attachDropZone, mountDropZone } from './dropzone';
import { createDragDropController } from '../core/dragdrop';
import { attachDraggable } from '../core/draggable';
import { cardLabel } from '../lib/names';
import type { CardData } from '../types';

// Vanilla mirror of the React component tests: same DOM, classes and ARIA.

beforeEach(() => {
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

afterEach(() => {
  document.body.replaceChildren();
});

describe('createCard', () => {
  it('names a card in words', () => {
    expect(cardLabel('A', '♠')).toBe('Ace of spades');
    expect(cardLabel('7', '♥')).toBe('7 of hearts');
  });

  it('is an image with a spoken name by default', () => {
    const { el } = createCard({ rank: 'K', suit: '♣', tilt: false });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('King of clubs');
    expect(el.querySelector('.cm-card-face.cm-black')).not.toBeNull();
    expect(el.querySelector('.cm-pip')?.textContent).toBe('♣');
  });

  it('is a toggle button when interactive, reflecting `selected` as aria-pressed', () => {
    const card = createCard({ rank: 'A', suit: '♠', interactive: true, tilt: false });
    expect(card.el.getAttribute('role')).toBe('button');
    expect(card.el.getAttribute('aria-pressed')).toBe('false');
    card.update({ selected: true });
    expect(card.el.getAttribute('aria-pressed')).toBe('true');
    expect(card.el.classList.contains('cm-selected')).toBe(true);
  });

  it('activates onClick with Enter and Space when interactive', () => {
    const onClick = vi.fn();
    const { el } = createCard({ rank: 'A', suit: '♠', interactive: true, tilt: false, onClick });
    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is hidden from assistive tech when hiddenFromAt', () => {
    const { el } = createCard({ rank: '2', suit: '♦', hiddenFromAt: true, tilt: false });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('renders the foil overlay only when asked', () => {
    const card = createCard({ rank: 'Q', suit: '♥', foil: true, tilt: false });
    expect(card.el.querySelector('.cm-card-foil')).not.toBeNull();
    expect(card.el.classList.contains('cm-foil')).toBe(true);
    card.update({ foil: false });
    expect(card.el.querySelector('.cm-card-foil')).toBeNull();
  });
});

describe('mountCardTable', () => {
  const makeCards = (n: number): CardData[] =>
    Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

  it('renders the table, deals via the built-in button, and updates the live status', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const table = mountCardTable(parent, { deck: makeCards(10), handSize: 3 });

    expect(parent.querySelector('.cm-table[role="group"]')).not.toBeNull();
    expect(parent.querySelectorAll('.cm-card')).toHaveLength(10);
    expect(table.engine.getState().counts.deck).toBe(10);

    const buttons = [...parent.querySelectorAll<HTMLButtonElement>('.cm-controls button')];
    const deal = buttons.find((b) => b.textContent === 'Deal')!;
    expect(deal.hidden).toBe(false);
    deal.click();
    expect(table.engine.getState().counts).toMatchObject({ deck: 7, hand: 3 });
    expect(parent.querySelector('.cm-sr-only')?.textContent).toContain('3 cards in hand');
    expect(deal.hidden).toBe(true); // hand full

    // Hand cards became interactive toggle buttons with a roving tabindex.
    const interactive = [...parent.querySelectorAll('.cm-card[role="button"]')];
    expect(interactive).toHaveLength(3);
    expect(interactive.filter((el) => el.getAttribute('tabindex') === '0')).toHaveLength(1);

    // Clicking a hand card selects it (aria-pressed + engine state).
    (interactive[0] as HTMLElement).click();
    expect(table.engine.getState().selected.size).toBe(1);
    expect(interactive[0].getAttribute('aria-pressed')).toBe('true');

    table.destroy();
    expect(parent.querySelector('.cm-table')).toBeNull();
  });

  it('drives the full round-trip through the handle', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const table = mountCardTable(parent, { deck: makeCards(8), handSize: 4, controls: false });
    expect(parent.querySelector('.cm-controls')).toBeNull();
    table.deal();
    table.play();
    expect(table.engine.getState().counts).toMatchObject({ hand: 0, table: 4 });
    table.reset();
    expect(table.engine.getState().counts).toEqual({ deck: 8, hand: 0, table: 0 });
    table.destroy();
  });
});

describe('mountDeckReveal', () => {
  const cards = [
    { id: 1, name: 'uno' },
    { id: 2, name: 'dos' },
  ];

  it('spreads the cards, reports picks, and closes on overlay / Escape', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    const reveal = mountDeckReveal(document.body, {
      title: 'Deck',
      cards,
      renderFace: (c) => c.name,
      onPick,
      onClose,
    });
    expect(reveal.el.getAttribute('role')).toBe('dialog');
    const faces = [...reveal.el.querySelectorAll<HTMLButtonElement>('.cm-reveal-card')];
    expect(faces.map((f) => f.textContent)).toEqual(['uno', 'dos']);
    faces[1].click();
    expect(onPick).toHaveBeenCalledWith(2);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    reveal.el.click(); // overlay click
    expect(onClose).toHaveBeenCalledTimes(2);
    reveal.destroy();
    expect(document.querySelector('.cm-reveal-overlay')).toBeNull();
  });

  it('shows the empty label when there are no cards', () => {
    const reveal = mountDeckReveal(document.body, {
      cards: [],
      renderFace: () => '',
      onPick: () => {},
      onClose: () => {},
    });
    expect(reveal.el.querySelector('.cm-reveal-empty')?.textContent).toBe('Empty.');
    reveal.destroy();
  });
});

describe('mountBackgroundShader', () => {
  it('creates the canvas and degrades gracefully with no WebGL context', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const shader = mountBackgroundShader(parent, { className: 'bg', colors: { warm: '#fff' } });
    expect(parent.querySelector('canvas.cm-bg-shader.bg')).not.toBeNull();
    shader.setSpeed(2); // inert without GL, but must not throw
    shader.setColors({ deep: '#000' });
    shader.destroy();
    expect(parent.querySelector('canvas')).toBeNull();
  });
});

describe('vanilla drag & drop (controller + attachDraggable + drop zones)', () => {
  const rect = (left: number, top: number, right: number, bottom: number): DOMRect =>
    ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} }) as DOMRect;

  beforeEach(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
  });

  const pointer = (el: HTMLElement, type: string, x: number, y: number) =>
    el.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }));

  it('drags a card into an accepting zone and reports (id, toZone, fromZone)', () => {
    const onDrop = vi.fn();
    const ctrl = createDragDropController({ onDrop });
    const zoneA = mountDropZone(document.body, ctrl, { id: 'a' });
    const zoneB = mountDropZone(document.body, ctrl, { id: 'b' });
    zoneA.el.getBoundingClientRect = () => rect(0, 0, 100, 100);
    zoneB.el.getBoundingClientRect = () => rect(100, 0, 200, 100);

    const card = document.createElement('div');
    zoneA.body.append(card);
    attachDraggable(card, ctrl, { id: 1, zone: 'a' });
    expect(card.getAttribute('data-flip-id')).toBe('1');
    expect(card.classList.contains('cm-draggable')).toBe(true);

    pointer(card, 'pointerdown', 10, 10);
    pointer(card, 'pointermove', 150, 50); // past threshold, over "b"
    expect(ctrl.getState()).toMatchObject({ draggingId: 1, overZoneId: 'b', overValid: true });
    expect(zoneB.el.classList.contains('cm-dropzone-valid')).toBe(true);
    pointer(card, 'pointerup', 150, 50);
    expect(onDrop).toHaveBeenCalledWith(1, 'b', 'a');
    expect(zoneB.el.classList.contains('cm-dropzone-valid')).toBe(false);
  });

  it('a refusing zone highlights the rejection and never receives the drop', () => {
    const onDrop = vi.fn();
    const onDragEnd = vi.fn();
    const ctrl = createDragDropController({ onDrop, onDragEnd });
    const zone = document.createElement('div');
    document.body.append(zone);
    const detachZone = attachDropZone(zone, ctrl, { id: 'b', accepts: () => false });
    zone.getBoundingClientRect = () => rect(100, 0, 200, 100);

    const card = document.createElement('div');
    document.body.append(card);
    attachDraggable(card, ctrl, { id: 1, zone: 'a' });
    pointer(card, 'pointerdown', 10, 10);
    pointer(card, 'pointermove', 150, 50);
    expect(zone.classList.contains('cm-dropzone-reject')).toBe(true);
    pointer(card, 'pointerup', 150, 50);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledWith(false);
    detachZone();
  });
});
