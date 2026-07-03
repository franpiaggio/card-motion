import { KW_LABEL, type GCard } from './game/cards';
import { power } from './game/rules';

// ── Placeholder faces ─────────────────────────────────────────────────────────
// Clarity over art: kind sets the color and frame, a one-glyph mark + name make
// each card distinct, and the ATK / HP corners read at a glance. No borrowed
// playing-card iconography.

export function CardFace({
  card,
  faceDown = false,
  playable = false,
  affordable = true,
  dragging = false,
  active = false,
}: {
  card: GCard;
  faceDown?: boolean;
  playable?: boolean;
  affordable?: boolean;
  dragging?: boolean;
  active?: boolean;
}) {
  if (faceDown) {
    const back = card.kind === 'monster' ? 'sk-back-horde' : 'sk-back-ally';
    return (
      <div className={`sk-card sk-back ${back}`} aria-hidden="true">
        <span className="sk-back-mark" />
      </div>
    );
  }

  if (card.kind === 'portal') {
    const pct = Math.max(0, Math.round((card.hp / card.maxHp) * 100));
    return (
      <div className="sk-card sk-portal" role="img" aria-label={`Portal stage ${card.stage}, ${card.hp} health`}>
        <span className="sk-portal-stage">{card.glyph}</span>
        <span className="sk-portal-title">Portal</span>
        <div className="sk-portal-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="sk-portal-hp">{card.hp} HP</span>
        <div className="sk-portal-meta">
          <span aria-label="wave">⚑ {card.wave}</span>
          <span aria-label="mana boost">✦ {card.boost}</span>
        </div>
      </div>
    );
  }

  const atk = power(card);
  const boosted = atk > card.atk;
  const hurt = card.hp < card.maxHp;
  const kws = card.keywords ?? [];
  const cls = [
    'sk-card',
    card.kind === 'monster' ? 'sk-mon' : card.kind === 'outsider' ? 'sk-outsider' : 'sk-ally',
    playable ? 'is-playable' : '',
    !affordable && card.kind === 'ally' ? 'is-broke' : '',
    dragging ? 'is-dragging' : '',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      role="img"
      aria-label={`${card.name}, attack ${atk}, health ${card.hp}${kws.length ? `, ${kws.map((k) => KW_LABEL[k]).join(', ')}` : ''}`}
    >
      {card.kind === 'ally' && <span className="sk-cost">{card.cost}</span>}
      {card.kind === 'outsider' && <span className="sk-boss-tag">BOSS</span>}
      <span className="sk-glyph">{card.glyph}</span>
      <span className="sk-name">{card.name}</span>
      {kws.length > 0 && (
        <span className="sk-kws">
          {kws.map((k) => (
            <span key={k} className={`sk-kw sk-kw-${k}`}>
              {KW_LABEL[k]}
            </span>
          ))}
        </span>
      )}
      <span className={`sk-badge sk-atk${boosted ? ' is-boosted' : ''}`}>{atk}</span>
      <span className={`sk-badge sk-hp${hurt ? ' is-hurt' : ''}`}>{Math.max(0, card.hp)}</span>
    </div>
  );
}
