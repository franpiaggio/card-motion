import { useEffect, useRef, useState, type ReactNode } from 'react';

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
}: {
  title: string;
  moves: number;
  status?: string;
  onNew: () => void;
  onRules: () => void;
}) {
  return (
    <header className="sol-bar">
      <div className="sol-bar-left">
        <a className="sol-back" href="#">
          ← <span className="sol-back-label">card-motion</span>
        </a>
        <h1 className="sol-title">{title}</h1>
      </div>
      <div className="sol-bar-right">
        <span className="sol-stat" aria-live="polite">
          {status ?? `${moves} moves`}
        </span>
        <button type="button" className="sol-btn" onClick={onRules}>
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

/** Win overlay with a replay button. */
export function WinOverlay({ moves, onNew }: { moves: number; onNew: () => void }) {
  return (
    <div className="sol-win" role="alertdialog" aria-label="You won">
      <div className="sol-win-panel">
        <strong>You win 🎉</strong>
        <span>Solved in {moves} moves</span>
        <button type="button" className="sol-btn sol-btn-primary" onClick={onNew}>
          New game
        </button>
      </div>
    </div>
  );
}
