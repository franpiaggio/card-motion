import type { ReactNode } from 'react';
import { ELEMENTS, type ElementKey, type Power, type SigilCard } from './game/deck';

const NAME = Object.fromEntries(ELEMENTS.map((e) => [e.key, e.name])) as Record<ElementKey, string>;
const POWER_LABEL: Record<Power, string> = { wild: 'Wild', draw: 'Free draw' };

// Four hand-drawn sigils. Simple geometric marks so the faces read as bespoke,
// not as recolored playing cards.
const GLYPHS: Record<ElementKey, ReactNode> = {
  ember: (
    <path d="M24 5c3 7-4 9-4 15a4 4 0 0 0 8 0c0-2-1-4-1-4 5 3 8 8 8 14a11 11 0 0 1-22 0c0-9 8-13 11-25Z" />
  ),
  tide: (
    <path
      d="M6 20c4-5 8-5 12 0s8 5 12 0 8-5 12 0M6 30c4-5 8-5 12 0s8 5 12 0 8-5 12 0"
      fill="none"
      strokeWidth={3.4}
      strokeLinecap="round"
    />
  ),
  gale: (
    <path
      d="M8 17h20a6 6 0 1 0-6-6M6 26h28a7 7 0 1 1-7 7M10 35h14a5 5 0 1 0-5-5"
      fill="none"
      strokeWidth={3.4}
      strokeLinecap="round"
    />
  ),
  terra: <path d="M24 4 42 22 24 44 6 22Zm0 0v40M6 22h36" strokeWidth={2.6} strokeLinejoin="round" />,
};

function Sigil({ element }: { element: ElementKey }) {
  return (
    <svg className="sig-glyph" viewBox="0 0 48 48" aria-hidden="true" stroke="currentColor" fill="currentColor">
      {GLYPHS[element]}
    </svg>
  );
}

export function CardFace({
  card,
  faceDown = false,
  playable = false,
  dragging = false,
}: {
  card: SigilCard;
  faceDown?: boolean;
  playable?: boolean;
  dragging?: boolean;
}) {
  if (faceDown) {
    return (
      <div className="sig-card sig-back" aria-hidden="true">
        <span className="sig-back-mark" />
      </div>
    );
  }
  return (
    <div
      className={`sig-card sig-el-${card.element}${playable ? ' is-playable' : ''}${dragging ? ' is-dragging' : ''}${card.power ? ' is-power' : ''}`}
      role="img"
      aria-label={`${NAME[card.element]} ${card.rank}${card.power ? `, ${POWER_LABEL[card.power]}` : ''}`}
    >
      <span className="sig-rank sig-rank-tl">{card.rank}</span>
      {card.power && <span className={`sig-power sig-power-${card.power}`}>{POWER_LABEL[card.power]}</span>}
      <div className="sig-glyph-wrap">
        <Sigil element={card.element} />
      </div>
      <span className="sig-name">{NAME[card.element]}</span>
      <span className="sig-rank sig-rank-br">{card.rank}</span>
    </div>
  );
}
