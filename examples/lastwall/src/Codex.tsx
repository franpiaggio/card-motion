import { useMemo } from 'react';
import { CardInspectLayer, useCardInspect } from 'card-motion';
import { CardFace } from './CardFace';
import InspectCard from './InspectCard';
import { ALLY_TEMPLATES, KW_LABEL, MON_TEMPLATES, type GCard } from './game/cards';

// A browsable catalog of every card, grouped by role. Tap a card to magnify it
// (same card-motion inspect primitive the game uses) and read its keywords.
function buildCatalog(): { allies: GCard[]; horde: GCard[]; boss: GCard } {
  const allies: GCard[] = ALLY_TEMPLATES.map((t, i) => ({
    id: 9000 + i,
    kind: 'ally',
    name: t.name,
    glyph: t.glyph,
    atk: t.atk,
    hp: t.hp,
    maxHp: t.hp,
    cost: t.cost,
    keywords: t.keywords,
  }));
  const horde: GCard[] = MON_TEMPLATES.map((t, i) => ({
    id: 9100 + i,
    kind: 'monster',
    name: t.name,
    glyph: t.glyph,
    atk: t.atk,
    hp: t.hp,
    maxHp: t.hp,
    keywords: t.keywords,
  }));
  const boss: GCard = { id: 9200, kind: 'outsider', name: 'The Outsider', glyph: '☠', atk: 5, hp: 24, maxHp: 24, keywords: ['trample'] };
  return { allies, horde, boss };
}

export default function Codex({ onClose }: { onClose: () => void }) {
  const { allies, horde, boss } = useMemo(buildCatalog, []);
  const byId = useMemo(() => new Map<number, GCard>([...allies, ...horde, boss].map((c) => [c.id, c])), [allies, horde, boss]);
  const inspect = useCardInspect({ triggers: [] });
  const card = inspect.inspectId != null ? byId.get(inspect.inspectId) : undefined;

  const Grid = ({ cards }: { cards: GCard[] }) => (
    <div className="sk-codex-grid">
      {cards.map((c) => (
        <button key={c.id} type="button" className="sk-codex-cell" onClick={(e) => inspect.open(c.id, e.currentTarget, true)}>
          <CardFace card={c} />
          <span className="sk-codex-kw">{(c.keywords ?? []).map((k) => KW_LABEL[k]).join(' · ') || 'No keyword'}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="sk-codex" role="dialog" aria-modal="true" aria-label="Card codex">
      <div className="sk-codex-panel">
        <button type="button" className="sk-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="sk-codex-title">Card Codex</h2>
        <p className="sk-codex-lede">Every card in the game. Tap any card to magnify it and read what it does.</p>

        <div className="sk-codex-section">
          <h3 className="sk-codex-head">
            Your allies <span>{allies.length}</span>
          </h3>
          <p className="sk-codex-note">Deploy these into the lanes. Cost is top-left; attack and health on the corners.</p>
          <Grid cards={allies} />
        </div>

        <div className="sk-codex-section">
          <h3 className="sk-codex-head">
            The horde <span>{horde.length}</span>
          </h3>
          <p className="sk-codex-note">The monsters you fight. Stronger ones appear as the assault ramps up.</p>
          <Grid cards={horde} />
        </div>

        <div className="sk-codex-section">
          <h3 className="sk-codex-head">The boss</h3>
          <p className="sk-codex-note">Summoned once the portal falls. Its health scales with the siege (14–24). Kill it to win.</p>
          <Grid cards={[boss]} />
        </div>
      </div>

      <CardInspectLayer open={inspect.inspectId != null} sourceRect={inspect.sourceRect} onClose={inspect.close}>
        {card && <InspectCard card={card} />}
      </CardInspectLayer>
    </div>
  );
}
