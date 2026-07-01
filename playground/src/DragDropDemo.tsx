import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Card, DragDropProvider, DraggableCard, DropZone, buildDeck, shuffleInPlace, type CardData } from 'card-motion';

const PLAY_ZONES = ['zone-1', 'zone-2', 'zone-3'] as const;
type ZoneId = 'hand' | (typeof PLAY_ZONES)[number];

interface Board {
  zones: Record<ZoneId, CardData[]>;
  foilId: number;
}

function deal(): Board {
  const hand = shuffleInPlace(buildDeck()).slice(0, 7);
  return {
    zones: { hand, 'zone-1': [], 'zone-2': [], 'zone-3': [] },
    foilId: hand[0].id, // one "special" foil card in the hand
  };
}

export default function DragDropDemo() {
  const [board, setBoard] = useState<Board>(deal);
  const [dealNonce, setDealNonce] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const { zones, foilId } = board;

  // Animate the freshly-dealt hand in from below, staggered — like a deal.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = root.querySelectorAll('.dnd-hand .cm-draggable');
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 90, opacity: 0, scale: 0.7 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.05, overwrite: 'auto', clearProps: 'transform,opacity' },
    );
  }, [dealNonce]);

  const reDeal = () => {
    setBoard(deal());
    setDealNonce((n) => n + 1);
  };

  // We own the state: on every accepted drop, move the card between zones.
  const handleDrop = (cardId: number, toZone: string, fromZone: string | null) => {
    if (!fromZone) return false;
    setBoard((prev) => {
      const from = fromZone as ZoneId;
      const to = toZone as ZoneId;
      const card = prev.zones[from].find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        zones: {
          ...prev.zones,
          [from]: prev.zones[from].filter((c) => c.id !== cardId),
          [to]: [...prev.zones[to], card],
        },
      };
    });
    return true;
  };

  const renderCard = (c: CardData, zone: ZoneId) => (
    <DraggableCard key={c.id} id={c.id} zone={zone}>
      <Card rank={c.rank} suit={c.suit} color={c.color} width={88} foil={c.id === foilId} />
    </DraggableCard>
  );

  return (
    <div className="dnd" ref={rootRef}>
      <header className="dnd-head">
        <h1>Drag &amp; drop zones</h1>
        <p>Drag the hand cards into any zone (and back). You manage the state; the library provides the mechanics and the animation.</p>
        <button type="button" onClick={reDeal}>
          Deal again
        </button>
      </header>

      <DragDropProvider onDrop={handleDrop}>
        <div className="dnd-zones">
          {PLAY_ZONES.map((z, i) => (
            <DropZone key={z} id={z} label={`Zone ${i + 1}`} className="dnd-zone">
              {zones[z].map((c) => renderCard(c, z))}
              {zones[z].length === 0 && <span className="dnd-empty">Drop cards here</span>}
            </DropZone>
          ))}
        </div>

        <DropZone id="hand" ariaLabel="Your hand" className="dnd-hand">
          {zones.hand.map((c) => renderCard(c, 'hand'))}
        </DropZone>
      </DragDropProvider>
    </div>
  );
}
