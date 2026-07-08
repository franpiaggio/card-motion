import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCardTable, type CardTableApi } from './useCardTable';
import { useCardPiles, type CardPilesApi } from './useCardPiles';
import { stackLayout, fanLayout } from '../lib/layout';
import type { CardData } from '../types';

// StrictMode double-invokes render and mount/cleanup/mount effects: the engine
// wrappers must survive being mounted twice and must not duplicate listeners
// or lose state. This guards the hooks-as-wrappers refactor.

const makeCards = (n: number): CardData[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

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

let tableApi: CardTableApi;
function TableHarness() {
  tableApi = useCardTable({ deck: makeCards(10), handSize: 3 });
  return (
    <div ref={tableApi.stageRef} style={{ width: 800, height: 600 }}>
      {tableApi.cards.map((c) => (
        <div key={c.id} ref={(el) => tableApi.registerCard(c.id, el)} />
      ))}
    </div>
  );
}

type Pile = 'deck' | 'hand';
let pilesApi: CardPilesApi<Pile>;
function PilesHarness() {
  pilesApi = useCardPiles<Pile>({
    cards: makeCards(8),
    piles: {
      deck: { anchor: () => ({ x: 100, y: 300 }), layout: stackLayout },
      hand: { anchor: () => ({ x: 450, y: 500 }), layout: fanLayout },
    },
  });
  return (
    <div ref={pilesApi.stageRef} style={{ width: 800, height: 600 }}>
      {pilesApi.cards.map((c) => (
        <div key={c.id} ref={(el) => pilesApi.registerCard(c.id, el)} />
      ))}
    </div>
  );
}

describe('StrictMode double-mount', () => {
  it('useCardTable keeps a consistent state through remount and actions', () => {
    const { unmount } = render(
      <StrictMode>
        <TableHarness />
      </StrictMode>,
    );
    expect(tableApi.counts).toEqual({ deck: 10, hand: 0, table: 0 });
    act(() => tableApi.deal());
    expect(tableApi.counts).toMatchObject({ deck: 7, hand: 3 });
    act(() => tableApi.play());
    expect(tableApi.counts).toMatchObject({ hand: 0, table: 3 });
    act(() => tableApi.reset());
    expect(tableApi.counts).toEqual({ deck: 10, hand: 0, table: 0 });
    unmount();
    // Resize after unmount must be a no-op (listeners removed), not a crash.
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });

  it('useCardPiles keeps a consistent state through remount and actions', () => {
    const { unmount } = render(
      <StrictMode>
        <PilesHarness />
      </StrictMode>,
    );
    expect(pilesApi.counts).toEqual({ deck: 8, hand: 0 });
    act(() => void pilesApi.draw('deck', 'hand', 3));
    expect(pilesApi.piles.hand).toEqual([5, 6, 7]);
    act(() => void pilesApi.gather('deck'));
    expect(pilesApi.counts).toEqual({ deck: 8, hand: 0 });
    unmount();
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });
});
