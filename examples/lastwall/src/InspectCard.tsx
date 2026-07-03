import { CardFace } from './CardFace';
import { KW_DESC, KW_LABEL, type GCard } from './game/cards';
import { power } from './game/rules';

// The magnified content shown inside card-motion's CardInspectLayer: a big face
// plus the readable detail the small card can't fit — stats and what each of its
// keywords actually does.
const TYPE_LABEL: Record<GCard['kind'], string> = {
  ally: 'Ally',
  monster: 'Monster',
  outsider: 'Outsider · boss',
  portal: 'Portal',
  minion: 'Minion',
};

export default function InspectCard({ card }: { card: GCard }) {
  const kws = card.keywords ?? [];
  const isPortal = card.kind === 'portal';

  return (
    <div className="sk-inspect">
      <div className="sk-inspect-face" style={{ ['--cw' as string]: '196px' }}>
        <CardFace card={card} />
      </div>
      <div className="sk-inspect-info">
        <span className="sk-inspect-type">{TYPE_LABEL[card.kind]}</span>
        <h3 className="sk-inspect-name">{card.name}</h3>

        <div className="sk-inspect-stats">
          {isPortal ? (
            <>
              <span>
                <b>Stage {card.stage}</b>
              </span>
              <span>
                <b>{card.hp}</b>/{card.maxHp} HP
              </span>
              <span>
                <b>{card.wave}</b> wave
              </span>
              <span>
                <b>{card.boost}</b> mana
              </span>
            </>
          ) : (
            <>
              {card.cost != null && (
                <span>
                  <b>{card.cost}</b> mana
                </span>
              )}
              <span>
                <b>{power(card)}</b> attack
              </span>
              <span>
                <b>{card.hp}</b>/{card.maxHp} health
              </span>
            </>
          )}
        </div>

        {kws.length > 0 ? (
          <ul className="sk-inspect-kws">
            {kws.map((k) => (
              <li key={k}>
                <span className={`sk-kw sk-kw-${k}`}>{KW_LABEL[k]}</span>
                <span>{KW_DESC[k]}</span>
              </li>
            ))}
          </ul>
        ) : (
          !isPortal && <p className="sk-inspect-plain">No keywords — a plain {TYPE_LABEL[card.kind].toLowerCase()} that just trades attack for health.</p>
        )}
      </div>
    </div>
  );
}
