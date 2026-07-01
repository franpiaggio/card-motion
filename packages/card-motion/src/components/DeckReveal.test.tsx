import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeckReveal } from './DeckReveal';

const cards = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('DeckReveal', () => {
  it('renders a face per card and picks by id', () => {
    const onPick = vi.fn();
    render(
      <DeckReveal title="Pick" cards={cards} renderFace={(c) => <span>card {c.id}</span>} onPick={onPick} onClose={() => {}} />,
    );
    expect(screen.getByText('card 2')).toBeTruthy();
    fireEvent.click(screen.getByText('card 2'));
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it('closes from the close button and from the overlay backdrop', () => {
    const onClose = vi.fn();
    const { container } = render(
      <DeckReveal title="X" cards={cards} renderFace={(c) => <span>{c.id}</span>} onPick={() => {}} onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector('.cm-reveal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not close when clicking inside the panel', () => {
    const onClose = vi.fn();
    const { container } = render(
      <DeckReveal cards={cards} renderFace={(c) => <span>{c.id}</span>} onPick={() => {}} onClose={onClose} />,
    );
    fireEvent.click(container.querySelector('.cm-reveal-panel')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the empty label when there are no cards', () => {
    render(<DeckReveal cards={[]} renderFace={() => null} onPick={() => {}} onClose={() => {}} emptyLabel="Nada" />);
    expect(screen.getByText('Nada')).toBeTruthy();
  });
});
