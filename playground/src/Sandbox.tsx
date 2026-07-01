import { useMemo, useRef, useState } from 'react';
import { useCardPiles, useCardDrag, DeckReveal, stackLayout, row, type PileLayoutFn } from 'card-motion';

// ── Sandbox: exercising the engine for games other than the poker Demo ────────
// Custom (non-<Card>) rectangular faces, per-game effects on top of the engine:
// drag or play a card into a zone (which fires its effect), rotate / orient it
// in place, and a reusable "open the deck" modal to search and pull a card.

type Kind = 'boost' | 'draw' | 'plain' | 'search';
type Orient = 'v' | 'h';

// The payload is ours; the engine only reads `id`. `orient` is mutated by the
// rotate / orientation effects and re-read by the layouts.
interface EffectCard {
  id: number;
  kind: Kind;
  orient: Orient;
}

const GLYPH: Record<Kind, string> = { boost: '★', draw: '↺', plain: '◦', search: '⌕' };
const EFFECT: Record<Kind, string> = { boost: '+3 pts', draw: 'draw 1', plain: 'no effect', search: 'search deck' };
const HAND_IDS = [0, 1, 2, 3, 4];

function buildCards(): EffectCard[] {
  const base: Kind[] = ['boost', 'search', 'plain', 'draw', 'plain', 'boost', 'search', 'draw', 'plain', 'boost', 'draw', 'plain'];
  const seq = [...base, ...base]; // 24 cards, so the deck-reveal wraps & scrolls
  return seq.map((kind, id) => ({ id, kind, orient: 'v' }));
}

// The whole point: YOU render the card face, not <Card>.
function CardFace({ card, faceDown }: { card: EffectCard; faceDown?: boolean }) {
  if (faceDown) return <div className="sb-card sb-back" aria-hidden />;
  return (
    <div className={`sb-card k-${card.kind}`}>
      <span className="sb-kind">{card.kind}</span>
      <span className="sb-glyph">{GLYPH[card.kind]}</span>
      <span className="sb-eff">{EFFECT[card.kind]}</span>
    </div>
  );
}

type PileId = 'zoneA' | 'zoneB' | 'deck' | 'hand';

// A game rule (lives in the app, not the engine): which cards a zone admits.
// Here: a boost may only be played into Zone 1. Everything else goes anywhere.
const acceptsZone = (card: EffectCard, zone: PileId) => {
  if (zone !== 'zoneA' && zone !== 'zoneB') return true; // hand always accepts
  if (card.kind === 'boost') return zone === 'zoneA';
  return true;
};

// Spacing comes from the built-in `row` factory (configurable per pile); the
// only game-specific bit is rotating a card by its `orient`, layered on top.
// Both hand and zones read the card — the engine change this spike validates.
const orientRot = (o: Orient) => (o === 'h' ? 90 : 0);
const handBase = row({ spread: 0.6, maxSpacing: 98, scale: 1 });
const zoneBase = row({ spacing: 66, scale: 0.94 });
const handLayout: PileLayoutFn<EffectCard> = (i, n, ctx) => ({ ...handBase(i, n, ctx), rotation: orientRot(ctx.card.orient) });
const zoneLayout: PileLayoutFn<EffectCard> = (i, n, ctx) => ({ ...zoneBase(i, n, ctx), rotation: orientRot(ctx.card.orient) });

