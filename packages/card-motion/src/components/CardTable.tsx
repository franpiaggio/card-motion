'use client';

import { forwardRef, useImperativeHandle, type CSSProperties } from 'react';
import { Card } from './Card';
import { useCardTable, type UseCardTableOptions } from '../hooks/useCardTable';

export interface CardTableHandle {
  shuffle: () => void;
  deal: (count?: number) => void;
  play: () => void;
  reset: () => void;
}

export interface CardTableProps extends UseCardTableOptions {
  /** Card width in px. Default `96`. */
  cardWidth?: number;
  /** Render the holographic foil on cards. Default `true`. */
  foil?: boolean;
  /** Enable the pointer 3D tilt on cards. Default `true`. */
  tilt?: boolean;
  /** Show the built-in controls bar. Default `true`. */
  controls?: boolean;
  /** Labels for the built-in controls (for i18n). */
  labels?: Partial<Record<'shuffle' | 'deal' | 'play' | 'reset', string>>;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_LABELS = { shuffle: 'Shuffle', deal: 'Deal', play: 'Play', reset: 'Reset' };

/**
 * A ready-to-use Balatro-style card table: a full deck with shuffle / deal /
 * play / reset animations and an optional controls bar. Call the actions
 * imperatively via a ref, or use the built-in buttons.
 */
export const CardTable = forwardRef<CardTableHandle, CardTableProps>(function CardTable(
  { cardWidth = 96, foil = true, tilt = true, controls = true, labels, className, style, ...tableOptions },
  ref,
) {
  const { cards, stageRef, registerCard, shuffle, deal, play, reset } = useCardTable(tableOptions);
  useImperativeHandle(ref, () => ({ shuffle, deal, play, reset }), [shuffle, deal, play, reset]);

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
            width={cardWidth}
            foil={foil}
            tilt={tilt}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        ))}
      </div>
      {controls && (
        <div className="cm-controls">
          <button type="button" onClick={shuffle}>{l.shuffle}</button>
          <button type="button" onClick={() => deal()}>{l.deal}</button>
          <button type="button" onClick={play}>{l.play}</button>
          <button type="button" className="cm-ghost" onClick={reset}>{l.reset}</button>
        </div>
      )}
    </div>
  );
});
