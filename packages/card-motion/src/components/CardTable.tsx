'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Card } from './Card';
import { useCardTable, type UseCardTableOptions } from '../hooks/useCardTable';
import { shuffleInPlace } from '../lib/deck';

export interface CardTableHandle {
  shuffle: () => void;
  deal: (count?: number) => void;
  play: () => void;
  playSelected: () => void;
  clearTable: () => void;
  reset: () => void;
  toggleCard: (id: number) => void;
}

export interface CardTableProps extends UseCardTableOptions {
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
  style?: CSSProperties;
}

const DEFAULT_LABELS = { shuffle: 'Shuffle', deal: 'Deal', play: 'Play', playAll: 'Play All', clear: 'Clear', reset: 'Reset' };

/**
 * A ready-to-use card table: a full deck with shuffle / deal /
 * play / clear / reset animations, click- or keyboard-driven selection, and an
 * optional controls bar. Drive it imperatively via a ref or the built-in buttons.
 *
 * Keyboard: Tab to a hand card, Arrow keys / Home / End to move between them,
 * Enter or Space to select / deselect.
 */
export const CardTable = forwardRef<CardTableHandle, CardTableProps>(function CardTable(
  { cardWidth = 96, tilt = true, selectable = true, specialCount = 1, foilCardIds, controls = true, labels, ariaLabel = 'Card table', className, style, ...tableOptions },
  ref,
) {
  const { cards, stageRef, registerCard, shuffle, deal, play, playSelected, clearTable, reset, toggleCard, selected, hand, table, counts } =
    useCardTable(tableOptions);
  const handSize = tableOptions.handSize ?? 8;

  // Keep our own map of card DOM nodes so we can move focus between hand cards.
  const localNodes = useRef(new Map<number, HTMLElement>());
  const setCardNode = useCallback(
    (id: number) => (node: HTMLElement | null) => {
      registerCard(id, node);
      if (node) localNodes.current.set(id, node);
      else localNodes.current.delete(id);
    },
    [registerCard],
  );

  // Shrink the cards on narrow screens so a full hand never overflows.
  const [stageWidth, setStageWidth] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setStageWidth(el.clientWidth);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [stageRef]);
  const effectiveWidth = stageWidth > 0 ? Math.min(cardWidth, Math.max(46, stageWidth / 7)) : cardWidth;

  useImperativeHandle(
    ref,
    () => ({ shuffle, deal, play, playSelected, clearTable, reset, toggleCard }),
    [shuffle, deal, play, playSelected, clearTable, reset, toggleCard],
  );

  // "Special" foil cards: a random pick from the current hand (re-picked on
  // each deal). Pass `foilCardIds` to mark specific cards permanently instead.
  const [specialIds, setSpecialIds] = useState<ReadonlySet<number>>(() => new Set(foilCardIds ?? []));
  useEffect(() => {
    if (foilCardIds) {
      setSpecialIds(new Set(foilCardIds));
      return;
    }
    if (specialCount <= 0 || hand.length === 0) {
      setSpecialIds(new Set());
      return;
    }
    const ids = shuffleInPlace([...hand]).slice(0, Math.min(specialCount, hand.length));
    setSpecialIds(new Set(ids));
  }, [foilCardIds, specialCount, hand]);

  // Roving tabindex across the hand.
  const [focusId, setFocusId] = useState<number | null>(null);
  useEffect(() => {
    setFocusId((cur) => (cur != null && hand.includes(cur) ? cur : hand.length ? hand[0] : null));
  }, [hand]);

  const onHandKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, id: number) => {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      const idx = hand.indexOf(id);
      if (idx < 0) return;
      e.preventDefault();
      const next =
        e.key === 'ArrowRight' ? Math.min(hand.length - 1, idx + 1)
        : e.key === 'ArrowLeft' ? Math.max(0, idx - 1)
        : e.key === 'Home' ? 0
        : hand.length - 1;
      const nextId = hand[next];
      setFocusId(nextId);
      localNodes.current.get(nextId)?.focus();
    },
    [hand],
  );

  const l = { ...DEFAULT_LABELS, ...labels };
  const status =
    `${counts.hand} ${counts.hand === 1 ? 'card' : 'cards'} in hand` +
    (selected.size ? `, ${selected.size} selected` : '') +
    `, ${counts.table} on the table`;

  return (
    <div className={`cm-table${className ? ` ${className}` : ''}`} style={style} role="group" aria-label={ariaLabel}>
      <div className="cm-sr-only" aria-live="polite">{status}</div>
      <div className="cm-stage" ref={stageRef}>
        {cards.map((c) => {
          const inHand = hand.includes(c.id);
          const inTable = table.includes(c.id);
          const isInteractive = selectable && inHand;
          return (
            <Card
              key={c.id}
              ref={setCardNode(c.id)}
              rank={c.rank}
              suit={c.suit}
              color={c.color}
              width={effectiveWidth}
              tilt={tilt}
              foil={specialIds.has(c.id)}
              selected={selected.has(c.id)}
              interactive={isInteractive}
              tabIndex={inHand ? (c.id === focusId ? 0 : -1) : undefined}
              hiddenFromAt={!inHand && !inTable}
              onClick={isInteractive ? () => toggleCard(c.id) : undefined}
              onKeyDown={isInteractive ? (e) => onHandKeyDown(e, c.id) : undefined}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
          );
        })}
      </div>
      {controls && (
        <div className="cm-controls" role="toolbar" aria-label="Table controls">
          {cards.length > 0 && (
            <button type="button" onClick={shuffle}>{l.shuffle}</button>
          )}
          {counts.deck > 0 && counts.hand < handSize && (
            <button type="button" onClick={() => deal()}>{l.deal}</button>
          )}
          {selected.size > 0 && (
            <button type="button" onClick={playSelected}>{l.play}</button>
          )}
          {selected.size === 0 && counts.hand > 0 && (
            <button type="button" onClick={play}>{l.playAll}</button>
          )}
          {counts.table > 0 && (
            <button type="button" className="cm-warn" onClick={clearTable}>{l.clear}</button>
          )}
          {(counts.hand > 0 || counts.table > 0) && (
            <button type="button" className="cm-ghost" onClick={reset}>{l.reset}</button>
          )}
        </div>
      )}
    </div>
  );
});
