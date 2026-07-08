import { createCardTable, type CardTableEngine, type CardTableOptions, type CardTableState } from '../core/table-engine';
import { shuffleInPlace } from '../lib/deck';
import { createCard, type CardHandle } from './card';

export interface MountCardTableOptions extends CardTableOptions {
  /** Card width in px. Default `96`. */
  cardWidth?: number;
  /** Enable the pointer 3D tilt on cards. Default `true`. */
  tilt?: boolean;
  /** Click (or Enter/Space) a hand card to select / deselect it. Default `true`. */
  selectable?: boolean;
  /** How many random hand cards get the always-on holographic foil. Default `1`. */
  specialCount?: number;
  /** Explicit ids for the foil ("special") cards. Overrides `specialCount`. */
  foilCardIds?: number[];
  /** Show the built-in controls bar. Default `true`. */
  controls?: boolean;
  /** Labels for the built-in controls (for i18n). */
  labels?: Partial<Record<'shuffle' | 'deal' | 'play' | 'playAll' | 'clear' | 'reset', string>>;
  /** Accessible name for the table region. Default `"Card table"`. */
  ariaLabel?: string;
  className?: string;
}

export interface CardTableMount {
  /** The table's root element (`.cm-table`), already appended to the parent. */
  el: HTMLDivElement;
  /** The underlying engine, for state reads (`getState`/`subscribe`). */
  engine: CardTableEngine;
  shuffle: () => void;
  deal: (count?: number) => void;
  play: () => void;
  playSelected: () => void;
  clearTable: () => void;
  reset: () => void;
  toggleCard: (id: number) => void;
  /** Unmount everything: engine listeners, resize observer, DOM. */
  destroy: () => void;
}

const DEFAULT_LABELS = { shuffle: 'Shuffle', deal: 'Deal', play: 'Play', playAll: 'Play All', clear: 'Clear', reset: 'Reset' };

/**
 * A ready-to-use card table, framework-free: a full deck with shuffle / deal /
 * play / clear / reset animations, click- or keyboard-driven selection, and an
 * optional controls bar. Drive it via the returned handle or the built-in
 * buttons. Same DOM, classes and accessibility as the React `<CardTable>`.
 *
 * Keyboard: Tab to a hand card, Arrow keys / Home / End to move between them,
 * Enter or Space to select / deselect.
 */
