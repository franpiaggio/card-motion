// A compact rules panel — the six-phase turn, the win/lose lines, and the two
// keywords in play. Enough to sit down and play without the rulebook.

const PHASES: { n: string; name: string; text: string }[] = [
  { n: '1', name: 'Horde', text: 'You gain mana, then the portal summons a wave of monsters into the leftmost open lanes.' },
  { n: '2', name: 'Alliance', text: 'Spend mana to drag allies from your hand down into empty lanes. This is your move.' },
  { n: '3', name: 'Treachery', text: 'The horde reveals a card and boosts a front-line monster right before the clash.' },
  { n: '4', name: 'Fight', text: 'Lane by lane: ally and monster strike at once. An unopposed monster hits your castle; an unopposed ally hits the portal.' },
  { n: '5', name: 'Pillage', text: 'Raiders strip cards off the top of your deck. Let it run dry and you lose.' },
  { n: '6', name: 'End', text: 'Buffs fade, hands trim to seven, and a new turn begins.' },
];

export default function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="sk-modal" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="sk-modal-card">
        <button type="button" className="sk-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>Hold the line</h2>
        <p className="sk-modal-lede">
          Six lanes stand between the horde and your castle. Deploy allies to trade blows, tear down the portal, then
          destroy the Outsider that follows. Lose your castle or empty your deck and the realm falls.
        </p>

        <ol className="sk-phases">
          {PHASES.map((p) => (
            <li key={p.n}>
              <span className="sk-phase-n">{p.n}</span>
              <div>
                <strong>{p.name}</strong>
                <span>{p.text}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="sk-modal-notes">
          <p>
            <strong>Draw</strong> — every monster you destroy lets you draw a card. That is your engine; keep killing.
          </p>
          <p>
            <strong>Cards</strong> — drag an ally onto a lane to deploy it, or tap any card for <em>Play</em> and{' '}
            <em>Inspect</em> (magnify it to read what it does).
          </p>
        </div>

        <h3 className="sk-modal-sub">Keywords</h3>
        <ul className="sk-kw-glossary">
          <li>
            <span className="sk-kw sk-kw-trample">Trample</span> Overkill carries on: an ally's to the portal, a monster's to your castle.
          </li>
          <li>
            <span className="sk-kw sk-kw-charge">Charge</span> Strikes first; if it kills, it takes no damage back.
          </li>
          <li>
            <span className="sk-kw sk-kw-rally">Rally</span> On deploy, the allies flanking it gain +1 attack.
          </li>
          <li>
            <span className="sk-kw sk-kw-bulwark">Bulwark</span> Takes 1 less from every strike.
          </li>
          <li>
            <span className="sk-kw sk-kw-volley">Volley</span> Also deals 1 to the monster one lane to the right.
          </li>
          <li>
            <span className="sk-kw sk-kw-regenerate">Regen</span> Heals 1 at the end of each turn.
          </li>
          <li>
            <span className="sk-kw sk-kw-frenzy">Frenzy</span> Gains +1 attack every turn it survives.
          </li>
          <li>
            <span className="sk-kw sk-kw-venom">Venom</span> Any damage it deals to an ally destroys it.
          </li>
        </ul>

        <button type="button" className="sk-modal-go" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
