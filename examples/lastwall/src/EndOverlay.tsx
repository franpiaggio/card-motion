import type { GameResult } from './Game';
import type { Difficulty } from './game/difficulties';

export default function EndOverlay({
  cfg,
  result,
  onAgain,
  onMenu,
}: {
  cfg: Difficulty;
  result: GameResult;
  onAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="sk-overlay" role="dialog" aria-modal="true">
      <div className={`sk-end ${result.won ? 'is-win' : 'is-loss'}`}>
        <span className="sk-end-badge">{result.won ? 'The realm holds' : 'The realm falls'}</span>
        <h2>{result.won ? 'Victory' : 'Defeat'}</h2>
        <p className="sk-end-reason">{result.reason}</p>
        <div className="sk-end-meta">
          <span>
            <strong>{result.turns}</strong> turns
          </span>
          <span>
            <strong>{cfg.name}</strong> siege
          </span>
        </div>
        <div className="sk-end-actions">
          <button type="button" className="sk-end-primary" onClick={onAgain}>
            {result.won ? 'Defend again' : 'Try again'}
          </button>
          <button type="button" className="sk-end-secondary" onClick={onMenu}>
            Change siege
          </button>
        </div>
      </div>
    </div>
  );
}
