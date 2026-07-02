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
  const won = result.outcome === 'won';
  const gold = result.score.score >= cfg.target;
  return (
    <div className="sig-overlay" role="alertdialog" aria-label={won ? 'Board cleared' : 'No moves left'}>
      <div className={`sig-overlay-panel${won ? ' won' : ' lost'}`}>
        <span className="sig-overlay-badge">{won ? (gold ? 'Gold clear' : 'Cleared') : 'Altar cold'}</span>
        <h2>{won ? 'The board is clear.' : 'No moves left.'}</h2>
        <div className="sig-overlay-score">
          <strong>{result.score.score}</strong>
          <span>points</span>
        </div>
        <div className="sig-overlay-stats">
          <div>
            <span>Best streak</span>
            <strong>×{result.score.best}</strong>
          </div>
          <div>
            <span>Gold at</span>
            <strong>{cfg.target}</strong>
          </div>
        </div>
        <p className="sig-overlay-note">
          {won
            ? gold
              ? 'A perfect run — every chain counted.'
              : 'Solved. Chain more plays before drawing to reach gold.'
            : 'The stock ran dry with no rank in reach. Try a different order.'}
        </p>
        <div className="sig-overlay-actions">
          <button type="button" className="sig-btn sig-btn-primary" onClick={onAgain}>
            Play again
          </button>
          <button type="button" className="sig-btn" onClick={onMenu}>
            Change difficulty
          </button>
        </div>
      </div>
    </div>
  );
}
