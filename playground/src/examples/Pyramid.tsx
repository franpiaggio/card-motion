import { useMemo, useState, type CSSProperties } from 'react';
import { Card } from 'card-motion';
import { byIdMap, deal, draw, isFreeId, isStuck, isWon, remove, rowOf, slotIndex, type PyramidState } from './pyramidRules';
import { CardBack, CARD_RATIO, Coach, ExampleHeader, RulesModal, useMeasure, WinOverlay, type TutorialStep } from './shared';

interface Game {
  state: PyramidState;
  byId: ReturnType<typeof byIdMap>;
}
const newGame = (): Game => {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
};

export default function Pyramid() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [tut, setTut] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cardW = Math.min(84, Math.max(30, Math.floor((boardW - 12) / 7))); // 7 base cards
  const cardH = Math.round(cardW * CARD_RATIO);
  const vStep = Math.round(cardH * 0.44);
  const pyrW = cardW * 7;
  const pyrH = vStep * 6 + cardH;

  const reset = () => {
    setGame(newGame());
    setMoves(0);
    setSelected(null);
    setTut(false);
  };
  const applyState = (fn: (s: PyramidState, b: Game['byId']) => PyramidState | null) => setGame((g) => ({ ...g, state: fn(g.state, g.byId) ?? g.state }));

  const commit = (next: PyramidState | null) => {
    if (!next) return false;
    setGame((g) => ({ ...g, state: next }));
    setMoves((m) => m + 1);
    setSelected(null);
    return true;
  };
  const tapCard = (id: number) => {
    if (tut) return; // tutorial drives itself
    if (!isFreeId(state, id)) return;
    if (byId.get(id)!.rank === 'K') {
      commit(remove(state, byId, [id]));
      return;
    }
    if (selected === null) {
      setSelected(id);
    } else if (selected === id) {
      setSelected(null);
    } else if (!commit(remove(state, byId, [selected, id]))) {
      setSelected(id);
    }
  };
  const onDraw = () => {
    if (tut) return;
    applyState((s) => draw(s));
    setMoves((m) => m + 1);
    setSelected(null);
  };

  const tutorial = useMemo<{ initial: PyramidState; steps: TutorialStep[] }>(() => {
    const t = Array<number | null>(28).fill(null);
    t[25] = 4; // 5♠
    t[26] = 7; // 8♠
    t[27] = 12; // K♠
    const initial: PyramidState = { tableau: t, stock: [5], waste: [] };
    return {
      initial,
      steps: [
        { text: 'Pyramid: clear the triangle by taking cards that add up to 13. A card is free when nothing rests on it.' },
        { text: 'A King is worth 13, so it leaves on its own.', apply: () => applyState((s, b) => remove(s, b, [12])) },
        { text: 'Two free cards that sum to 13 go together — a 5 and an 8.', apply: () => applyState((s, b) => remove(s, b, [4, 7])) },
        { text: 'Out of matches? Tap the stock to turn up a card (it recycles when empty). Finish to play a real game.', apply: () => applyState((s) => draw(s)) },
        { text: "That's Pyramid. Clear the whole triangle to win. Finish to deal a real game." },
      ],
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTutorial = () => {
    setGame((g) => ({ ...g, state: tutorial.initial }));
    setMoves(0);
    setSelected(null);
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
      <ExampleHeader title="Pyramid" moves={moves} onNew={reset} onRules={() => setRulesOpen(true)} onTutorial={startTutorial} />

      <div className="sol-board" ref={boardRef} style={boardStyle}>
        <div className="sol-pyramid" style={{ width: pyrW, height: pyrH }}>
          {state.tableau.map((id, slot) => {
            if (id == null) return null;
            const r = rowOf(slot);
            const i = slot - slotIndex(r, 0);
            const free = isFreeId(state, id);
            const c = byId.get(id)!;
            return (
              <div
                key={id}
                className={`sol-pyr-card${free ? ' free' : ' covered'}${selected === id ? ' selected' : ''}`}
                style={{ left: (3 + i - r / 2) * cardW, top: r * vStep }}
                onClick={() => tapCard(id)}
              >
                <Card rank={c.rank} suit={c.suit} color={c.color} width={cardW} tilt={false} />
              </div>
            );
          })}
        </div>

        <div className="sol-pyramid-foot">
          <div className="sol-stock" onClick={onDraw} role="button" aria-label="Draw from stock">
            {state.stock.length > 0 ? <CardBack width={cardW} /> : <div className="sol-stock-empty" style={{ width: cardW, height: cardH }}>↻</div>}
          </div>
          <div className="sol-cell" style={{ width: cardW }}>
            {wasteTop != null ? (
              <div className={`sol-pyr-card free static${selected === wasteTop ? ' selected' : ''}`} onClick={() => tapCard(wasteTop)}>
                <Card rank={byId.get(wasteTop)!.rank} suit={byId.get(wasteTop)!.suit} color={byId.get(wasteTop)!.color} width={cardW} tilt={false} />
              </div>
            ) : (
              <div className="sol-slot" />
            )}
          </div>
        </div>
      </div>

      {tut && <Coach step={tutStep} total={tutorial.steps.length} text={tutorial.steps[tutStep].text} onNext={nextStep} onSkip={reset} />}

      {rulesOpen && !tut && (
        <RulesModal title="Pyramid — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Remove the whole 28-card pyramid.</p>
          <h4>Play</h4>
          <ul>
            <li>A card is free when the two cards resting on it are gone.</li>
            <li>Tap two free cards that add up to 13 to remove them (Ace = 1 … Queen = 12).</li>
            <li>A King is 13 — tap it to remove it on its own.</li>
          </ul>
          <h4>Stock</h4>
          <ul>
            <li>Tap the stock to turn a card to the waste, which can also pair.</li>
            <li>When the stock empties, tapping it (↻) recycles the waste.</li>
          </ul>
        </RulesModal>
      )}

      {won && !tut && <WinOverlay moves={moves} onNew={reset} />}
      {lost && !tut && <WinOverlay moves={moves} onNew={reset} lost />}
    </div>
  );
}
