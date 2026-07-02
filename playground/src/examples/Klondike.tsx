import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card, DragDropProvider, DropZone, DraggableCard, SUITS } from 'card-motion';
import { byIdMap, deal, draw, isWon, move, toFoundation, type Dest, type KlondikeState } from './klondikeRules';
import { CardBack, CARD_RATIO, Coach, ExampleHeader, RulesModal, useFlip, useMeasure, WinOverlay, type TutorialStep } from './shared';

interface Game {
  state: KlondikeState;
  byId: ReturnType<typeof byIdMap>;
}

function newGame(): Game {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
}

const destOf = (zone: string): Dest | null => {
  if (zone.startsWith('col-')) return { type: 'tableau', index: +zone.slice(4) };
  if (zone.startsWith('found-')) return { type: 'foundation', index: +zone.slice(6) };
  return null;
};

export default function Klondike() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cols = 7;
  const gap = boardW < 520 ? 5 : 9;
  const cardW = Math.min(104, Math.max(24, Math.floor((boardW - gap * (cols - 1)) / cols)));
  const cardH = Math.round(cardW * CARD_RATIO);
  const peekUp = Math.round(cardH * 0.32) - cardH;
  const peekDown = Math.round(cardH * 0.16) - cardH;

  useFlip(boardRef, tutStep, tut);

  const reset = () => {
    setGame(newGame());
    setMoves(0);
    setTut(false);
  };
  const applyState = (fn: (s: KlondikeState, b: Game['byId']) => KlondikeState | null) =>
    setGame((g) => ({ ...g, state: fn(g.state, g.byId) ?? g.state }));
  const onDraw = () => {
    setGame((g) => ({ ...g, state: draw(g.state) }));
    setMoves((m) => m + 1);
  };

  const tutorial = useMemo<{ initial: KlondikeState; steps: TutorialStep[] }>(() => {
    const initial: KlondikeState = { stock: [13], waste: [], tableau: [[19], [5], [37, 0]], foundations: [[], [], [], []], faceUp: [19, 5, 0] };
    return {
      initial,
      steps: [
        { text: 'Klondike (classic Solitaire): build the four foundations up from Ace to King, one per suit.' },
        { text: 'Tap the stock (top-left) to flip a card onto the waste.', apply: () => applyState((s) => draw(s)) },
        { text: 'That Ace goes up to its foundation. Double-tap sends a card home for you.', apply: () => applyState((s, b) => toFoundation(s, b, 13)) },
        { text: 'The tableau builds down in alternating colors — this black 6 goes on the red 7.', apply: () => applyState((s, b) => move(s, b, 5, { type: 'tableau', index: 0 })) },
        { text: 'Sending this Ace up turns over the face-down card beneath it.', apply: () => applyState((s, b) => toFoundation(s, b, 0)) },
        { text: 'Empty columns take only a King. Finish to deal a real game.' },
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

  const handleDrop = (cardId: number, toZone: string) => {
    const dest = destOf(toZone);
    if (!dest) return false;
    const next = move(state, byId, cardId, dest);
    if (!next) return false;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
    return true;
  };
  const accepts = (dest: Dest) => (cardId: number) => move(state, byId, cardId, dest) !== null;
  const autoFoundation = (cardId: number) => {
    const next = toFoundation(state, byId, cardId);
    if (!next) return;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
  };

  const face = (cid: number) => {
    const c = byId.get(cid)!;
    return (
      <div className="sol-cardwrap" onDoubleClick={() => autoFoundation(cid)}>
        <Card rank={c.rank} suit={c.suit} color={c.color} width={cardW} tilt={false} />
      </div>
    );
  };
  const draggable = (cid: number, zone: string, marginTop?: number): ReactNode => (
    <DraggableCard key={cid} id={cid} zone={zone} style={marginTop != null ? { marginTop } : undefined}>
      {face(cid)}
    </DraggableCard>
  );

  const boardStyle = { '--sol-gap': `${gap}px`, '--sol-cw': `${cardW}px`, '--sol-ch': `${cardH}px` } as CSSProperties;
  const gridCols = { gridTemplateColumns: `repeat(${cols}, ${cardW}px)` } as CSSProperties;
  const wasteTop = state.waste[state.waste.length - 1];
  const won = isWon(state);

  return (
    <div className="sol">
      <ExampleHeader title="Klondike" moves={moves} onNew={reset} onRules={() => setRulesOpen(true)} onTutorial={startTutorial} />

      <DragDropProvider onDrop={handleDrop}>
        <div className="sol-board" ref={boardRef} style={boardStyle}>
          <div className="sol-top" style={gridCols}>
            {/* Stock */}
            <div className="sol-stock" onClick={onDraw} role="button" aria-label="Draw from stock">
              {state.stock.length > 0 ? <CardBack width={cardW} /> : <div className="sol-stock-empty">↻</div>}
            </div>
            {/* Waste */}
            <div className="sol-cell" aria-label="Waste">
              {wasteTop != null ? draggable(wasteTop, 'waste') : <div className="sol-slot" />}
            </div>
            {/* Spacer */}
            <div aria-hidden />
            {/* Foundations */}
            {state.foundations.map((f, i) => (
              <DropZone key={`found-${i}`} id={`found-${i}`} className="sol-cell" ariaLabel={`${SUITS[i].glyph} foundation`} accepts={accepts({ type: 'foundation', index: i })}>
                {f.length === 0 ? (
                  <div className={`sol-slot${SUITS[i].color === 'red' ? ' red' : ''}`}>{SUITS[i].glyph}</div>
                ) : (
                  <div className="sol-cardwrap" data-flip-id={f[f.length - 1]}>
                    <Card rank={byId.get(f[f.length - 1])!.rank} suit={byId.get(f[f.length - 1])!.suit} color={byId.get(f[f.length - 1])!.color} width={cardW} tilt={false} />
                  </div>
                )}
              </DropZone>
            ))}
          </div>

          <div className="sol-tableau" style={gridCols}>
            {state.tableau.map((col, ci) => (
              <DropZone key={`col-${ci}`} id={`col-${ci}`} className="sol-col" ariaLabel={`Column ${ci + 1}`} accepts={accepts({ type: 'tableau', index: ci })}>
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
                  return draggable(cid, `col-${ci}`, marginTop);
                })}
              </DropZone>
            ))}
          </div>
        </div>
      </DragDropProvider>

      {tut && <Coach step={tutStep} total={tutorial.steps.length} text={tutorial.steps[tutStep].text} onNext={nextStep} onSkip={reset} />}

      {rulesOpen && !tut && (
        <RulesModal title="Klondike — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Build all four foundations up from Ace to King, one per suit.</p>
          <h4>Tableau</h4>
          <ul>
            <li>Columns build down in alternating colors (e.g. a red 6 on a black 7).</li>
            <li>Only a King (or a run headed by a King) can move to an empty column.</li>
            <li>Turn over a face-down card once it becomes the bottom of its column.</li>
          </ul>
          <h4>Stock</h4>
          <ul>
            <li>Tap the stock (top-left) to flip a card to the waste.</li>
            <li>When the stock is empty, tap it (↻) to recycle the waste.</li>
          </ul>
          <h4>Moving</h4>
          <ul>
            <li>Drag a card (or a valid run) onto its destination.</li>
            <li>Double-tap a card to send it straight to its foundation.</li>
          </ul>
        </RulesModal>
      )}

      {won && !tut && <WinOverlay moves={moves} onNew={reset} />}
    </div>
  );
}
