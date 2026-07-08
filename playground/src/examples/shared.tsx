import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { burstConfetti, runWinCascade } from './winCelebration';

/** Measures an element's content width (responsive card sizing). */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setWidth(el.clientWidth);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export const CARD_RATIO = 134 / 96;

/** A face-down card back, sized to match a face-up card of the same width. */
export function CardBack({ width, className }: { width: number; className?: string }) {
  return <div className={`sol-back${className ? ` ${className}` : ''}`} style={{ width, height: width * CARD_RATIO }} aria-hidden />;
}

/** Shared top bar: back link, title, moves, New game, Rules. */
export function ExampleHeader({
  title,
  moves,
  status,
  onNew,
  onRules,
  onTutorial,
  extra,
}: {
  title: string;
  moves: number;
  status?: string;
  onNew: () => void;
  onRules: () => void;
  onTutorial: () => void;
  /** Game-specific control(s) rendered with the other header buttons (e.g. Spider's Auto play). */
  extra?: ReactNode;
}) {
  return (
    <header className="sol-bar">
      <div className="sol-bar-left">
        <a className="sol-navback" href="#">
          ← <span className="sol-back-label">card-motion</span>
        </a>
        <h1 className="sol-title">{title}</h1>
      </div>
      <div className="sol-bar-right">
        <span className="sol-stat" aria-live="polite">
          {status ?? `${moves} moves`}
        </span>
        {extra}
        <button type="button" className="sol-btn" onClick={onTutorial}>
          Tutorial
        </button>
        <button type="button" className="sol-btn sol-btn-hide" onClick={onRules}>
          Rules
        </button>
        <button type="button" className="sol-btn sol-btn-primary" onClick={onNew}>
          New game
        </button>
      </div>
    </header>
  );
}

/** Accessible rules modal: closes on Escape / overlay click, focuses on open. */
export function RulesModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sol-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="sol-modal-panel" ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="sol-modal-head">
          <span>{title}</span>
          <button type="button" className="sol-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sol-modal-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * FLIP: when `dep` changes while `enabled`, glide every `[data-flip-id]` inside
 * `ref` from its previous box to its new one. Used to animate the tutorial's
 * scripted moves (drag moves are already animated by DragDropProvider).
 */
export function useFlip(ref: { current: HTMLElement | null }, dep: unknown, enabled: boolean) {
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !enabled) {
      prev.current = new Map();
      return;
    }
    const els = Array.from(c.querySelectorAll<HTMLElement>('[data-flip-id]'));
    const curr = new Map(els.map((el) => [el.dataset.flipId!, el.getBoundingClientRect()]));
    const hadPrev = prev.current.size > 0;
    for (const el of els) {
      const id = el.dataset.flipId!;
      const old = prev.current.get(id);
      const now = curr.get(id)!;
      if (old && (Math.abs(old.left - now.left) > 0.5 || Math.abs(old.top - now.top) > 0.5)) {
        // Moved: glide from the old box to the new one.
        gsap.fromTo(el, { x: old.left - now.left, y: old.top - now.top }, { x: 0, y: 0, duration: 0.4, ease: 'power3.out' });
      } else if (!old && hadPrev) {
        // Appeared mid-tutorial (e.g. a card drawn to the waste): pop in.
        gsap.fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' });
      }
    }
    prev.current = curr;
  }, [dep, enabled, ref]);
}

export interface TutorialStep {
  text: string;
  /** The scripted move for this step (applied when the user presses Next). */
  apply?: () => void;
}

/** Bottom-docked tutorial coach: explains a step and prompts the next one. */
export function Coach({ step, total, text, onNext, onSkip }: { step: number; total: number; text: string; onNext: () => void; onSkip: () => void }) {
  const last = step === total - 1;
  return (
    <div className="sol-coach" role="dialog" aria-label="Tutorial">
      <div className="sol-coach-body">
        <span className="sol-coach-step">Tutorial · {step + 1}/{total}</span>
        <p>{text}</p>
      </div>
      <div className="sol-coach-actions">
        <button type="button" className="sol-btn" onClick={onSkip}>
          Skip
        </button>
        <button type="button" className="sol-btn sol-btn-primary" onClick={onNext}>
          {last ? 'Finish' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

export interface DiffOption {
  key: string;
  label: string;
  note: string;
}

/** Start-of-game difficulty chooser (shown before dealing). */
export function DifficultyPicker({ title, options, onPick }: { title: string; options: ReadonlyArray<DiffOption>; onPick: (key: string) => void }) {
  return (
    <div className="sol-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sol-modal-panel sol-diff">
        <div className="sol-modal-head">
          <span>{title}</span>
        </div>
        <div className="sol-diff-grid">
          {options.map((o) => (
            <button key={o.key} type="button" className="sol-diff-opt" onClick={() => onPick(o.key)}>
              <strong>{o.label}</strong>
              <span>{o.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * End-of-game overlay: a win, or a "no moves left" dead end. A win first
 * plays the classic cascade — the board's cards launch and bounce off the
 * floor — then the panel pops in under a confetti burst. Reduced motion (or a
 * loss) goes straight to the panel.
 */
export function WinOverlay({ moves, onNew, lost = false }: { moves: number; onNew: () => void; lost?: boolean }) {
  const [showPanel, setShowPanel] = useState(lost);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lost) return;
    let alive = true;
    const cascade = runWinCascade();
    void cascade.finished.then(() => {
      if (!alive) return;
      setShowPanel(true);
      burstConfetti();
    });
    return () => {
      alive = false;
      cascade.cleanup();
    };
  }, [lost]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!showPanel || lost || !panel) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(panel, { y: 70, scale: 0.8, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.7)' });
    const title = panel.querySelector('.sol-win-title');
    if (title) gsap.from(title, { scale: 1.5, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.2)', delay: 0.16 });
  }, [showPanel, lost]);

  return (
    <div className={`sol-win${showPanel ? '' : ' sol-win-cascading'}`} role="alertdialog" aria-label={lost ? 'No moves left' : 'You won'}>
      {showPanel && (
        <div className="sol-win-panel" ref={panelRef}>
          {lost ? <strong>No moves left</strong> : <strong className="sol-win-title">You win!</strong>}
          <span>{lost ? 'This deal is stuck — start a new game.' : `Solved in ${moves} moves`}</span>
          <button type="button" className="sol-btn sol-btn-primary" onClick={onNew}>
            New game
          </button>
        </div>
      )}
    </div>
  );
}
