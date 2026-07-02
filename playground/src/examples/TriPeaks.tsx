import { useMemo, useState, type CSSProperties } from 'react';
import { Card } from 'card-motion';
import { byIdMap, canPlay, deal, draw, isFreeSlot, isStuck, isWon, play, SLOTS, type TriPeaksState } from './tripeaksRules';
import { CardBack, CARD_RATIO, Coach, ExampleHeader, RulesModal, useFlip, useMeasure, WinOverlay, type TutorialStep } from './shared';

interface Game {
  state: TriPeaksState;
  byId: ReturnType<typeof byIdMap>;
}
const newGame = (): Game => {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
};

export default function TriPeaks() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cardW = Math.min(84, Math.max(28, Math.floor((boardW - 12) / 10))); // base spans 10 units
  const cardH = Math.round(cardW * CARD_RATIO);
  const vStep = Math.round(cardH * 0.42);
  const peaksW = cardW * 10;
  const peaksH = vStep * 3 + cardH;

  useFlip(boardRef, tutStep, tut);

  const reset = () => {
    setGame(newGame());
    setMoves(0);
    setTut(false);
  };
  const applyState = (fn: (s: TriPeaksState, b: Game['byId']) => TriPeaksState | null) => setGame((g) => ({ ...g, state: fn(g.state, g.byId) ?? g.state }));

  const tapCard = (id: number) => {
    if (tut) return;
    const next = play(state, byId, id);
    if (!next) return;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
  };
  const onDraw = () => {
    if (tut) return;
    applyState((s) => draw(s));
    setMoves((m) => m + 1);
  };

  const tutorial = useMemo<{ initial: TriPeaksState; steps: TutorialStep[] }>(() => {
    const t = Array<number | null>(28).fill(null);
    t[18] = 6; // 7♠
    t[19] = 7; // 8♠
    t[20] = 8; // 9♠
    const initial: TriPeaksState = { tableau: t, stock: [20], waste: [5] }; // waste 6♠
    return {
      initial,
      steps: [
        { text: 'Tri Peaks: clear all 28 cards. Take a free card (nothing resting on it) one rank above or below the waste.' },
        { text: 'The waste shows a 6, so this 7 plays.', apply: () => applyState((s, b) => play(s, b, 6)) },
        { text: 'Keep the chain going — an 8 on the 7.', apply: () => applyState((s, b) => play(s, b, 7)) },
        { text: 'And a 9 on the 8. Long chains score big.', apply: () => applyState((s, b) => play(s, b, 8)) },
        { text: 'Aces and Kings wrap around. Out of moves? Draw from the stock. Finish to play a real game.', apply: () => applyState((s) => draw(s)) },
        { text: 'That’s Tri Peaks — clear every peak to win. Finish to deal a real game.' },
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

  const boardStyle = { '--sol-cw': `${cardW}px`, '--sol-ch': `${cardH}px` } as CSSProperties;
  const wasteTop = state.waste[state.waste.length - 1];
  const won = isWon(state);
  const lost = isStuck(state, byId);

  return (
    <div className="sol">
      <ExampleHeader title="Tri Peaks" moves={moves} onNew={reset} onRules={() => setRulesOpen(true)} onTutorial={startTutorial} />

      <div className="sol-board" ref={boardRef} style={boardStyle}>
        <div className="sol-pyramid" style={{ width: peaksW, height: peaksH }}>
          {state.tableau.map((id, slot) => {
            if (id == null) return null;
            const free = isFreeSlot(state, slot);
            const playable = free && canPlay(state, byId, id);
            const c = byId.get(id)!;
            return (
              <div
                key={id}
                data-flip-id={id}
                className={`sol-pyr-card${free ? ' free' : ' covered'}${playable ? ' playable' : ''}`}
                style={{ left: SLOTS[slot].x * cardW, top: SLOTS[slot].row * vStep }}
                onClick={() => tapCard(id)}
              >
                <Card rank={c.rank} suit={c.suit} color={c.color} width={cardW} tilt={false} />
              </div>
            );
          })}
        </div>

        <div className="sol-pyramid-foot">
          <div className="sol-stock" onClick={onDraw} role="button" aria-label="Draw from stock">
            {state.stock.length > 0 ? <CardBack width={cardW} /> : <div className="sol-stock-empty" style={{ width: cardW, height: cardH }}>✕</div>}
          </div>
          {wasteTop != null && (
            <div className="sol-cardwrap" data-flip-id={wasteTop}>
              <Card rank={byId.get(wasteTop)!.rank} suit={byId.get(wasteTop)!.suit} color={byId.get(wasteTop)!.color} width={cardW} tilt={false} />
            </div>
          )}
        </div>
      </div>

      {tut && <Coach step={tutStep} total={tutorial.steps.length} text={tutorial.steps[tutStep].text} onNext={nextStep} onSkip={reset} />}

      {rulesOpen && !tut && (
        <RulesModal title="Tri Peaks — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Clear all 28 cards from the three peaks.</p>
          <h4>Play</h4>
          <ul>
            <li>A card is free when nothing rests on it (highlighted).</li>
            <li>Tap a free card one rank above or below the waste’s top card.</li>
            <li>Ranks wrap: an Ace plays on a King and a King on an Ace.</li>
          </ul>
          <h4>Stock</h4>
          <ul>
            <li>Out of moves? Tap the stock to turn a fresh card to the waste.</li>
            <li>When the stock is empty and nothing plays, the deal is over.</li>
          </ul>
        </RulesModal>
      )}

      {won && !tut && <WinOverlay moves={moves} onNew={reset} />}
      {lost && !tut && <WinOverlay moves={moves} onNew={reset} lost />}
    </div>
  );
}
