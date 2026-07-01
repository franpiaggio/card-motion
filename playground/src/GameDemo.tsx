import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  useCardPiles,
  stackLayout,
  rowLayout,
  type PileLayoutFn,
} from 'card-motion';
import gsap from 'gsap';
import { evaluate, chipValue } from './poker';

// ── Rules (basic poker-hand scoring, no jokers) ───────────────────────────
const HAND_SIZE = 8; // cards held
const MAX_SELECT = 5; // cards you can play at once
const HANDS = 4; // plays allowed to reach the target
const DISCARDS = 3; // discards allowed
const TARGET = 300; // score to beat

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A wide, gentle fan: cards barely overlap so lifting one (on select/hover)
// never buries its neighbour, and the neighbour keeps its rank corner visible.
const handFan: PileLayoutFn = (i, n, { anchor, width }) => {
  const off = i - (n - 1) / 2;
  const spacingX = n > 1 ? Math.min(94, (width * 0.7) / n) : 0;
  return {
    x: anchor.x + off * spacingX,
    y: anchor.y + off * off * 2.2, // gentle dip toward the edges
    rotation: off * 4,
    scale: 1,
  };
};

type PileId = 'deck' | 'hand' | 'played' | 'discard';
type Phase = 'start' | 'playing' | 'busy' | 'won' | 'lost';
interface Tally { name: string; chips: number; mult: number }

