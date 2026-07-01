import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCardTable, type CardTableApi } from './useCardTable';
import type { CardData } from '../types';

const makeCards = (n: number): CardData[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

// Capture the live api and attach a real stage so the engine measures and (with
// reduced motion) snaps its timelines to the end — clearing its busy guard so we
// can chain actions synchronously in a test.
let api: CardTableApi;
function Harness({ n = 10, handSize = 3 }: { n?: number; handSize?: number }) {
  api = useCardTable({ deck: makeCards(n), handSize });
  return (
    <div ref={api.stageRef} style={{ width: 800, height: 600 }}>
      {api.cards.map((c) => (
        <div key={c.id} ref={(el) => api.registerCard(c.id, el)} />
      ))}
    </div>
  );
}

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

describe('useCardTable', () => {
  it('starts with the whole deck idle', () => {
    render(<Harness n={10} />);
    expect(api.counts).toEqual({ deck: 10, hand: 0, table: 0 });
  });

  it('deals handSize cards from the deck and never past it', () => {
    render(<Harness n={10} handSize={3} />);
    act(() => api.deal());
    expect(api.counts).toMatchObject({ deck: 7, hand: 3 });
    act(() => api.deal()); // hand is already full
    expect(api.counts.hand).toBe(3);
  });

  it('plays the whole hand onto the table', () => {
    render(<Harness n={10} handSize={3} />);
    act(() => api.deal());
    act(() => api.play());
    expect(api.counts).toMatchObject({ hand: 0, table: 3 });
  });

  it('selects a hand card, plays only the selection, and clears selection', () => {
    render(<Harness n={10} handSize={3} />);
    act(() => api.deal());
    const id = api.hand[0];
    act(() => api.toggleCard(id));
    expect(api.selected.has(id)).toBe(true);
    act(() => api.playSelected());
    expect(api.counts).toMatchObject({ hand: 2, table: 1 });
    expect(api.selected.size).toBe(0);
  });

  it('ignores toggleCard for a card that is not in the hand', () => {
    render(<Harness n={10} handSize={3} />);
    act(() => api.deal()); // deals the top 3; card 0 stays in the deck
    act(() => api.toggleCard(0));
    expect(api.selected.size).toBe(0);
  });

  it('clearTable, reset and shuffle each collect everything back to the deck', () => {
    render(<Harness n={10} handSize={3} />);
    act(() => api.deal());
    act(() => api.play());
    act(() => api.clearTable());
    expect(api.counts).toMatchObject({ table: 0, deck: 10 });

    act(() => api.deal());
    act(() => api.reset());
    expect(api.counts).toEqual({ deck: 10, hand: 0, table: 0 });

    act(() => api.deal());
    act(() => api.shuffle());
    expect(api.counts).toEqual({ deck: 10, hand: 0, table: 0 });
  });
});
