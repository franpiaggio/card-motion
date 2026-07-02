import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card, DragDropProvider, DropZone, DraggableCard } from 'card-motion';
import { byIdMap, canPlay, deal, draw, isStuck, isWon, play, type GolfState } from './golfRules';
import { CARD_RATIO, Coach, DifficultyPicker, ExampleHeader, RulesModal, useFlip, useMeasure, WinOverlay, type DiffOption, type TutorialStep } from './shared';

interface Game {
  state: GolfState;
  byId: ReturnType<typeof byIdMap>;
}
const newGame = (): Game => {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
};

const DIFFS: ReadonlyArray<DiffOption> = [
  { key: 'wrap', label: 'Simplified', note: 'Ranks wrap — an Ace plays on a King and back, so chains rarely stall.' },
  { key: 'nowrap', label: 'Normal', note: 'No wrap: a King and an Ace do not connect.' },
];

export default function Golf() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cols = 7;
  const gap = boardW < 520 ? 5 : 9;
  const cardW = Math.min(104, Math.max(24, Math.floor((boardW - gap * (cols - 1)) / cols)));
  const cardH = Math.round(cardW * CARD_RATIO);
  const marginUp = Math.round(cardH * 0.34) - cardH;

  useFlip(boardRef, tutStep, tut);

  const reset = () => {
    setChooseOpen(true);
    setTut(false);
  };
  const pick = (key: string) => {
    setWrap(key === 'wrap');
    setGame(newGame());
    setMoves(0);
    setChooseOpen(false);
    setTut(false);
  };
  const applyState = (fn: (s: GolfState, b: Game['byId']) => GolfState | null) =>
    setGame((g) => ({ ...g, state: fn(g.state, g.byId) ?? g.state }));

  const onDraw = () => {
    applyState((s) => draw(s));
    setMoves((m) => m + 1);
  };
  const handleDrop = (cardId: number, toZone: string) => {
    if (toZone !== 'waste') return false;
    const next = play(state, byId, cardId, wrap);
    if (!next) return false;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
    return true;
  };
  const autoPlay = (cardId: number) => {
    const next = play(state, byId, cardId, wrap);
    if (!next) return;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
  };

  // ── Tutorial: a fixed, scripted "ideal path" ───────────────────────────────
  const tutorial = useMemo<{ initial: GolfState; steps: TutorialStep[] }>(() => {
    const initial: GolfState = { tableau: [[18], [4], [33, 31]], stock: [45], waste: [6] };
    return {
      initial,
      steps: [
        { text: "Golf: empty every column. Play a column's bottom card onto the waste when it's exactly one rank higher or lower — suit doesn't matter." },
        { text: 'The waste shows a 7. This 6 is one lower, so it plays.', apply: () => applyState((s, b) => play(s, b, 18)) },
        { text: 'Now a 5 plays on the 6 — you can climb up or down.', apply: () => applyState((s, b) => play(s, b, 4)) },
        { text: 'A 6 plays on the 5, freeing the 8 underneath.', apply: () => applyState((s, b) => play(s, b, 31)) },
        { text: "The 8 can't sit on a 6. Tap the stock (top-left) for a fresh card.", apply: () => applyState((s) => draw(s)) },
        { text: 'The stock gave a 7 — now the 8 plays on it and the board is clear.', apply: () => applyState((s, b) => play(s, b, 33)) },
        { text: 'That’s Golf. Clear the columns before the stock runs out. Finish to deal a real game.' },
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
      <div className="sol-cardwrap" onDoubleClick={() => autoPlay(cid)}>
        <Card rank={c.rank} suit={c.suit} color={c.color} width={cardW} tilt={false} />
      </div>
    );
  };
  const draggable = (cid: number, stacked = false): ReactNode => (
    <DraggableCard key={cid} id={cid} zone="tableau" style={stacked ? { marginTop: marginUp } : undefined}>
      {face(cid)}
    </DraggableCard>
  );

  const boardStyle = { '--sol-gap': `${gap}px`, '--sol-cw': `${cardW}px`, '--sol-ch': `${cardH}px` } as CSSProperties;
  const tableauCols = { gridTemplateColumns: `repeat(${state.tableau.length}, ${cardW}px)` } as CSSProperties;
  const wasteTop = state.waste[state.waste.length - 1];
  const won = isWon(state);
  const lost = isStuck(state, byId, wrap);

  return (
    <div className="sol">
      <ExampleHeader title="Golf" moves={moves} onNew={reset} onRules={() => setRulesOpen(true)} onTutorial={startTutorial} />

      <DragDropProvider onDrop={handleDrop}>
        <div className="sol-board" ref={boardRef} style={boardStyle}>
          <div className="sol-top" style={{ gridTemplateColumns: `repeat(2, ${cardW}px)` }}>
            <div className="sol-stock" onClick={onDraw} role="button" aria-label="Draw from stock">
              {state.stock.length > 0 ? <div className="sol-back" style={{ width: cardW, height: cardH }} /> : <div className="sol-stock-empty">✕</div>}
            </div>
            <DropZone id="waste" className="sol-cell" ariaLabel="Waste" accepts={(id) => canPlay(state, byId, id, wrap)}>
              {wasteTop != null && (
                <div className="sol-cardwrap" data-flip-id={wasteTop}>
                  <Card rank={byId.get(wasteTop)!.rank} suit={byId.get(wasteTop)!.suit} color={byId.get(wasteTop)!.color} width={cardW} tilt={false} />
                </div>
              )}
            </DropZone>
          </div>

          <div className="sol-tableau" style={tableauCols}>
            {state.tableau.map((col, ci) => (
              <div key={ci} className="sol-col-plain">
                {col.length === 0 && <div className="sol-slot" />}
                {col.map((cid, idx) => (idx === col.length - 1 ? draggable(cid, idx > 0) : (
                  <div key={cid} className="sol-cardwrap" style={idx > 0 ? { marginTop: marginUp } : undefined} data-flip-id={cid}>
                    <Card rank={byId.get(cid)!.rank} suit={byId.get(cid)!.suit} color={byId.get(cid)!.color} width={cardW} tilt={false} />
                  </div>
                )))}
              </div>
            ))}
          </div>
        </div>
      </DragDropProvider>

      {chooseOpen && !tut && <DifficultyPicker title="Golf — choose a difficulty" options={DIFFS} onPick={pick} />}

      {tut && (
        <Coach
          step={tutStep}
          total={tutorial.steps.length}
          text={tutorial.steps[tutStep].text}
          onNext={nextStep}
          onSkip={reset}
        />
      )}

      {rulesOpen && !tut && (
        <RulesModal title="Golf — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Clear all seven columns.</p>
          <h4>Play</h4>
          <ul>
            <li>Drag a column’s bottom card onto the waste when it’s one rank above or below the waste’s top card.</li>
            <li>Suit doesn’t matter. Aces are low — a King and an Ace don’t connect.</li>
            <li>Double-tap a playable card to send it automatically.</li>
          </ul>
          <h4>Stock</h4>
          <ul>
            <li>Stuck? Tap the stock (top-left) to flip a fresh card to the waste.</li>
            <li>When the stock is empty and nothing plays, the deal is over.</li>
          </ul>
        </RulesModal>
      )}

      {won && !tut && !chooseOpen && <WinOverlay moves={moves} onNew={reset} />}
      {lost && !tut && !chooseOpen && <WinOverlay moves={moves} onNew={reset} lost />}
    </div>
  );
}
