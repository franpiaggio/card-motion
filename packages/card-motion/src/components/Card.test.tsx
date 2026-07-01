import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Card, cardLabel } from './Card';

describe('cardLabel', () => {
  it('names a card in words', () => {
    expect(cardLabel('A', '♠')).toBe('Ace of spades');
    expect(cardLabel('7', '♥')).toBe('7 of hearts');
  });
});

describe('Card accessibility', () => {
  it('is an image with a spoken name by default', () => {
    render(<Card rank="K" suit="♣" tilt={false} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('King of clubs');
  });

  it('is a toggle button when interactive, reflecting `selected` as aria-pressed', () => {
    const { rerender } = render(<Card rank="A" suit="♠" interactive tilt={false} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    rerender(<Card rank="A" suit="♠" interactive selected tilt={false} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('activates onClick with Enter and Space when interactive', () => {
    const onClick = vi.fn();
    render(<Card rank="A" suit="♠" interactive tilt={false} onClick={onClick} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is hidden from assistive tech when hiddenFromAt (buried in the deck)', () => {
    const { container } = render(<Card rank="2" suit="♦" hiddenFromAt tilt={false} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
