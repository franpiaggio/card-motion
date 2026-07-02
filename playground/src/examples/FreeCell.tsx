import { useState, type CSSProperties, type ReactNode } from 'react';
import { Card, DragDropProvider, DropZone, DraggableCard, SUITS } from 'card-motion';
import { byIdMap, deal, isWon, move, toFoundation, type Dest, type FreeCellState } from './freecellRules';
import { CARD_RATIO, ExampleHeader, RulesModal, useMeasure, WinOverlay } from './shared';

interface Game {
  state: FreeCellState;
  byId: ReturnType<typeof byIdMap>;
}

function newGame(): Game {
  const d = deal();
  return { state: d.state, byId: byIdMap(d.deck) };
}

const destOf = (zone: string): Dest | null => {
  if (zone.startsWith('col-')) return { type: 'tableau', index: +zone.slice(4) };
  if (zone.startsWith('free-')) return { type: 'free', index: +zone.slice(5) };
  if (zone.startsWith('found-')) return { type: 'foundation', index: +zone.slice(6) };
  return null;
};

export default function FreeCell() {
  const [game, setGame] = useState<Game>(newGame);
  const [moves, setMoves] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [boardRef, boardW] = useMeasure<HTMLDivElement>();

  const { state, byId } = game;
  const cols = 8;
  const gap = boardW < 560 ? 5 : 9;
  // Fit 8 columns to the width, but cap the size so cards aren't huge on desktop.
  const cardW = Math.min(104, Math.max(22, Math.floor((boardW - gap * (cols - 1)) / cols)));
  const cardH = Math.round(cardW * CARD_RATIO);
  const marginUp = Math.round(cardH * 0.3) - cardH; // show ~30% of each stacked card

  const reset = () => {
    setGame(newGame());
    setMoves(0);
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
  const draggable = (cid: number, zone: string, stacked = false): ReactNode => (
    <DraggableCard key={cid} id={cid} zone={zone} style={stacked ? { marginTop: marginUp } : undefined}>
      {face(cid)}
    </DraggableCard>
  );

  const boardStyle = {
    '--sol-gap': `${gap}px`,
    '--sol-cw': `${cardW}px`,
    '--sol-ch': `${cardH}px`,
  } as CSSProperties;
  const gridCols = { gridTemplateColumns: `repeat(${cols}, ${cardW}px)` } as CSSProperties;
  const won = isWon(state);

  return (
    <div className="sol">
      <ExampleHeader title="FreeCell" moves={moves} onNew={reset} onRules={() => setRulesOpen(true)} />

      <DragDropProvider onDrop={handleDrop}>
        <div className="sol-board" ref={boardRef} style={boardStyle}>
          <div className="sol-top" style={gridCols}>
            {state.free.map((cid, i) => (
              <DropZone key={`free-${i}`} id={`free-${i}`} className="sol-cell" ariaLabel={`Free cell ${i + 1}`} accepts={accepts({ type: 'free', index: i })}>
                {cid == null ? <div className="sol-slot" /> : draggable(cid, `free-${i}`)}
              </DropZone>
            ))}
            {state.foundations.map((f, i) => (
              <DropZone key={`found-${i}`} id={`found-${i}`} className="sol-cell" ariaLabel={`${SUITS[i].glyph} foundation`} accepts={accepts({ type: 'foundation', index: i })}>
                {f.length === 0 ? (
                  <div className={`sol-slot${SUITS[i].color === 'red' ? ' red' : ''}`}>{SUITS[i].glyph}</div>
                ) : (
                  <div className="sol-cardwrap">
                    <Card
                      rank={byId.get(f[f.length - 1])!.rank}
                      suit={byId.get(f[f.length - 1])!.suit}
                      color={byId.get(f[f.length - 1])!.color}
                      width={cardW}
                      tilt={false}
                    />
                  </div>
                )}
              </DropZone>
            ))}
          </div>

          <div className="sol-tableau" style={gridCols}>
            {state.tableau.map((col, ci) => (
              <DropZone key={`col-${ci}`} id={`col-${ci}`} className="sol-col" ariaLabel={`Column ${ci + 1}`} accepts={accepts({ type: 'tableau', index: ci })}>
                {col.length === 0 && <div className="sol-slot" />}
                {col.map((cid, idx) => draggable(cid, `col-${ci}`, idx > 0))}
              </DropZone>
            ))}
          </div>
        </div>
      </DragDropProvider>

      {rulesOpen && (
        <RulesModal title="FreeCell — how to play" onClose={() => setRulesOpen(false)}>
          <h4>Goal</h4>
          <p>Build all four foundations up from Ace to King, one per suit.</p>
          <h4>Tableau</h4>
          <ul>
            <li>Columns build down in alternating colors (e.g. a red 6 on a black 7).</li>
            <li>An empty column accepts any card.</li>
          </ul>
          <h4>Free cells</h4>
          <ul>
            <li>Four slots up top; each holds a single card as temporary storage.</li>
            <li>You can move a run of several cards only if enough free cells and empty columns are open.</li>
          </ul>
          <h4>Moving</h4>
          <ul>
            <li>Drag a card (or a valid run) onto its destination.</li>
            <li>Double-tap a card to send it straight to its foundation.</li>
          </ul>
        </RulesModal>
      )}

      {won && <WinOverlay moves={moves} onNew={reset} />}
    </div>
  );
}
