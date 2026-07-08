import { attachCardTilt } from '../core/tilt';
import { cardLabel, RED_SUITS } from '../lib/names';
import { CARD_H, CARD_W } from '../lib/layout';
import type { CardColor, Suit } from '../types';

export interface CreateCardOptions {
  /** Rank label, e.g. `A`, `7`, `10`, `K`. */
  rank: string;
  suit: Suit;
  /** Overrides the color inferred from the suit. */
  color?: CardColor;
  /** Card width in px; height scales proportionally. Default `96`. */
  width?: number;
  /** Enable the pointer-following 3D tilt. Default `true`. */
  tilt?: boolean;
  /** Maximum tilt in degrees. Default `16`. */
  maxTilt?: number;
  /** Always-on holographic foil overlay (special cards). Default `false`. */
  foil?: boolean;
  /** Reflected as `aria-pressed` and the `cm-selected` class. Default `false`. */
  selected?: boolean;
  /**
   * Make the card a keyboard-operable button: focusable, `role="button"`, and
   * activated by Enter/Space (which fires `onClick`). Default `false`.
   */
  interactive?: boolean;
  /** Accessible name. Defaults to e.g. "Ace of spades". */
  label?: string;
  /** Tab order — pass `-1` for the non-active cards in a roving-tabindex group. */
  tabIndex?: number;
  /** Hide from assistive tech (e.g. cards buried in the deck stack). */
  hiddenFromAt?: boolean;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

export interface CardHandle {
  /** The card's root element (`.cm-card`) — position it yourself. */
  el: HTMLDivElement;
  /** Re-apply any subset of the options (selection, foil, interactivity…). */
  update: (next: Partial<CreateCardOptions>) => void;
  /** Detach the tilt and remove the element. */
  destroy: () => void;
}

/**
 * A single playing card, framework-free: cream face, corner indices, big
 * center pip, an optional always-on holographic foil, and a pointer-driven 3D
 * tilt. When `interactive`, it behaves as an accessible toggle button. Renders
 * the exact same DOM (and `cm-*` classes) as the React `<Card>` — style it
 * with `card-motion/styles.css`.
 */
export function createCard(initial: CreateCardOptions): CardHandle {
  let opts: CreateCardOptions = { ...initial };

  const el = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = 'cm-card-inner';
  const face = document.createElement('div');
  const tl = document.createElement('span');
  tl.setAttribute('aria-hidden', 'true');
  const tlRank = document.createElement('b');
  const tlSuit = document.createElement('i');
  tl.append(tlRank, tlSuit);
  const pip = document.createElement('span');
  pip.className = 'cm-pip';
  pip.setAttribute('aria-hidden', 'true');
  const br = document.createElement('span');
  br.setAttribute('aria-hidden', 'true');
  const brRank = document.createElement('b');
  const brSuit = document.createElement('i');
  br.append(brRank, brSuit);
  tl.className = 'cm-corner cm-tl';
  br.className = 'cm-corner cm-br';
  face.append(tl, pip, br);
  inner.append(face);
  el.append(inner);

  let foilEl: HTMLDivElement | null = null;
  let detachTilt: (() => void) | null = null;

  const handleClick = (e: MouseEvent) => opts.onClick?.(e);
  const handleKeyDown = (e: KeyboardEvent) => {
    opts.onKeyDown?.(e);
    if (opts.interactive && !e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      el.click();
    }
  };
  el.addEventListener('click', handleClick);
  el.addEventListener('keydown', handleKeyDown);

  const apply = () => {
    const {
      rank,
      suit,
      color,
      width = 96,
      tilt = true,
      maxTilt = 16,
      foil = false,
      selected = false,
      interactive = false,
      label,
      tabIndex,
      hiddenFromAt = false,
      className,
    } = opts;

    const resolvedColor: CardColor = color ?? (RED_SUITS.includes(suit) ? 'red' : 'black');
    const height = width * (CARD_H / CARD_W);
    const name = label ?? cardLabel(rank, suit);

    el.className = 'cm-card' + (foil ? ' cm-foil' : '') + (selected ? ' cm-selected' : '') + (className ? ` ${className}` : '');
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.setProperty('--cm-w', `${width}px`);

    face.className = `cm-card-face cm-${resolvedColor}`;
    tlRank.textContent = rank;
    tlSuit.textContent = suit;
    pip.textContent = suit;
    brRank.textContent = rank;
    brSuit.textContent = suit;

    // ARIA: hidden in the deck, a toggle button in the hand, an image otherwise.
    el.removeAttribute('aria-hidden');
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.removeAttribute('aria-pressed');
    el.removeAttribute('tabindex');
    if (hiddenFromAt) {
      el.setAttribute('aria-hidden', 'true');
    } else if (interactive) {
      el.setAttribute('role', 'button');
      el.tabIndex = tabIndex ?? 0;
      el.setAttribute('aria-label', name);
      el.setAttribute('aria-pressed', String(selected));
    } else {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', name);
      if (tabIndex != null) el.tabIndex = tabIndex;
    }

    if (foil && !foilEl) {
      foilEl = document.createElement('div');
      foilEl.className = 'cm-card-foil';
      inner.append(foilEl);
    } else if (!foil && foilEl) {
      foilEl.remove();
      foilEl = null;
    }

    if (tilt && !detachTilt) {
      detachTilt = attachCardTilt(el, inner, { maxTilt });
    } else if (!tilt && detachTilt) {
      detachTilt();
      detachTilt = null;
    }
  };
  apply();

  return {
    el,
    update(next) {
      opts = { ...opts, ...next };
      apply();
    },
    destroy() {
      detachTilt?.();
      detachTilt = null;
      el.removeEventListener('click', handleClick);
      el.removeEventListener('keydown', handleKeyDown);
      el.remove();
    },
  };
}
