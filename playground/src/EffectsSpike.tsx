import { useMemo, useRef, useState } from 'react';
import { useCardPiles, useCardDrag, DeckReveal, stackLayout, row, type PileLayoutFn } from 'card-motion';

// ── Spike: an effects sandbox to validate the engine for other games ──────────
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
const EFFECT: Record<Kind, string> = { boost: '+3 pts', draw: 'robá 1', plain: 'sin efecto', search: 'abrí la baraja' };
const HAND_IDS = [0, 1, 2, 3, 4];

function buildCards(): EffectCard[] {
  const base: Kind[] = ['boost', 'search', 'plain', 'draw', 'plain', 'boost', 'search', 'draw', 'plain', 'boost', 'draw', 'plain'];
  const seq = [...base, ...base]; // 24 cards, so the deck-reveal wraps & scrolls
  return seq.map((kind, id) => ({ id, kind, orient: 'v' }));
}

// The whole point: YOU render the card face, not <Card>.
function CardFace({ card, faceDown }: { card: EffectCard; faceDown?: boolean }) {
  if (faceDown) return <div className="ef-card ef-back" aria-hidden />;
  return (
    <div className={`ef-card k-${card.kind}`}>
      <span className="ef-kind">{card.kind}</span>
      <span className="ef-glyph">{GLYPH[card.kind]}</span>
      <span className="ef-eff">{EFFECT[card.kind]}</span>
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

export default function EffectsSpike() {
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
    if (card.kind === 'boost') { setScore((s) => s + 3); pushLog('boost → +3 puntos'); }
    else if (card.kind === 'draw') { await draw('deck', 'hand', 1); pushLog('draw → +1 carta a la mano'); }
    else if (card.kind === 'search') { pushLog('search → abrí la baraja'); setReveal(true); }
    else pushLog('plain → sin efecto');
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
    onTap: toggleSel,
    resolveDrop: (id, p, s) => {
      const zone: PileId = p.y < s.height * 0.44 ? 'zoneA' : p.y < s.height * 0.7 ? 'zoneB' : 'hand';
      return acceptsZone(byId.get(id)!, zone) ? zone : null; // null → rejected, snaps back
    },
    onDrop: (id, target) =>
      act(async () => {
        if (target == null) {
          await move(id, pileOf(id) ?? 'hand'); // rejected → back to where it was
          pushLog('✕ rechazado — zona no admite esa carta');
          return;
        }
        if (target === 'hand') await move(id, 'hand');
        else await playTo(id, target);
        setSel(id);
      }),
  });

  const toZone = (zone: PileId) =>
    sel != null &&
    (acceptsZone(byId.get(sel)!, zone)
      ? act(async () => { const id = sel; await playTo(id, zone); setSel(null); })
      : pushLog('✕ rechazado — zona no admite esa carta'));

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
    <div className="ef">
      <div className="ef-hud">
        <div className="ef-scorebox">
          <span className="game-label">Puntaje (efecto boost)</span>
          <strong className="game-score">{score}</strong>
        </div>
        <div className="ef-logbox">
          <div className="ef-logbox-head">
            <span className="game-label">Registro</span>
            <button type="button" className="ef-loglink" onClick={() => setLogOpen(true)} disabled={log.length === 0}>
              Ver todo{log.length ? ` (${log.length})` : ''}
            </button>
          </div>
          <div className="ef-loglist-mini">
            {log.length === 0 ? (
              <span className="ef-log-empty">Bajá una carta a una zona para disparar su efecto…</span>
            ) : (
              log.slice(0, 3).map((l, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.28 }}>{l}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="ef-bar">
        <span className="ef-hint">
          {sel == null
            ? 'Seleccioná o arrastrá una carta, o abrí la baraja'
            : byId.get(sel)?.kind === 'boost'
              ? 'Regla: un boost solo entra en Zona 1'
              : 'Efecto para la carta seleccionada — o arrastrala a una zona'}
        </span>
        <div className="ef-actions">
          <button type="button" disabled={sel == null || !acceptsZone(byId.get(sel)!, 'zoneA')} onClick={() => toZone('zoneA')}>Bajar a Zona 1</button>
          <button type="button" disabled={sel == null || !acceptsZone(byId.get(sel)!, 'zoneB')} onClick={() => toZone('zoneB')}>Bajar a Zona 2</button>
          <button type="button" disabled={sel == null} onClick={rotate}>Rotar 90°</button>
          <button type="button" disabled={sel == null} onClick={() => setOrient('h')}>Horizontal</button>
          <button type="button" disabled={sel == null} onClick={() => setOrient('v')}>Vertical</button>
          <button type="button" className="ef-search" onClick={() => setReveal(true)}>Buscar en la baraja</button>
        </div>
      </div>

      <div className="ef-stagewrap">
        <div className="cm-stage" ref={stageRef}>
          {cards.map((c) => {
            const inDeck = piles.deck.includes(c.id);
            return (
              <div
                key={c.id}
                ref={(n) => registerCard(c.id, n)}
                className={`ef-slot${sel === c.id ? ' selected' : ''}${inDeck ? ' in-deck' : ''}${dragId === c.id ? ' dragging' : ''}`}
                {...dragProps(c.id)}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <CardFace card={c} faceDown={inDeck} />
              </div>
            );
          })}
        </div>
        <span className="ef-tag" style={{ left: '12%', top: 'calc(42% + 64px)' }}>Baraja · {piles.deck.length}</span>
        <span className="ef-tag" style={{ left: '62%', top: 'calc(30% + 62px)' }}>Zona 1</span>
        <span className="ef-tag" style={{ left: '62%', top: 'calc(56% + 62px)' }}>Zona 2</span>
      </div>

      {reveal && (
        <DeckReveal
          title="Baraja desplegada — elegí una carta"
          cards={piles.deck.map((id) => byId.get(id)!)}
          renderFace={(card) => <CardFace card={card} />}
          onPick={pickFromDeck}
          onClose={() => setReveal(false)}
        />
      )}

      {logOpen && (
        <div className="ef-modal" role="dialog" aria-modal="true" onClick={() => setLogOpen(false)}>
          <div className="ef-modal-panel ef-modal-log" onClick={(e) => e.stopPropagation()}>
            <div className="ef-modal-head">
              <span>Registro de acciones</span>
              <button type="button" className="ef-modal-close" onClick={() => setLogOpen(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="ef-loglist">
              {log.length === 0 ? (
                <div className="ef-reveal-empty">Sin acciones todavía.</div>
              ) : (
                log.map((l, i) => <div key={i} className="ef-logrow">{l}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