export default function GameDemo() {
  const g = useCardPiles<PileId>({
    piles: {
      // Board row up top: deck (left) · play area (center) · discard (right).
      // Hand sits well below so the fan never crowds the piles.
      deck: { anchor: (s) => ({ x: s.width * 0.12, y: s.height * 0.32 }), layout: stackLayout },
      played: { anchor: (s) => ({ x: s.width * 0.5, y: s.height * 0.42 }), layout: rowLayout },
      discard: { anchor: (s) => ({ x: s.width * 0.88, y: s.height * 0.32 }), layout: stackLayout },
      hand: { anchor: (s) => ({ x: s.width * 0.5, y: s.height * 0.72 }), layout: handFan },
    },
  });
  const { cards, stageRef, registerCard, piles, selected, toggle, move, draw, gather } = g;

  const nodes = useRef(new Map<number, HTMLElement>());
  const setNode = useCallback(
    (id: number) => (n: HTMLElement | null) => {
      registerCard(id, n);
      if (n) nodes.current.set(id, n);
      else nodes.current.delete(id);
    },
    [registerCard],
  );
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const [score, setScore] = useState(0);
  const [shown, setShown] = useState(0);
  const [handsLeft, setHandsLeft] = useState(HANDS);
  const [discardsLeft, setDiscardsLeft] = useState(DISCARDS);
  const [phase, setPhase] = useState<Phase>('start');
  const [tally, setTally] = useState<Tally | null>(null);

  // Guard async sequences against a unit that unmounts mid-flight. Must set
  // `true` in the body too — under StrictMode the effect is cleaned up and
  // re-run on mount, and without this the ref would stay `false`.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const [stageW, setStageW] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, [stageRef]);
  const cardW = stageW > 0 ? Math.min(88, Math.max(46, stageW / 9)) : 88;
  const cardH = cardW * (134 / 96); // matches the Card component's aspect ratio

  const preview = useMemo(() => {
    if (selected.size === 0) return null;
    return evaluate([...selected].map((id) => cardById.get(id)!).filter(Boolean));
  }, [selected, cardById]);

  const onCardClick = (id: number) => {
    if (phase !== 'playing') return;
    if (!piles.hand.includes(id)) return; // only cards in your hand are selectable
    if (!selected.has(id) && selected.size >= MAX_SELECT) return;
    toggle(id);
  };

  const shake = (id: number) => {
    const el = nodes.current.get(id);
    if (!el) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 1.22, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut', overwrite: 'auto' });
  };

  const countScoreTo = (target: number) => {
    const obj = { v: shown };
    gsap.to(obj, { v: target, duration: 0.5, ease: 'power2.out', onUpdate: () => alive.current && setShown(Math.round(obj.v)) });
  };

  const startRound = async () => {
    setPhase('busy');
    setScore(0);
    setShown(0);
    setHandsLeft(HANDS);
    setDiscardsLeft(DISCARDS);
    setTally(null);
    gather('deck', { shuffle: true }); // pull every pile back to the deck + riffle
    await wait(1700);
    if (!alive.current) return;
    draw('deck', 'hand', HAND_SIZE);
    await wait(1100);
    if (!alive.current) return;
    setPhase('playing');
  };

  const playHand = async () => {
    if (phase !== 'playing' || selected.size === 0) return;
    const chosenIds = piles.hand.filter((id) => selected.has(id));
    const res = evaluate(chosenIds.map((id) => cardById.get(id)!));
    setPhase('busy');
    move(chosenIds, 'played'); // fly up to the play area
    await wait(700);
    if (!alive.current) return;

    // Count up: base chips, then each scoring card adds its chips with a shake.
    let chips = res.baseChips;
    setTally({ name: res.type, chips, mult: res.mult });
    await wait(300);
    for (const id of res.scoringOrder) {
      if (!alive.current) return;
      chips += chipValue(cardById.get(id)!);
      setTally({ name: res.type, chips, mult: res.mult });
      shake(id);
      await wait(320);
    }
    await wait(350);
    if (!alive.current) return;

    const nextScore = score + res.total;
    setScore(nextScore);
    countScoreTo(nextScore);
    setTally(null);

    move(chosenIds, 'discard'); // played cards are spent → to the discard pile
    await wait(650);
    if (!alive.current) return;
    draw('deck', 'hand', chosenIds.length); // refill only what left (deck depletes)
    await wait(1100);
    if (!alive.current) return;

    const nHands = handsLeft - 1;
    setHandsLeft(nHands);
    if (nextScore >= TARGET) setPhase('won');
    else if (nHands <= 0) setPhase('lost');
    else setPhase('playing');
  };

  const discardHand = async () => {
    if (phase !== 'playing' || discardsLeft <= 0 || selected.size === 0) return;
    const chosenIds = piles.hand.filter((id) => selected.has(id));
    setPhase('busy');
    move(chosenIds, 'discard'); // straight to the discard pile — not redrawn
    await wait(650);
    if (!alive.current) return;
    draw('deck', 'hand', chosenIds.length);
    await wait(1100);
    if (!alive.current) return;
    setDiscardsLeft((d) => d - 1);
    setPhase('playing');
  };

  const pct = Math.min(100, Math.round((shown / TARGET) * 100));

  return (
    <div className="game">
      <header className="game-hud">
        <div className="game-scorebox">
          <span className="game-label">Score</span>
          <div className="game-scoreline">
            <strong key={shown} className="game-score">{shown}</strong>
            <span className="game-target">/ {TARGET}</span>
          </div>
          <div className="game-bar"><div className="game-bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="game-counters">
          <div className="game-chip game-hands"><span>{handsLeft}</span>hands</div>
          <div className="game-chip game-discards"><span>{discardsLeft}</span>discards</div>
        </div>
      </header>

      <div className="game-readout">
        {phase === 'won' && <div className="game-banner win">You win! 🎉</div>}
        {phase === 'lost' && <div className="game-banner lose">Out of hands — {shown} / {TARGET}</div>}
        {tally && (
          <div className="game-tally">
            <b>{tally.name}</b>
            <span className="game-chips">{tally.chips}</span>
            <span className="game-x">×</span>
            <span className="game-mult">{tally.mult}</span>
          </div>
        )}
        {!tally && phase === 'playing' && preview && (
          <div className="game-preview"><b>{preview.type}</b><span className="game-math">{preview.total} pts</span></div>
        )}
        {!tally && phase === 'playing' && !preview && (
          <div className="game-preview muted">Pick up to {MAX_SELECT} cards and play your hand</div>
        )}
        {!tally && phase === 'start' && <div className="game-preview muted">Reach {TARGET} points in {HANDS} hands</div>}
        {phase === 'busy' && !tally && <div className="game-preview muted">…</div>}
      </div>

      <div className="game-stagewrap">
        {/* Empty-slot frames so the deck & discard read as fixed board positions,
            even once the deck depletes. Sized/placed to match the pile anchors. */}
        <div className="game-slot game-slot-deck" style={{ width: cardW, height: cardH }} />
        <div className="game-slot game-slot-discard" style={{ width: cardW, height: cardH }} />
        <div className="cm-table">
          <div className="cm-stage" ref={stageRef}>
            {cards.map((c) => {
              const inHand = piles.hand.includes(c.id);
              const inPlayed = piles.played.includes(c.id);
              return (
                <Card
                  key={c.id}
                  ref={setNode(c.id)}
                  rank={c.rank}
                  suit={c.suit}
                  color={c.color}
                  width={cardW}
                  tilt={false}
                  selected={selected.has(c.id)}
                  interactive={phase === 'playing' && inHand}
                  onClick={inHand ? () => onCardClick(c.id) : undefined}
                  hiddenFromAt={!inHand && !inPlayed}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              );
            })}
          </div>
        </div>
        <span className="game-piletag game-decktag">Deck</span>
        <span className="game-piletag game-discardtag">Discard {piles.discard.length ? `· ${piles.discard.length}` : ''}</span>
      </div>

      <div className="game-controls">
        {phase === 'start' && (
          <button type="button" className="game-play" onClick={startRound}>Shuffle &amp; deal</button>
        )}
        {phase === 'playing' && (
          <>
            <button type="button" className="game-play" disabled={selected.size === 0} onClick={playHand}>
              Play hand{selected.size ? ` (${selected.size})` : ''}
            </button>
            <button type="button" className="game-discard" disabled={selected.size === 0 || discardsLeft === 0} onClick={discardHand}>
              Discard
            </button>
          </>
        )}
        {(phase === 'won' || phase === 'lost') && (
          <button type="button" className="game-play" onClick={startRound}>Play again</button>
        )}
      </div>
    </div>
  );
}