export function mountCardTable(parent: HTMLElement, options: MountCardTableOptions = {}): CardTableMount {
  const {
    cardWidth = 96,
    tilt = true,
    selectable = true,
    specialCount = 1,
    foilCardIds,
    controls = true,
    labels,
    ariaLabel = 'Card table',
    className,
    ...tableOptions
  } = options;
  const handSize = tableOptions.handSize ?? 8;
  const l = { ...DEFAULT_LABELS, ...labels };

  const engine = createCardTable(tableOptions);

  // ── Static DOM skeleton ────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = `cm-table${className ? ` ${className}` : ''}`;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ariaLabel);

  const status = document.createElement('div');
  status.className = 'cm-sr-only';
  status.setAttribute('aria-live', 'polite');
  root.append(status);

  const stage = document.createElement('div');
  stage.className = 'cm-stage';
  root.append(stage);

  // ── Cards ──────────────────────────────────────────────────────────────────
  // Shrink the cards on narrow screens so a full hand never overflows.
  let effectiveWidth = cardWidth;
  const cardHandles = new Map<number, CardHandle>();
  for (const c of engine.cards) {
    const handle = createCard({
      rank: c.rank,
      suit: c.suit,
      color: c.color,
      width: effectiveWidth,
      tilt,
      hiddenFromAt: true,
      onClick: () => {
        if (selectable && engine.getState().hand.includes(c.id)) engine.toggleCard(c.id);
      },
      onKeyDown: (e) => onHandKeyDown(e, c.id),
    });
    handle.el.style.position = 'absolute';
    handle.el.style.top = '0';
    handle.el.style.left = '0';
    stage.append(handle.el);
    engine.registerCard(c.id, handle.el);
    cardHandles.set(c.id, handle);
  }

  // ── Controls bar ───────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'cm-controls';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Table controls');
  const button = (text: string, cls: string | null, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    if (cls) b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    bar.append(b);
    return b;
  };
  const btnShuffle = button(l.shuffle, null, () => engine.shuffle());
  const btnDeal = button(l.deal, null, () => engine.deal());
  const btnPlay = button(l.play, null, () => engine.playSelected());
  const btnPlayAll = button(l.playAll, null, () => engine.play());
  const btnClear = button(l.clear, 'cm-warn', () => engine.clearTable());
  const btnReset = button(l.reset, 'cm-ghost', () => engine.reset());
  if (controls) root.append(bar);

  // ── Reactive rendering ─────────────────────────────────────────────────────
  // "Special" foil cards: a random pick from the current hand (re-picked on
  // each deal). Pass `foilCardIds` to mark specific cards permanently instead.
  let specialIds: ReadonlySet<number> = new Set(foilCardIds ?? []);
  let lastHand: ReadonlyArray<number> | null = null;
  const repickFoils = (hand: ReadonlyArray<number>) => {
    if (foilCardIds) {
      specialIds = new Set(foilCardIds);
      return;
    }
    if (specialCount <= 0 || hand.length === 0) {
      specialIds = new Set();
      return;
    }
    specialIds = new Set(shuffleInPlace([...hand]).slice(0, Math.min(specialCount, hand.length)));
  };

  // Roving tabindex across the hand.
  let focusId: number | null = null;

  function onHandKeyDown(e: KeyboardEvent, id: number) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const hand = engine.getState().hand;
    const idx = hand.indexOf(id);
    if (idx < 0) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight' ? Math.min(hand.length - 1, idx + 1)
      : e.key === 'ArrowLeft' ? Math.max(0, idx - 1)
      : e.key === 'Home' ? 0
      : hand.length - 1;
    const nextId = hand[next];
    focusId = nextId;
    render(engine.getState());
    cardHandles.get(nextId)?.el.focus();
  }

  const render = (state: CardTableState) => {
    const { hand, table, counts, selected } = state;

    if (hand !== lastHand) {
      lastHand = hand;
      repickFoils(hand);
      focusId = focusId != null && hand.includes(focusId) ? focusId : hand.length ? hand[0] : null;
    }

    status.textContent =
      `${counts.hand} ${counts.hand === 1 ? 'card' : 'cards'} in hand` +
      (selected.size ? `, ${selected.size} selected` : '') +
      `, ${counts.table} on the table`;

    for (const c of engine.cards) {
      const inHand = hand.includes(c.id);
      const inTable = table.includes(c.id);
      const isInteractive = selectable && inHand;
      cardHandles.get(c.id)!.update({
        width: effectiveWidth,
        foil: specialIds.has(c.id),
        selected: selected.has(c.id),
        interactive: isInteractive,
        tabIndex: inHand ? (c.id === focusId ? 0 : -1) : undefined,
        hiddenFromAt: !inHand && !inTable,
      });
    }

    btnShuffle.hidden = engine.cards.length === 0;
    btnDeal.hidden = !(counts.deck > 0 && counts.hand < handSize);
    btnPlay.hidden = !(selected.size > 0);
    btnPlayAll.hidden = !(selected.size === 0 && counts.hand > 0);
    btnClear.hidden = !(counts.table > 0);
    btnReset.hidden = !(counts.hand > 0 || counts.table > 0);
  };

  const unsubscribe = engine.subscribe(() => render(engine.getState()));

  // ── Mount ──────────────────────────────────────────────────────────────────
  parent.append(root);
  const unmountEngine = engine.mount(stage);

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    const updateWidth = () => {
      const w = stage.clientWidth;
      const next = w > 0 ? Math.min(cardWidth, Math.max(46, w / 7)) : cardWidth;
      if (next !== effectiveWidth) {
        effectiveWidth = next;
        render(engine.getState());
      }
    };
    ro = new ResizeObserver(updateWidth);
    ro.observe(stage);
    updateWidth();
  }

  render(engine.getState());

  return {
    el: root,
    engine,
    shuffle: engine.shuffle,
    deal: engine.deal,
    play: engine.play,
    playSelected: engine.playSelected,
    clearTable: engine.clearTable,
    reset: engine.reset,
    toggleCard: engine.toggleCard,
    destroy: () => {
      ro?.disconnect();
      unsubscribe();
      unmountEngine();
      engine.destroy();
      for (const h of cardHandles.values()) h.destroy();
      root.remove();
    },
  };
}
