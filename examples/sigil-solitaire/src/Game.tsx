import { useEffect, useMemo, useRef, useState } from 'react';
import { useCardDrag, useCardPiles, stack, type PileConfig, type PileLayoutFn } from 'card-motion';
import { CardFace } from './CardFace';
import Coach from './Coach';
import { deal, tutorialDeal, type SigilCard } from './game/deck';
import type { Difficulty } from './game/difficulties';
import { breakStreak, canPlay, emptyScore, scorePlay, type Score } from './game/rules';

// Scripted tutorial: each step's optional action id fires when the player hits Next.
const TUTORIAL_STEPS: ReadonlyArray<{ text: string; play?: number; draw?: boolean }> = [
  { text: 'Welcome. Clear the board by sending every sigil down to the altar.' },
  { text: 'Play a card one rank from the altar. It shows a 6, so this 7 fits — watch it fly down.', play: 2 },
  { text: 'Chain plays without drawing and your streak climbs. Two Embers in a row also pays an element bonus.', play: 4 },
  { text: 'One rank at a time keeps the chain alive — a 9 lands on the 8.', play: 6 },
  { text: 'Ranks wrap around, so a 1 plays on a 9.', play: 5 },
  { text: 'Some sigils are special. A Gale pulls a free card from the stock without breaking your chain.', play: 1 },
  { text: 'No rank in reach? A normal draw turns a card too, but it resets your streak.', draw: true },
  { text: "That's the whole loop: chain for score, clear the board to win. Ready?" },
];

type PileId = string; // 'stock' | 'foundation' | 'col0' | 'col1' | …

export interface GameResult {
  outcome: 'won' | 'stuck';
  score: Score;
}

// ── Responsive metrics ────────────────────────────────────────────────────────
// One formula, used both by the engine's layout callbacks (via the stage size it
// passes) and by the DOM (via the measured size) so faces and positions agree.
function metrics(w: number, h: number, cfg: Difficulty) {
  const spacing = w / (cfg.cols + 0.5);
  const cardW = Math.min(96, Math.max(40, spacing * 0.82));
  const cardH = cardW * (134 / 96);
  const vOffset = cardH * 0.34;
  const boardW = spacing * cfg.cols;
  const leftPad = (w - boardW) / 2 + spacing / 2;
  const colX = (k: number) => leftPad + k * spacing;
  // Stack the board and the foot row as one centered block so the table doesn't
  // sprawl with a big empty gap in the middle.
  const boardH = (cfg.rows - 1) * vOffset + cardH;
  const gap = cardH * 0.55;
  const total = boardH + gap + cardH;
  const top = Math.max(cardH * 0.34, (h - total) / 2);
  const colTop = top + cardH / 2;
  const footY = top + boardH + gap + cardH / 2;
  return { cardW, cardH, vOffset, colX, colTop, footY, stockX: Math.max(cardW * 0.7, w * 0.12), foundX: w * 0.5 };
}

