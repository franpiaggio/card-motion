import { useMemo, useState, type CSSProperties } from 'react';
import { Card, DragDropProvider, DropZone, DraggableCard } from 'card-motion';
import { byIdMap, deal, dealRow, isWon, move, type Dest, type SpiderState } from './spiderRules';
import { CardBack, CARD_RATIO, Coach, ExampleHeader, RulesModal, useFlip, useMeasure, WinOverlay, type TutorialStep } from './shared';

interface Game {
  state: SpiderState;
  byId: ReturnType<typeof byIdMap>;
}
const newGame = (): Game => {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
};

export default function Spider() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cols = 10;
  const gap = boardW < 620 ? 3 : 7;
  const cardW = Math.min(92, Math.max(20, Math.floor((boardW - gap * (cols - 1)) / cols)));
  const cardH = Math.round(cardW * CARD_RATIO);
  const peekUp = Math.round(cardH * 0.26) - cardH;
  const peekDown = Math.round(cardH * 0.13) - cardH;

  useFlip(boardRef, tutStep, tut);

  const reset = () => {
    setGame(newGame());
    setMoves(0);
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
  const won = isWon(state);

  return (
    <div className="sol">
      <ExampleHeader title="Spider" moves={moves} status={`${state.completed}/8 done`} onNew={reset} onRules={() => setRulesOpen(true)} onTutorial={startTutorial} />

      <DragDropProvider onDrop={handleDrop}>
        <div className="sol-board" ref={boardRef} style={boardStyle}>
          <div className="sol-spider-top">
            <span className="sol-spider-count">{state.completed}/8 runs</span>
            <button type="button" className="sol-stock" onClick={onDealRow} disabled={dealsLeft === 0} aria-label="Deal a row">
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
                    <DraggableCard key={cid} id={cid} zone={`col-${ci}`} style={marginTop != null ? { marginTop } : undefined}>
                      {face(cid)}
                    </DraggableCard>
                  );
                })}
              </DropZone>
            ))}
          </div>
        </div>
      </DragDropProvider>

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

      {won && !tut && <WinOverlay moves={moves} onNew={reset} />}
    </div>
  );
}
