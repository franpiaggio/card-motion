// The walkthrough's guide panel. Narration steps show a "Next" button; action
// steps ("now drag this card") hide it and show a do-this prompt instead, since
// the player's move is what advances the tutorial.

export default function Coach({
  step,
  total,
  text,
  action,
  place,
  onNext,
  onSkip,
  isLast,
}: {
  step: number;
  total: number;
  text: string;
  action?: string; // when set, this is an action step: no Next button
  place: 'top' | 'bottom';
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
}) {
  return (
    <div className={`sk-coach sk-coach-${place}`} role="dialog" aria-label="Tutorial">
      <div className="sk-coach-head">
        <span className="sk-coach-step">
          {step} / {total}
        </span>
        <button type="button" className="sk-coach-skip" onClick={onSkip}>
          {isLast ? 'Close' : 'Skip tutorial'}
        </button>
      </div>
      <p className="sk-coach-text">{text}</p>
      {action ? (
        <p className="sk-coach-do">
          <span className="sk-coach-hand" aria-hidden="true">
            ☞
          </span>
          {action}
        </p>
      ) : (
        <button type="button" className="sk-coach-next" onClick={onNext}>
          {isLast ? 'Finish' : 'Next →'}
        </button>
      )}
    </div>
  );
}
