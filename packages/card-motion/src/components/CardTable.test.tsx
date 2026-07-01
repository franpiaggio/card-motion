import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardTable, type CardTableHandle } from './CardTable';
import type { CardData } from '../types';

const makeCards = (n: number): CardData[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, rank: `${i}`, suit: '♠', color: 'black' }));

beforeEach(() => {
  // Reduced motion → the table snaps animations, so button/state transitions
  // settle synchronously for assertions.
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

describe('CardTable', () => {
  it('renders one card node per card, under a labelled group', () => {
    const { container } = render(<CardTable deck={makeCards(10)} handSize={3} tilt={false} />);
    expect(screen.getByRole('group', { name: 'Card table' })).toBeTruthy();
    expect(container.querySelectorAll('.cm-stage > .cm-card')).toHaveLength(10);
  });

  it('walks the controls through deal → play all → reset', () => {
    render(<CardTable deck={makeCards(10)} handSize={3} tilt={false} />);
    expect(screen.getByRole('button', { name: 'Deal' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
    // Hand is full → Deal disappears, Play All appears.
    expect(screen.queryByRole('button', { name: 'Deal' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Play All' }));
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: 'Deal' })).toBeTruthy();
  });

  it('exposes an imperative handle and updates the live status region', () => {
    const ref = createRef<CardTableHandle>();
    render(<CardTable ref={ref} deck={makeCards(10)} handSize={3} tilt={false} />);
    act(() => ref.current!.deal());
    expect(screen.getByText(/3 cards in hand/)).toBeTruthy();
  });

  it('supports localized control labels', () => {
    render(<CardTable deck={makeCards(6)} handSize={3} tilt={false} labels={{ deal: 'Repartir' }} />);
    expect(screen.getByRole('button', { name: 'Repartir' })).toBeTruthy();
  });
});
