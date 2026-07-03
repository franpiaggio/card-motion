import { useState } from 'react';
import { DIFFICULTIES, type Difficulty } from './game/difficulties';
import { CardFace } from './CardFace';
import HowTo from './HowTo';
import Codex from './Codex';
import type { GCard } from './game/cards';

// A tiny sampler so the placeholder faces read before you start: an ally, a
// monster, and the boss.
const SAMPLE: GCard[] = [
  { id: -1, kind: 'ally', name: 'Knight', glyph: '♞', atk: 4, hp: 5, maxHp: 5, cost: 5, keywords: ['charge'] },
  { id: -2, kind: 'monster', name: 'Brute', glyph: '✦', atk: 3, hp: 4, maxHp: 4, keywords: ['trample'] },
  { id: -3, kind: 'outsider', name: 'The Outsider', glyph: '☠', atk: 5, hp: 24, maxHp: 24, keywords: ['trample'] },
];

export default function StartScreen({ onPick, onWalkthrough }: { onPick: (d: Difficulty) => void; onWalkthrough: () => void }) {
  const [help, setHelp] = useState(false);
  const [codex, setCodex] = useState(false);
  return (
    <div className="sk-start">
      <div className="sk-start-head">
        <p className="sk-kicker">A card-motion demo · lane defense, placeholder faces</p>
        <h1 className="sk-title">
          Last<span>wall</span>
        </h1>
        <p className="sk-lede">
          A solo castle-defense battler. Hold six lanes against a rising horde, tear down the portal, and destroy the
          Outsider it unleashes. Every card is a stand-in, drawn for clarity, not a single borrowed playing card.
        </p>
        <div className="sk-sampler" aria-hidden="true">
          {SAMPLE.map((c) => (
            <CardFace key={c.id} card={c} />
          ))}
        </div>
        <div className="sk-start-actions">
          <button type="button" className="sk-walk" onClick={onWalkthrough}>
            ▶ Guided walkthrough
          </button>
          <button type="button" className="sk-howto" onClick={() => setCodex(true)}>
            📖 Card codex
          </button>
          <button type="button" className="sk-howto" onClick={() => setHelp(true)}>
            How to play →
          </button>
        </div>
      </div>

      <div className="sk-diffs">
        {DIFFICULTIES.map((d) => (
          <button key={d.key} type="button" className="sk-diff" onClick={() => onPick(d)}>
            <span className="sk-diff-name">{d.name}</span>
            <span className="sk-diff-blurb">{d.blurb}</span>
            <span className="sk-diff-meta">
              <span>🏰 {d.castleHp}</span>
              <span>🂠 {d.deckSize}</span>
              <span>☠ {d.outsiderHp}</span>
            </span>
          </button>
        ))}
      </div>

      {help && <HowTo onClose={() => setHelp(false)} />}
      {codex && <Codex onClose={() => setCodex(false)} />}
    </div>
  );
}