export default function Game({
  cfg,
  onEnd,
  onQuit,
  tutorial = false,
}: {
  cfg: Difficulty;
  onEnd: (r: GameResult) => void;
  onQuit: () => void;
  tutorial?: boolean;
}) {
  // Build the deal + pile config once for this mount (a new mount = a new game).
  const setup = useMemo(() => {
    const d = tutorial ? tutorialDeal() : deal(cfg);
    const byId = new Map<number, SigilCard>(d.cards.map((c) => [c.id, c]));

    const columnLayout: PileLayoutFn<SigilCard> = (i, _n, ctx) => {
      const m = metrics(ctx.width, ctx.height, cfg);
      return { x: ctx.anchor.x, y: ctx.anchor.y + i * m.vOffset, rotation: 0, scale: 1 };
    };
    const altarLayout = stack({ offset: 0.06 });

    const piles: Record<PileId, PileConfig<SigilCard>> = {
      // Declared first → lowest z. Columns sit behind the foot row.
      stock: { anchor: (s) => ({ x: metrics(s.width, s.height, cfg).stockX, y: metrics(s.width, s.height, cfg).footY }), layout: stack({ offset: 0.14 }) },
      foundation: { anchor: (s) => ({ x: metrics(s.width, s.height, cfg).foundX, y: metrics(s.width, s.height, cfg).footY }), layout: altarLayout },
    };
    for (let c = 0; c < cfg.cols; c++) {
      piles[`col${c}`] = {
        anchor: (s) => {
          const m = metrics(s.width, s.height, cfg);
          return { x: m.colX(c), y: m.colTop };
        },
        layout: columnLayout,
      };
    }

    const initial: Record<PileId, number[]> = { stock: d.stock, foundation: d.foundation };
    d.columns.forEach((ids, c) => (initial[`col${c}`] = ids));

    return { cards: d.cards, byId, piles, initial, colIds: d.columns.map((_, c) => `col${c}`) };
  }, [cfg, tutorial]);

  const { cards, byId, piles: pileConfig, initial, colIds } = setup;
  const api = useCardPiles<PileId, SigilCard>({ cards, piles: pileConfig, initial });
  const { stageRef, registerCard, piles, counts, move, draw, pileOf, relayout } = api;

  const [score, setScore] = useState<Score>(emptyScore);
  const [ended, setEnded] = useState(false);
  const [tutStep, setTutStep] = useState(0);

  // Measure the stage so faces size to the same width the layouts use.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      void relayout();
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [relayout]);
  const m = metrics(size.w || 800, size.h || 600, cfg);

  // Fresh reads for callbacks that run after an awaited animation.
  const stateRef = useRef({ piles, counts });
  stateRef.current = { piles, counts };
  const busy = useRef(false);

  const altarTop = (): SigilCard | undefined => {
    const f = stateRef.current.piles.foundation;
    return f.length ? byId.get(f[f.length - 1]) : undefined;
  };
  const columnTopId = (col: PileId): number | undefined => {
    const p = stateRef.current.piles[col];
    return p.length ? p[p.length - 1] : undefined;
  };
  const isBoardTop = (id: number) => colIds.some((c) => columnTopId(c) === id);
  const isPlayable = (id: number) => isBoardTop(id) && canPlay(byId.get(id)!, altarTop(), cfg.maxRank, cfg.wrap);

  const settle = () => {
    if (tutorial) return; // the tutorial ends on its own script, never on win/stuck
    const st = stateRef.current;
    const boardEmpty = colIds.every((c) => st.piles[c].length === 0);
    if (boardEmpty) {
      setEnded(true);
      return;
    }
    const stuck =
      st.counts.stock === 0 &&
      !colIds.some((c) => {
        const top = columnTopId(c);
        return top !== undefined && isPlayable(top);
      });
    if (stuck) setEnded(true);
  };

  const act = (fn: () => Promise<void>) => {
    if (busy.current || ended) return;
    busy.current = true;
    void fn().finally(() => {
      busy.current = false;
    });
  };

  const playCard = (id: number) =>
    act(async () => {
      const card = byId.get(id)!;
      const prev = altarTop();
      await move([id], 'foundation');
      setScore((s) => scorePlay(card, prev, s));
      // Gale sigils pull a free card from the stock and keep the chain alive.
      if (card.power === 'draw' && stateRef.current.counts.stock > 0) {
        await draw('stock', 'foundation', 1);
      }
      settle();
    });

  const drawStock = () =>
    act(async () => {
      if (stateRef.current.counts.stock === 0) return;
      await draw('stock', 'foundation', 1);
      setScore(breakStreak);
      settle();
    });

  // Tutorial: advance the scripted coach, firing this step's move on Next.
  const nextStep = () => {
    const s = TUTORIAL_STEPS[tutStep];
    if (s.play !== undefined) playCard(s.play);
    else if (s.draw) drawStock();
    if (tutStep + 1 >= TUTORIAL_STEPS.length) onQuit();
    else setTutStep((n) => n + 1);
  };

  // Report the result once, after the board settles.
  const reported = useRef(false);
  useEffect(() => {
    if (!ended || reported.current) return;
    reported.current = true;
    const boardEmpty = colIds.every((c) => piles[c].length === 0);
    const t = setTimeout(() => onEnd({ outcome: boardEmpty ? 'won' : 'stuck', score }), 550);
    return () => clearTimeout(t);
  }, [ended, piles, colIds, score, onEnd]);

  // Drag: pick up a column's bottom card, drop it on the altar.
  const { dragId, dragProps } = useCardDrag<PileId>({
    stageRef,
    canDrag: (id) => !busy.current && !ended && !tutorial && isBoardTop(id),
    onTap: (id) => {
      if (tutorial) return;
      if (isPlayable(id)) playCard(id);
    },
    resolveDrop: (id, point, stage) => {
      const overAltar = point.y > stage.height * 0.55 && Math.abs(point.x - stage.width * 0.5) < m.cardW * 2.1;
      return overAltar && isPlayable(id) ? 'foundation' : null;
    },
    onDrop: (id, target) => {
      if (target === 'foundation') playCard(id);
      // Snap home with a plain re-layout (no deal-style overshoot, which would
      // dip the card past its slot before settling).
      else act(async () => void (await relayout(pileOf(id) ?? colIds[0])));
    },
  });

  const stockCount = counts.stock;
  const foundationTopCard = altarTop();

  return (
    <div className="sig-game">
      <header className="sig-hud">
        <button type="button" className="sig-quit" onClick={onQuit} aria-label="Back to menu">
          ‹ Menu
        </button>
        <div className="sig-stat sig-stat-score">
          <span className="sig-stat-label">Score</span>
          <strong>{score.score}</strong>
        </div>
        <div className="sig-stat">
          <span className="sig-stat-label">Streak</span>
          <strong className={score.streak >= 3 ? 'hot' : undefined}>×{Math.max(1, score.streak)}</strong>
        </div>
        <div className="sig-stat">
          <span className="sig-stat-label">Best</span>
          <strong>{score.best}</strong>
        </div>
        <div className="sig-stat sig-target">
          <span className="sig-stat-label">Gold</span>
          <strong>{cfg.target}</strong>
        </div>
      </header>

      <div className="sig-stage-wrap" ref={wrapRef} style={{ ['--cw' as string]: `${m.cardW}px`, ['--ch' as string]: `${m.cardH}px` }}>
        <div className="cm-stage" ref={stageRef}>
          {cards.map((c) => {
            const inStock = piles.stock.includes(c.id);
            return (
              <div key={c.id} className="sig-slot" ref={(n) => registerCard(c.id, n)} style={{ position: 'absolute', top: 0, left: 0 }} {...dragProps(c.id)}>
                <CardFace card={c} faceDown={inStock} playable={isPlayable(c.id)} dragging={dragId === c.id} />
              </div>
            );
          })}
        </div>

        {/* Interactive labels over the foot row */}
        <button
          type="button"
          className="sig-zone sig-stock"
          style={{ left: m.stockX, top: m.footY }}
          onClick={drawStock}
          disabled={stockCount === 0 || ended || tutorial}
          aria-label={`Draw from stock, ${stockCount} left`}
        >
          <span className="sig-zone-count">{stockCount}</span>
          <span className="sig-zone-label">Stock</span>
        </button>
        <div className="sig-zone sig-altar" style={{ left: m.foundX, top: m.footY }} aria-hidden="true">
          <span className="sig-zone-label">Altar</span>
        </div>

        {foundationTopCard && score.lastGain > 0 && (
          <div key={`${score.score}-${score.lastGain}`} className="sig-toast" style={{ left: m.foundX, top: m.footY - m.cardH * 0.75 }}>
            +{score.lastGain}
            {score.elemental && <em> · sigil</em>}
          </div>
        )}
      </div>

      {tutorial ? (
        <Coach step={tutStep} total={TUTORIAL_STEPS.length} text={TUTORIAL_STEPS[tutStep].text} onNext={nextStep} onSkip={onQuit} />
      ) : (
        <p className="sig-hint">
          {cfg.wrap ? 'Play a card one rank from the altar — ranks wrap around.' : 'Play a card one rank above or below the altar. Draw when stuck.'}
        </p>
      )}
    </div>
  );
}