export default function Sandbox() {
  const allCards = useMemo(buildCards, []);
  const deckIds = useMemo(() => allCards.map((c) => c.id).filter((id) => !HAND_IDS.includes(id)), [allCards]);

  // Pile order sets z-stacking: zones < deck < hand — so the deck reads above
  // the zones (and a dragged card, raised to the top, sits above everything).
  // Zones are stacked vertically on the right; the deck sits on the left.
  const g = useCardPiles<PileId, EffectCard>({
    cards: allCards,
    piles: {
      zoneA: { anchor: (s) => ({ x: s.width * 0.62, y: s.height * 0.3 }), layout: zoneLayout },
      zoneB: { anchor: (s) => ({ x: s.width * 0.62, y: s.height * 0.56 }), layout: zoneLayout },
      deck: { anchor: (s) => ({ x: s.width * 0.12, y: s.height * 0.42 }), layout: stackLayout },
      hand: { anchor: (s) => ({ x: s.width * 0.5, y: s.height * 0.85 }), layout: handLayout },
    },
    initial: { deck: deckIds, hand: HAND_IDS },
  });
  const { cards, stageRef, registerCard, piles, pileOf, move, draw, relayout } = g;
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const pushLog = (msg: string) => setLog((l) => [msg, ...l].slice(0, 40));
  const busy = useRef(false);

  const act = async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    await fn();
    busy.current = false;
  };

  const toggleSel = (id: number) => setSel((s) => (s === id ? null : id));

  // Per-game side-effect: runs once a card has been played into a zone.
  const runEffect = async (card: EffectCard) => {
    if (card.kind === 'boost') { setScore((s) => s + 3); pushLog('boost → +3 points'); }
    else if (card.kind === 'draw') { await draw('deck', 'hand', 1); pushLog('draw → +1 card to hand'); }
    else if (card.kind === 'search') { pushLog('search → opened the deck'); setReveal(true); }
    else pushLog('plain → no effect');
  };

  const playTo = async (id: number, zone: PileId) => {
    await move(id, zone);
    await runEffect(byId.get(id)!);
  };

  // Drag is now a library hook. It follows the pointer, tells a tap from a drag,
  // and hands back to the engine on drop; we resolve the target zone by height
  // (zones are stacked) and run the card's effect via `onDrop`.
  const { dragId, dragProps } = useCardDrag<PileId>({
    stageRef,
    canDrag: (id) => !piles.deck.includes(id), // deck is browsed via the modal
    onDragStart: setSel, // the grabbed card becomes the selected one
    onTap: toggleSel,
    resolveDrop: (id, p, s) => {
      const zone: PileId = p.y < s.height * 0.44 ? 'zoneA' : p.y < s.height * 0.7 ? 'zoneB' : 'hand';
      return acceptsZone(byId.get(id)!, zone) ? zone : null; // null → rejected, snaps back
    },
    onDrop: (id, target, point) =>
      act(async () => {
        if (target == null) {
          await move(id, pileOf(id) ?? 'hand'); // rejected → back to where it was
          pushLog('✕ rejected — zone does not accept that card');
          return;
        }
        if (target === 'hand') await move(id, 'hand', { index: handIndexAt(point.x) }); // drop position → reorder
        else await playTo(id, target);
        setSel(id);
      }),
  });

  // Which slot in the hand a drop at stage-x lands on (mirrors the hand layout's
  // row spacing) — lets you reorder the hand by dropping between cards.
  const handIndexAt = (x: number): number => {
    const w = stageRef.current?.clientWidth ?? 0;
    const n = piles.hand.length;
    if (n < 2 || w === 0) return n;
    const spacing = Math.min(98, (w * 0.6) / n);
    const idx = Math.round((x - w * 0.5) / spacing + (n - 1) / 2);
    return Math.max(0, Math.min(n - 1, idx));
  };

  const toZone = (zone: PileId) =>
    sel != null &&
    (acceptsZone(byId.get(sel)!, zone)
      ? act(async () => { const id = sel; await playTo(id, zone); setSel(null); })
      : pushLog('✕ rejected — zone does not accept that card'));

  // Rotate / orient MUTATE the payload, then ask the engine to relayout the pile
  // — the layout re-reads `orient` and the card animates to its new rotation.
  const relayoutInPlace = async (id: number) => {
    const pile = pileOf(id);
    if (pile) await relayout(pile);
  };
  const setOrient = (o: Orient) => sel != null && act(async () => { byId.get(sel)!.orient = o; await relayoutInPlace(sel); });
  const rotate = () => sel != null && act(async () => { const c = byId.get(sel)!; c.orient = c.orient === 'h' ? 'v' : 'h'; await relayoutInPlace(sel); });

  const pickFromDeck = (id: number) => act(async () => { setReveal(false); await move(id, 'hand'); setSel(id); });

  return (
    <div className="sb">
      <div className="sb-hud">
        <div className="sb-scorebox">
          <span className="game-label">Score (boost effect)</span>
          <strong className="game-score">{score}</strong>
        </div>
        <div className="sb-logbox">
          <div className="sb-logbox-head">
            <span className="game-label">Log</span>
            <button type="button" className="sb-loglink" onClick={() => setLogOpen(true)} disabled={log.length === 0}>
              View all{log.length ? ` (${log.length})` : ''}
            </button>
          </div>
          <div className="sb-loglist-mini">
            {log.length === 0 ? (
              <span className="sb-log-empty">Drop a card into a zone to fire its effect…</span>
            ) : (
              log.slice(0, 3).map((l, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.28 }}>{l}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sb-bar">
        <span className="sb-hint">
          {sel == null
            ? 'Select or drag a card, or open the deck'
            : byId.get(sel)?.kind === 'boost'
              ? 'Rule: a boost only enters Zone 1'
              : 'Effect for the selected card — or drag it to a zone'}
        </span>
        <div className="sb-actions">
          <button type="button" disabled={sel == null || !acceptsZone(byId.get(sel)!, 'zoneA')} onClick={() => toZone('zoneA')}>Play to Zone 1</button>
          <button type="button" disabled={sel == null || !acceptsZone(byId.get(sel)!, 'zoneB')} onClick={() => toZone('zoneB')}>Play to Zone 2</button>
          <button type="button" disabled={sel == null} onClick={rotate}>Rotate 90°</button>
          <button type="button" disabled={sel == null} onClick={() => setOrient('h')}>Horizontal</button>
          <button type="button" disabled={sel == null} onClick={() => setOrient('v')}>Vertical</button>
          <button type="button" className="sb-search" onClick={() => setReveal(true)}>Search the deck</button>
        </div>
      </div>

      <div className="sb-stagewrap">
        <div className="cm-stage" ref={stageRef}>
          {cards.map((c) => {
            const inDeck = piles.deck.includes(c.id);
            return (
              <div
                key={c.id}
                ref={(n) => registerCard(c.id, n)}
                className={`sb-slot${sel === c.id ? ' selected' : ''}${inDeck ? ' in-deck' : ''}${dragId === c.id ? ' dragging' : ''}`}
                {...dragProps(c.id)}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <CardFace card={c} faceDown={inDeck} />
              </div>
            );
          })}
        </div>
        <span className="sb-tag" style={{ left: '12%', top: 'calc(42% + 64px)' }}>Deck · {piles.deck.length}</span>
        <span className="sb-tag" style={{ left: '62%', top: 'calc(30% + 62px)' }}>Zone 1</span>
        <span className="sb-tag" style={{ left: '62%', top: 'calc(56% + 62px)' }}>Zone 2</span>
      </div>

      {reveal && (
        <DeckReveal
          title="Deck — pick a card"
          cards={piles.deck.map((id) => byId.get(id)!)}
          renderFace={(card) => <CardFace card={card} />}
          onPick={pickFromDeck}
          onClose={() => setReveal(false)}
        />
      )}

      {logOpen && (
        <div className="sb-modal" role="dialog" aria-modal="true" onClick={() => setLogOpen(false)}>
          <div className="sb-modal-panel sb-modal-log" onClick={(e) => e.stopPropagation()}>
            <div className="sb-modal-head">
              <span>Action log</span>
              <button type="button" className="sb-modal-close" onClick={() => setLogOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="sb-loglist">
              {log.length === 0 ? (
                <div className="sb-reveal-empty">No actions yet.</div>
              ) : (
                log.map((l, i) => <div key={i} className="sb-logrow">{l}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
