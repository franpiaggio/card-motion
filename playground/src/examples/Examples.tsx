import { GAMES } from './games';

// Index for the "Working examples" section: real games built with card-motion.
export default function Examples() {
  return (
    <div className="ex">
      <header className="ex-head">
        <a className="ex-back" href="#">
          ← card-motion
        </a>
        <h1 className="ex-title">
          Working <span>examples</span>
        </h1>
        <p className="ex-sub">Six complete solitaire games built with the library. Each is a real, playable example — drag or tap to move, and hit Tutorial to learn the rules by watching.</p>
      </header>

      <div className="ex-grid">
        {GAMES.map((g) => (
          <a key={g.href} className="ex-card" href={g.href}>
            <span className={`ex-tag ex-tag-${g.accent}`}>{g.tag}</span>
            <h2>{g.name}</h2>
            <p>{g.blurb}</p>
            <span className="ex-uses">{g.uses}</span>
            <span className="ex-play">Play →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
