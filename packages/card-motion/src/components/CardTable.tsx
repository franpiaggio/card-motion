'use client';

import { forwardRef, useEffect, useImperativeHandle, useState, type CSSProperties } from 'react';
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
  /** Click a hand card to select it, click again to play it. Default `true`. */
  selectable?: boolean;
  /** How many random cards get the always-on holographic foil. Default `1`. */
  specialCount?: number;
  /** Explicit ids for the foil ("special") cards. Overrides `specialCount`. */
  foilCardIds?: number[];
  /** Show the built-in controls bar. Default `true`. */
  controls?: boolean;
  /** Labels for the built-in controls (for i18n). */
  labels?: Partial<Record<'shuffle' | 'deal' | 'play' | 'playAll' | 'clear' | 'reset', string>>;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_LABELS = { shuffle: 'Shuffle', deal: 'Deal', play: 'Play', playAll: 'Play All', clear: 'Clear', reset: 'Reset' };

/**
 * A ready-to-use Balatro-style card table: a full deck with shuffle / deal /
 * play / clear / reset animations, click-to-select-then-play, and an optional
 * controls bar. Drive it imperatively via a ref or use the built-in buttons.
 */
export const CardTable = forwardRef<CardTableHandle, CardTableProps>(function CardTable(
  { cardWidth = 96, tilt = true, selectable = true, specialCount = 1, foilCardIds, controls = true, labels, className, style, ...tableOptions },
  ref,
) {
  const { cards, stageRef, registerCard, shuffle, deal, play, playSelected, clearTable, reset, toggleCard, selected, hand, counts } =
    useCardTable(tableOptions);
  const handSize = tableOptions.handSize ?? 8;

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
  // each deal), so the shine is always visible. Pass `foilCardIds` to instead
  // mark specific cards as permanently special, wherever they are.
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

  const l = { ...DEFAULT_LABELS, ...labels };

  return (
    <div className={`cm-table${className ? ` ${className}` : ''}`} style={style}>
      <div className="cm-stage" ref={stageRef}>
        {cards.map((c) => (
          <Card
            key={c.id}
            ref={(node) => registerCard(c.id, node)}
            rank={c.rank}
            suit={c.suit}
            color={c.color}
            width={effectiveWidth}
            tilt={tilt}
            foil={specialIds.has(c.id)}
            className={selected.has(c.id) ? 'cm-selected' : undefined}
            onClick={selectable ? () => toggleCard(c.id) : undefined}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ))}
      </div>
      {controls && (
        <div className="cm-controls">
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
