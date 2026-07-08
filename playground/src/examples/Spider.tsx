import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Card, DragDropProvider, DropZone, DraggableCard, shuffleInPlace } from 'card-motion';
import { buildSpiderDeck, byIdMap, deal, dealRow, isWon, move, type Dest, type SpiderState } from './spiderRules';
import { planNext, solveGame, type AutoAction } from './spiderAuto';
import { CardBack, CARD_RATIO, Coach, DifficultyPicker, ExampleHeader, RulesModal, useFlip, useMeasure, WinOverlay, type DiffOption, type TutorialStep } from './shared';

interface Game {
  state: SpiderState;
  byId: ReturnType<typeof byIdMap>;
}
const newGame = (suits: number): Game => {
  const d = deal(shuffleInPlace(buildSpiderDeck(suits)));
  return { state: d.state, byId: byIdMap(d.deck) };
};

const DIFFS: ReadonlyArray<DiffOption> = [
  { key: '1', label: 'Simplified', note: 'One suit — the friendliest way to learn; nearly every deal is winnable.' },
  { key: '2', label: 'Normal', note: 'Two suits — runs must share a suit to move. A real challenge.' },
];

export default function Spider() {
  const [game, setGame] = useState<Game>(() => newGame(1));
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(true);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  // Auto play: 'solving' computes a full winning line (backtracking solver),
  // 'playing' replays it one animated move at a time.
  const [auto, setAuto] = useState<'off' | 'solving' | 'playing'>('off');
  const [autoNote, setAutoNote] = useState<string | null>(null);
  const queueRef = useRef<AutoAction[]>([]);
  // A solved line plays to the win; without one we play best-effort and say so.
  const solvedRef = useRef(false);

  const { state, byId } = game;
  const won = isWon(state);
  const cols = 10;
  const gap = boardW < 620 ? 3 : 7;
  const cardW = Math.min(92, Math.max(20, Math.floor((boardW - gap * (cols - 1)) / cols)));
  const cardH = Math.round(cardW * CARD_RATIO);
  const peekUp = Math.round(cardH * 0.26) - cardH;
  const peekDown = Math.round(cardH * 0.13) - cardH;

  // FLIP-animate programmatic moves: tutorial steps and the auto player.
  useFlip(boardRef, tut ? tutStep : state, tut || auto === 'playing');

  const stopAuto = () => {
    queueRef.current = [];
    setAuto('off');
  };
  const reset = () => {
    stopAuto();
    setChooseOpen(true);
    setTut(false);
  };
  const pick = (key: string) => {
    stopAuto();
    setGame(newGame(key === '2' ? 2 : 1));
    setMoves(0);
    setChooseOpen(false);
    setTut(false);
  };
  const applyState = (fn: (s: SpiderState, b: Game['byId']) => SpiderState | null) => setGame((g) => ({ ...g, state: fn(g.state, g.byId) ?? g.state }));

  const handleDrop = (cardId: number, toZone: string) => {
    if (!toZone.startsWith('col-')) return false;
    const dest: Dest = { type: 'tableau', index: +toZone.slice(4) };
    const next = move(state, byId, cardId, dest);
    if (!next) return false;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
    return true;
  };
  const accepts = (index: number) => (cardId: number) => move(state, byId, cardId, { type: 'tableau', index }) !== null;
  const onDealRow = () => {
    const next = dealRow(state, byId);
    if (!next) return;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
  };

  const startAuto = () => {
    setAuto('solving');
    setAutoNote(null);
    // Yield one frame so the button shows "Solving…" before the search blocks.
    window.setTimeout(() => {
      const solution = solveGame(state, byId, 9000);
      solvedRef.current = solution !== null;
      queueRef.current = solution ?? [];
      if (!solution) setAutoNote('No winning line found — this deal may be unwinnable. Playing best effort…');
      setAuto('playing');
    }, 50);
  };

  // Auto-dismiss the note after a while.
  useEffect(() => {
    if (!autoNote) return;
    const t = window.setTimeout(() => setAutoNote(null), 7000);
    return () => clearTimeout(t);
  }, [autoNote]);

  // Replay loop: one action per tick; each state change re-arms the timer.
  // With no precomputed line left (unsolved deal), fall back to the greedy
  // planner and play as far as it goes.
  useEffect(() => {
    if (auto !== 'playing') return;
    if (won) {
      stopAuto();
      return;
    }
    const t = window.setTimeout(() => {
      let act = queueRef.current.shift();
      if (!act) {
        const plan = planNext(state, byId);
        if (!plan) {
          stopAuto(); // genuinely stuck — leave the board as is
          if (!solvedRef.current) setAutoNote('Stopped: no productive moves left from here.');
          return;
        }
        queueRef.current = plan;
        act = queueRef.current.shift()!;
      }
      const next = act.type === 'deal' ? dealRow(state, byId) : move(state, byId, act.id, { type: 'tableau', index: act.dest });
      if (!next) {
        stopAuto(); // the board diverged from the plan — bail out safely
        return;
      }
      setGame((g) => ({ ...g, state: next }));
      setMoves((m) => m + 1);
    }, 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, state, won]);

  const tutorial = useMemo<{ initial: SpiderState; steps: TutorialStep[] }>(() => {
    const kToTwo = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // K…2 in one column
    const initial: SpiderState = { tableau: [kToTwo, [13], [72, 71], [73]], stock: [], faceUp: [...kToTwo, 13, 72, 71, 73], completed: 0 };
    return {
      initial,
      steps: [
        { text: 'Spider: build columns down in sequence. Complete a run from King down to Ace and it clears. Remove all eight to win.' },
        { text: 'Cards build down by one (suit ignored here). Drag this 8-7 run onto the 9.', apply: () => applyState((s, b) => move(s, b, 72, { type: 'tableau', index: 3 })) },
        { text: 'Complete a King-to-Ace run and it is whisked away — one of eight done.', apply: () => applyState((s, b) => move(s, b, 13, { type: 'tableau', index: 0 })) },
        { text: 'When no moves remain, deal a new row across every column (top-right). Finish to play a real game.' },
      ],
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTutorial = () => {
    setGame((g) => ({ ...g, state: tutorial.initial }));
    setMoves(0);
    setRulesOpen(false);
    setChooseOpen(false);
    setTutStep(0);
    setTut(true);
  };
  const nextStep = () => {
    tutorial.steps[tutStep].apply?.();
    if (tutStep + 1 >= tutorial.steps.length) reset();
    else setTutStep((s) => s + 1);
  };

  const face = (cid: number) => {
    const c = byId.get(cid)!;
    return (
      <div className="sol-cardwrap">
        <Card rank={c.rank} suit={c.suit} color={c.color} width={cardW} tilt={false} />
      </div>
    );
  };

  const boardStyle = { '--sol-gap': `${gap}px`, '--sol-cw': `${cardW}px`, '--sol-ch': `${cardH}px` } as CSSProperties;
  const gridCols = { gridTemplateColumns: `repeat(${cols}, ${cardW}px)` } as CSSProperties;
  const dealsLeft = Math.floor(state.stock.length / 10);

  return (
    <div className="sol">
      <ExampleHeader
        title="Spider"
        moves={moves}
        status={`${state.completed}/8 done`}
        onNew={reset}
        onRules={() => setRulesOpen(true)}
        onTutorial={startTutorial}
        extra={
          <button
            type="button"
            className={`sol-btn sol-autoplay${auto !== 'off' ? ' on' : ''}`}
            onClick={auto === 'off' ? startAuto : stopAuto}
            disabled={auto === 'solving' || won || chooseOpen || tut}
          >
            {auto === 'off' ? '▶ Auto play' : auto === 'solving' ? 'Solving…' : '■ Stop'}
          </button>
        }
      />

      {autoNote && (
        <div className="sol-autonote" role="status">
          {autoNote}
        </div>
      )}

      <DragDropProvider onDrop={handleDrop} disabled={auto !== 'off'}>
        <div className="sol-board" ref={boardRef} style={boardStyle}>
          <div className="sol-spider-top">
            <span className="sol-spider-count">{state.completed}/8 runs</span>
            <button type="button" className="sol-stock" onClick={onDealRow} disabled={dealsLeft === 0 || auto !== 'off'} aria-label="Deal a row">
              {dealsLeft > 0 ? (
                <span className="sol-stock-pile" style={{ width: cardW, height: cardH }}>
                  <CardBack width={cardW} />
                  <span className="sol-stock-badge">{dealsLeft}</span>
                </span>
              ) : (
                <span className="sol-stock-empty">✕</span>
              )}
            </button>
          </div>

          <div className="sol-tableau" style={gridCols}>
            {state.tableau.map((col, ci) => (
              <DropZone key={`col-${ci}`} id={`col-${ci}`} className="sol-col" ariaLabel={`Column ${ci + 1}`} accepts={accepts(ci)}>
                {col.length === 0 && <div className="sol-slot" />}
                {col.map((cid, idx) => {
                  const up = state.faceUp.includes(cid);
                  const prevUp = idx > 0 && state.faceUp.includes(col[idx - 1]);
                  const marginTop = idx === 0 ? undefined : prevUp ? peekUp : peekDown;
                  if (!up) {
                    return (
                      <div key={cid} className="sol-cardwrap" style={marginTop != null ? { marginTop } : undefined}>
                        <CardBack width={cardW} />
                      </div>
                    );
                  }
                  return (
                    <DraggableCard key={cid} id={cid} zone={`col-${ci}`} stack={col.slice(idx + 1)} style={marginTop != null ? { marginTop } : undefined}>
                      {face(cid)}
                    </DraggableCard>
                  );
                })}
              </DropZone>
            ))}
          </div>
        </div>
      </DragDropProvider>

      {chooseOpen && !tut && <DifficultyPicker title="Spider — choose a difficulty" options={DIFFS} onPick={pick} />}

      {tut && <Coach step={tutStep} total={tutorial.steps.length} text={tutorial.steps[tutStep].text} onNext={nextStep} onSkip={reset} />}

      {rulesOpen && !tut && (
        <RulesModal title="Spider — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Remove all eight King-to-Ace runs (single suit, so every deal is winnable).</p>
          <h4>Tableau</h4>
          <ul>
            <li>Build columns down by one rank. A descending run moves together.</li>
            <li>Any card can go on a card one rank higher; empty columns take anything.</li>
            <li>Complete a full King→Ace run in a column and it clears automatically.</li>
          </ul>
          <h4>Stock</h4>
          <ul>
            <li>Stuck? Tap the stock (top-right) to deal one card to every column.</li>
            <li>You can’t deal while any column is empty.</li>
          </ul>
        </RulesModal>
      )}

      {won && !tut && !chooseOpen && <WinOverlay moves={moves} onNew={reset} />}
    </div>
  );
}
