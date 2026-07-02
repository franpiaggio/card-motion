import { DIFFICULTIES, type Difficulty } from './game/difficulties';
import { ELEMENTS } from './game/deck';
import { CardFace } from './CardFace';

export default function StartScreen({ onPick, onTutorial }: { onPick: (d: Difficulty) => void; onTutorial: () => void }) {
  return (
    <div className="sig-start">
      <div className="sig-start-head">
        <p className="sig-kicker">A card-motion demo · custom faces, zero playing cards</p>
        <h1 className="sig-title">
          Sigil <span>Solitaire</span>
        </h1>
        <p className="sig-lede">
          Clear the board by sending each sigil to the altar one rank at a time. Keep the chain alive for a bigger
          multiplier, and match the altar's element for a bonus. A few special sigils bend the rules — a Wild plays
          anywhere, a Gale draws for free.
        </p>
        <div className="sig-sampler" aria-hidden="true">
          {ELEMENTS.map((el, i) => (
            <CardFace key={el.key} card={{ id: i, rank: i * 2 + 3, element: el.key, power: i === 0 ? 'wild' : i === 2 ? 'draw' : undefined }} />
          ))}
        </div>
        <button type="button" className="sig-howto" onClick={onTutorial}>
          How to play →
        </button>
      </div>

      <div className="sig-diffs">
        {DIFFICULTIES.map((d) => (
          <button key={d.key} type="button" className="sig-diff" onClick={() => onPick(d)}>
            <span className="sig-diff-name">{d.name}</span>
            <span className="sig-diff-blurb">{d.blurb}</span>
            <span className="sig-diff-meta">
              <span>
                {d.cols}×{d.rows} board
              </span>
              <span>{d.wrap ? 'wrap on' : 'no wrap'}</span>
              <span>gold {d.target}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
