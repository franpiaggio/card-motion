export default function Coach({
  step,
  total,
  text,
  onNext,
  onSkip,
}: {
  step: number;
  total: number;
  text: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const last = step === total - 1;
  return (
    <div className="sig-coach" role="dialog" aria-label="Tutorial">
      <div className="sig-coach-body">
        <span className="sig-coach-step">
          Tutorial · {step + 1}/{total}
        </span>
        <p>{text}</p>
      </div>
      <div className="sig-coach-actions">
        <button type="button" className="sig-btn" onClick={onSkip}>
          Skip
        </button>
        <button type="button" className="sig-btn sig-btn-primary" onClick={onNext}>
          {last ? 'Play' : 'Next'}
        </button>
      </div>
    </div>
  );
}
