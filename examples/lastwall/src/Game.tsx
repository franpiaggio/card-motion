import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useCardDrag, useCardInspect, useCardPiles, CardInspectLayer, fan, stack, shuffleInPlace, type PileConfig, type PileLayoutFn } from 'card-motion';
import { CardFace } from './CardFace';
import InspectCard from './InspectCard';
import Coach from './Coach';
import Spotlight, { type Rect } from './Spotlight';
import HowTo from './HowTo';
import {
  buildAllyDeck,
  buildHordeDeck,
  buildOutsider,
  buildPortal,
  buildTutorialDeal,
  hasKw,
  resetIds,
  type GCard,
} from './game/cards';
import type { Difficulty } from './game/difficulties';
import { pillageForTurn, resolveLane, waveForTurn } from './game/rules';

const LANES = 6;

// ── Walkthrough script ────────────────────────────────────────────────────────
// Each step highlights one target and either narrates (Next) or waits for an
// action (`gate`). Targets are resolved to card ids / DOM in the component.
type TutTarget = 'none' | 'castle' | 'mana' | 'resolve' | 'grunt' | 'portal' | 'footman' | 'skirmisher';
type TutGate = 'deployFootman' | 'deploySkirmisher' | 'resolve';
interface TutStep {
  text: string;
  target: TutTarget;
  gate?: TutGate;
  action?: string; // do-this prompt shown for gated steps
}

const TUT_STEPS: TutStep[] = [
  {
    text: "Welcome to the walkthrough. You defend a castle against a horde across six lanes. I'll walk you through one turn.",
    target: 'none',
  },
  {
    text: 'This is your castle. Every unblocked monster strikes it. If its health hits zero, you lose.',
    target: 'castle',
  },
  {
    text: 'The horde already summoned a monster: a Grunt with 2 attack and 2 health. Left alone, it will hit your castle for 2.',
    target: 'grunt',
  },
  {
    text: 'This is the portal. Attack it with allies in empty lanes to tear it down. Destroy it and the Outsider boss appears; kill the Outsider to win.',
    target: 'portal',
  },
  {
    text: 'Mana is your budget for deploying allies. You have 5 this turn, and it refills each turn.',
    target: 'mana',
  },
  {
    text: 'Your hand. Each ally shows its mana cost (top-left), attack (bottom-left) and health (bottom-right). This Footman costs 2, hits for 2, has 3 health.',
    target: 'footman',
  },
  {
    text: 'Deploy the Footman to block the Grunt. They will trade blows in the fight.',
    target: 'footman',
    gate: 'deployFootman',
    action: 'Drag the Footman into lane 1, under the Grunt.',
  },
  {
    text: 'Now pressure the portal. An ally in a lane with no monster strikes the portal instead.',
    target: 'skirmisher',
    gate: 'deploySkirmisher',
    action: 'Drag the Skirmisher into any empty lane.',
  },
  {
    text: 'One warning for real games: some turns the horde reveals a Treachery card that buffs a front-line monster right before the fight. Plan for it.',
    target: 'none',
  },
  {
    text: 'You are set. Resolve the turn to run the fight, lane by lane.',
    target: 'resolve',
    gate: 'resolve',
    action: 'Press “Resolve turn”.',
  },
  {
    text: 'That is the loop. Your Footman traded with the Grunt (and killing a monster let you draw a card), your Skirmisher chipped the portal, and raiders stripped a card from your deck.',
    target: 'none',
  },
  {
    text: 'Deploy, resolve, repeat: hold the castle, break the portal, then destroy the Outsider. You are ready to defend for real.',
    target: 'none',
  },
];

function sameRect(a: Rect | null, b: Rect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}
type PileId = string; // 'deck' | 'hand' | 'mon0'.. | 'ally0'.. | 'portal' | ...

export interface GameResult {
  won: boolean;
  reason: string;
  turns: number;
}

// ── Responsive metrics ────────────────────────────────────────────────────────
// One formula drives both the engine's layout callbacks (via the stage size it
// passes) and the DOM overlays, so cards and labels always agree.
function metrics(w: number, h: number) {
  const sideL = Math.max(66, w * 0.13);
  const sideR = Math.max(78, w * 0.15);
  const boardW = Math.max(240, w - sideL - sideR);
  const spacing = boardW / LANES;
  const cardW = Math.min(88, Math.max(38, spacing * 0.82));
  const cardH = cardW * (132 / 96);
  const colX = (k: number) => sideL + spacing * (k + 0.5);
  const monY = h * 0.27;
  const allyY = h * 0.63;
  const markerY = (monY + allyY) / 2;
  const portalX = sideL * 0.5;
  const portalY = (monY + allyY) / 2;
  const castleX = w - sideR * 0.5;
  const castleY = (monY + allyY) / 2;
  const handY = h - cardH * 0.66;
  const deckX = w - sideR * 0.5;
  const deckY = h - cardH * 0.5;
  const discardX = sideL * 0.5;
  const discardY = h - cardH * 0.5;
  const hordeDeckX = sideL * 0.5;
  const hordeDeckY = h * 0.1;
  const hordeDiscX = w - sideR * 0.5;
  const hordeDiscY = h * 0.1;
  const allyBandTop = allyY - cardH * 0.9;
  const allyBandBot = allyY + cardH * 0.9;
  return {
    sideL, sideR, spacing, cardW, cardH, colX, monY, allyY, markerY,
    portalX, portalY, castleX, castleY, handY, deckX, deckY, discardX, discardY,
    hordeDeckX, hordeDeckY, hordeDiscX, hordeDiscY, allyBandTop, allyBandBot,
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Game({
  cfg,
  onEnd,
  onQuit,
  tutorial = false,
}: {
  cfg: Difficulty;
  onEnd: (r: GameResult) => void;
  onQuit: () => void;
  tutorial?: boolean;
}) {
  // Build the whole card set + pile config once per mount (a new mount = new game).
  const setup = useMemo(() => {
    let cards: GCard[];
    let initial: Partial<Record<PileId, number[]>>;
    let portalId: number;
    let outsiderId: number;
    let tutIds: ReturnType<typeof buildTutorialDeal>['ids'] | null = null;

    if (tutorial) {
      const d = buildTutorialDeal();
      cards = d.cards;
      initial = d.initial;
      portalId = d.ids.portal;
      outsiderId = d.ids.outsider;
      tutIds = d.ids;
    } else {
      resetIds();
      const allies = buildAllyDeck(cfg.deckSize);
      const horde = buildHordeDeck(cfg.hordeSize);
      const portal = buildPortal(1, cfg.portal[0].hp, cfg.portal[0].wave, cfg.portal[0].boost);
      const outsider = buildOutsider(cfg.outsiderHp, cfg.outsiderAtk);
      cards = [...allies, portal, outsider, ...horde];
      portalId = portal.id;
      outsiderId = outsider.id;
      const deckIds = shuffleInPlace(allies.map((c) => c.id));
      const hordeIds = shuffleInPlace(horde.map((c) => c.id));
      const handIds = deckIds.splice(0, cfg.handStart);
      initial = { deck: deckIds, hand: handIds, hordeDeck: hordeIds, portal: [portalId], reserve: [outsiderId] };
    }
    const byId = new Map<number, GCard>(cards.map((c) => [c.id, c]));

    const laneLayout: PileLayoutFn<GCard> = (_i, _n, ctx) => ({ x: ctx.anchor.x, y: ctx.anchor.y, rotation: 0, scale: 1 });

    // Declaration order sets z-stacking (later = on top). Lanes above the face-down
    // piles; portal above lanes; the hand on top so it's always grabbable and rides
    // above the board as cards fly out.
    const piles: Record<PileId, PileConfig<GCard>> = {
      deck: { anchor: (s) => xy(metrics(s.width, s.height), 'deckX', 'deckY'), layout: stack({ offset: 0.18 }) },
      discard: { anchor: (s) => xy(metrics(s.width, s.height), 'discardX', 'discardY'), layout: stack({ offset: 0.18 }) },
      hordeDeck: { anchor: (s) => xy(metrics(s.width, s.height), 'hordeDeckX', 'hordeDeckY'), layout: stack({ offset: 0.18 }) },
      hordeDiscard: { anchor: (s) => xy(metrics(s.width, s.height), 'hordeDiscX', 'hordeDiscY'), layout: stack({ offset: 0.18 }) },
      reserve: { anchor: () => ({ x: -400, y: -400 }), layout: stack({ offset: 0 }) },
    };
    for (let k = 0; k < LANES; k++) {
      piles[`mon${k}`] = { anchor: (s) => ({ x: metrics(s.width, s.height).colX(k), y: metrics(s.width, s.height).monY }), layout: laneLayout };
    }
    for (let k = 0; k < LANES; k++) {
      piles[`ally${k}`] = { anchor: (s) => ({ x: metrics(s.width, s.height).colX(k), y: metrics(s.width, s.height).allyY }), layout: laneLayout };
    }
    piles.portal = { anchor: (s) => xy(metrics(s.width, s.height), 'portalX', 'portalY'), layout: stack({ offset: 0 }) };
    piles.hand = {
      anchor: (s) => {
        const mm = metrics(s.width, s.height);
        return { x: mm.sideL + (mm.spacing * LANES) / 2, y: mm.handY };
      },
      layout: fan({ maxSpacing: 62, spread: 0.5, tilt: 4, dip: 3 }),
    };

    return { cards, byId, piles, initial, portalId, outsiderId, tutIds };
  }, [cfg, tutorial]);

  const { cards, byId, piles: pileConfig, initial, portalId, outsiderId, tutIds } = setup;
  const api = useCardPiles<PileId, GCard>({ cards, piles: pileConfig, initial });
  const { stageRef, registerCard, piles, counts, move, draw, gather, relayout } = api;

  // All numeric game state lives in one mutable ref so async phase code always
  // reads fresh values; `render()` re-paints faces + HUD after each mutation.
  const g = useRef({
    turn: 0,
    mana: 0,
    castleHp: cfg.castleHp,
    portalStage: 0,
    portalGone: false,
    outsiderPending: false,
    outsiderSpawned: false,
    phase: 'boot' as 'boot' | 'alliance' | 'resolving' | 'over',
    result: null as GameResult | null,
  }).current;
  const [, setRev] = useState(0);
  const render = () => setRev((r) => r + 1);
  const [toast, setToast] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const busy = useRef(false);

  // Walkthrough progress. tutStepRef lets the drag/resolve callbacks read the
  // live step without stale closures.
  const [tutStep, setTutStep] = useState(0);
  const tutStepRef = useRef(0);
  tutStepRef.current = tutStep;
  const [spotRect, setSpotRect] = useState<Rect | null>(null);

  // Fresh pile reads for callbacks that run after awaited animations.
  const stateRef = useRef({ piles, counts });
  stateRef.current = { piles, counts };

  // Measure the stage so faces size to the width the layouts use.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      void relayout();
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [relayout]);
  const m = metrics(size.w || 960, size.h || 620);

  // ── Pile read helpers ─────────────────────────────────────────────────────
  const monPile = (k: number) => stateRef.current.piles[`mon${k}`] ?? [];
  const allyPile = (k: number) => stateRef.current.piles[`ally${k}`] ?? [];
  const leftmostEmptyMon = () => {
    for (let k = 0; k < LANES; k++) if (monPile(k).length === 0) return k;
    return null;
  };
  const leftmostEmptyAlly = () => {
    for (let k = 0; k < LANES; k++) if (allyPile(k).length === 0) return k;
    return null;
  };

  // ── Walkthrough gating + highlight ────────────────────────────────────────
  const tutGateNow = () => (tutorial ? TUT_STEPS[tutStepRef.current]?.gate : undefined);
  const tutCanDragCard = (id: number) => {
    if (!tutorial) return true;
    const gate = tutGateNow();
    if (gate === 'deployFootman') return id === tutIds?.footman;
    if (gate === 'deploySkirmisher') return id === tutIds?.skirmisher;
    return false;
  };
  const tutAllowsPlay = (id: number, lane: number) => {
    if (!tutorial) return true;
    const gate = tutGateNow();
    if (gate === 'deployFootman') return id === tutIds?.footman && lane === 0;
    if (gate === 'deploySkirmisher') return id === tutIds?.skirmisher && allyPile(lane).length === 0;
    return false;
  };

  const targetRect = (t: TutTarget): Rect | null => {
    if (!tutIds || t === 'none') return null;
    const sel =
      t === 'grunt' ? `[data-card-id="${tutIds.grunt}"]`
      : t === 'portal' ? `[data-card-id="${tutIds.portal}"]`
      : t === 'footman' ? `[data-card-id="${tutIds.footman}"]`
      : t === 'skirmisher' ? `[data-card-id="${tutIds.skirmisher}"]`
      : `.sk-${t}`; // castle | mana | resolve
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  // Track the current target's on-screen rect (cards move; layout resizes).
  useEffect(() => {
    if (!tutorial) return;
    let raf = 0;
    const tick = () => {
      const r = targetRect(TUT_STEPS[tutStepRef.current]?.target ?? 'none');
      setSpotRect((prev) => (sameRect(prev, r) ? prev : r));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial]);

  // ── Phase machine ─────────────────────────────────────────────────────────
  async function reshuffleHordeIfEmpty() {
    if (stateRef.current.counts.hordeDeck === 0) {
      await gather('hordeDeck', { from: ['hordeDiscard'], shuffle: true });
    }
  }

  async function hordePhase() {
    g.turn += 1;
    // Mana income comes from the portal's boost. Once the portal is gone the
    // Outsider's rift keeps leaking power, so income continues at the last
    // stage's rate — otherwise you'd never afford to finish the boss.
    const boost = g.portalGone ? cfg.portal[cfg.portal.length - 1].boost : (cfg.portal[g.portalStage]?.boost ?? 0);
    g.mana = Math.min(10, g.mana + boost);
    setToast(`Turn ${g.turn} — the horde stirs`);
    render();
    await wait(180);

    // The Outsider joins once the last portal is down.
    if (g.outsiderPending && !g.outsiderSpawned) {
      const lane = leftmostEmptyMon();
      if (lane != null) {
        await move([outsiderId], `mon${lane}`);
        g.outsiderSpawned = true;
        setToast('The Outsider emerges!');
        render();
        await wait(200);
      }
    }

    const wave = waveForTurn(cfg.baseWave, cfg.maxWave, cfg.waveRampTurns, g.turn);
    const portal = byId.get(portalId);
    if (portal && !g.portalGone) portal.wave = wave;
    for (let i = 0; i < wave; i++) {
      const lane = leftmostEmptyMon();
      if (lane == null) break; // lanes full — the surplus would wait offstage
      await reshuffleHordeIfEmpty();
      if (stateRef.current.counts.hordeDeck === 0) break;
      await draw('hordeDeck', `mon${lane}`, 1);
    }
    render();
  }

  async function treacheryPhase() {
    await reshuffleHordeIfEmpty();
    if (stateRef.current.counts.hordeDeck > 0) await draw('hordeDeck', 'hordeDiscard', 1);
    let firstMon: number | null = null;
    for (let k = 0; k < LANES; k++) if (monPile(k).length > 0) { firstMon = k; break; }
    if (firstMon != null) {
      const amt = 1 + (g.turn % 2); // 1 or 2
      const c = byId.get(monPile(firstMon)[0]);
      if (c) {
        c.tempAtk = (c.tempAtk ?? 0) + amt;
        setToast(`Treachery — ${c.name} gains +${amt} attack`);
        render();
        await wait(650);
      }
    }
  }

  function applyPortalDamage(dmg: number) {
    if (g.portalGone) return;
    const portal = byId.get(portalId);
    if (!portal) return;
    let rem = dmg;
    while (rem > 0 && !g.portalGone) {
      portal.hp -= rem;
      if (portal.hp > 0) {
        rem = 0;
      } else {
        rem = -portal.hp;
        const next = g.portalStage + 1;
        if (next < cfg.portal.length) {
          g.portalStage = next;
          portal.stage = next + 1;
          portal.glyph = next + 1 === 2 ? 'II' : 'III';
          portal.boost = cfg.portal[next].boost;
          portal.wave = cfg.portal[next].wave;
          portal.maxHp = cfg.portal[next].hp;
          portal.hp = cfg.portal[next].hp;
          setToast('The portal buckles — a new stage rises');
        } else {
          g.portalGone = true;
          g.outsiderPending = true;
          void move([portalId], 'reserve');
          setToast('The portal shatters! The Outsider stirs.');
        }
      }
    }
    render();
  }

  async function fightPhase() {
    for (let k = 0; k < LANES; k++) {
      const aId = allyPile(k)[0];
      const mId = monPile(k)[0];
      const ally = aId != null ? byId.get(aId) : undefined;
      const mon = mId != null ? byId.get(mId) : undefined;
      if (!ally && !mon) continue;

      const out = resolveLane(ally, mon);
      if (out.toCastle > 0) g.castleHp -= out.toCastle;
      if (out.toPortal > 0) applyPortalDamage(out.toPortal);
      render();

      const deaths: Promise<void>[] = [];
      if (mon && out.monDied) {
        if (mon.kind === 'outsider') g.result = { won: true, reason: 'The Outsider falls. The horde breaks and the realm holds.', turns: g.turn };
        deaths.push(move([mon.id], 'hordeDiscard'));
      }
      if (ally && out.allyDied) deaths.push(move([ally.id], 'discard'));
      if (deaths.length) await Promise.all(deaths);

      // Every slain monster lets you draw — your main way to refill your hand.
      if (mon && out.monDied && mon.kind === 'monster' && stateRef.current.counts.deck > 0 && stateRef.current.counts.hand < 7) {
        await draw('deck', 'hand', 1);
      }

      // Volley: a surviving ally also chips the monster one lane to the right.
      if (ally && ally.hp > 0 && hasKw(ally, 'volley')) {
        const nId = monPile(k + 1)[0];
        const nb = nId != null ? byId.get(nId) : undefined;
        if (nb) {
          nb.hp -= 1;
          render();
          if (nb.hp <= 0) {
            await move([nb.id], 'hordeDiscard');
            if (nb.kind === 'monster' && stateRef.current.counts.deck > 0 && stateRef.current.counts.hand < 7) {
              await draw('deck', 'hand', 1);
            }
          }
        }
      }

      await wait(150);
      if (g.result) return; // Outsider destroyed
      if (g.castleHp <= 0) {
        g.result = { won: false, reason: 'The castle is overrun. The realm falls to the horde.', turns: g.turn };
        return;
      }
    }
  }

  async function pillagePhase() {
    const n = pillageForTurn(cfg.pillage, cfg.pillageRampTurns, g.turn);
    const avail = Math.min(n, stateRef.current.counts.deck);
    if (avail > 0) {
      await draw('deck', 'discard', avail);
      setToast(`Raiders strip ${avail} card${avail !== 1 ? 's' : ''} from your deck`);
      render();
      await wait(300);
    }
    if (stateRef.current.counts.deck === 0) {
      g.result = { won: false, reason: 'Your deck runs dry. With no reserves left, the alliance collapses.', turns: g.turn };
    }
  }

  async function endPhase() {
    for (const c of cards) if (c.tempAtk) c.tempAtk = 0;
    // Monsters that lingered on the board recover / grow.
    for (let k = 0; k < LANES; k++) {
      const mId = monPile(k)[0];
      const mc = mId != null ? byId.get(mId) : undefined;
      if (!mc) continue;
      if (hasKw(mc, 'regenerate') && mc.hp < mc.maxHp) mc.hp = Math.min(mc.maxHp, mc.hp + 1);
      if (hasKw(mc, 'frenzy')) mc.atk += 1;
    }
    const hand = stateRef.current.piles.hand;
    if (hand.length > 7) {
      const extra = hand.slice(0, hand.length - 7) as number[];
      await move(extra, 'discard');
    }
    render();
  }

  function finish() {
    g.phase = 'over';
    render();
    if (g.result) onEnd(g.result);
  }

  async function startTurnInner() {
    if (g.result) return;
    g.phase = 'resolving';
    render();
    await hordePhase();
    if (g.result) {
      finish();
      return;
    }
    g.phase = 'alliance';
    render();
  }

  const act = (fn: () => Promise<void>) => {
    if (busy.current || g.result) return;
    busy.current = true;
    void Promise.resolve(fn()).finally(() => {
      busy.current = false;
      render();
    });
  };

  const resolveTurn = () =>
    act(async () => {
      if (g.phase !== 'alliance') return;
      if (tutorial && tutGateNow() !== 'resolve') return; // only at the scripted step
      g.phase = 'resolving';
      render();
      if (!tutorial) await treacheryPhase(); // kept out of the walkthrough's first fight
      await fightPhase();
      if (g.result) {
        finish();
        return;
      }
      await pillagePhase();
      if (g.result) {
        finish();
        return;
      }
      await endPhase();
      if (tutorial) {
        // Freeze the board and roll on to the recap; the walkthrough ends here.
        g.phase = 'alliance';
        setTutStep((s) => s + 1);
        render();
        return;
      }
      await startTurnInner();
    });

  // ── Deploying allies ──────────────────────────────────────────────────────
  const canAfford = (id: number) => {
    const c = byId.get(id);
    return !!c && c.cost != null && c.cost <= g.mana;
  };

  async function playToLane(id: number, lane: number) {
    const c = byId.get(id);
    if (!c) return;
    if (allyPile(lane).length > 0 || (c.cost ?? 0) > g.mana) {
      await relayout('hand');
      return;
    }
    g.mana -= c.cost ?? 0;
    render();
    await move([id], `ally${lane}`);
    // Rally: deploying this ally buffs the allies flanking it.
    if (hasKw(c, 'rally')) {
      for (const nb of [lane - 1, lane + 1]) {
        if (nb < 0 || nb >= LANES) continue;
        const nId = allyPile(nb)[0];
        const nc = nId != null ? byId.get(nId) : undefined;
        if (nc) nc.atk += 1;
      }
      setToast(`${c.name} rallies the line (+1 attack to its flanks)`);
      render();
    }
    // In the walkthrough, deploying the prompted card advances the script.
    if (tutorial) {
      const gate = tutGateNow();
      if (gate === 'deployFootman' || gate === 'deploySkirmisher') setTutStep((s) => s + 1);
    }
  }

  // The card menu: a tap makes a card "active" and offers Play / Inspect.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = activeId;
  const tap = useRef<{ id: number; x: number; y: number } | null>(null);
  const closeMenu = () => setActiveId(null);

  // Inspect is driven programmatically from the menu (no gesture) — it owns the
  // magnify overlay. This exercises the primitive's flexible `open()` trigger.
  const inspect = useCardInspect({ triggers: [] });

  const openMenu = (id: number, el: HTMLElement) => {
    if (tutorial) return; // the walkthrough stays drag-only, no menu
    const p = stateRef.current.piles;
    if (p.deck?.includes(id) || p.hordeDeck?.includes(id) || p.reserve?.includes(id)) return; // face-down
    if (activeIdRef.current === id) {
      setActiveId(null); // tap again to dismiss
      return;
    }
    setActiveRect(el.getBoundingClientRect());
    setActiveId(id);
  };

  const canPlayCard = (id: number) => {
    if (g.phase !== 'alliance' || !stateRef.current.piles.hand.includes(id) || !canAfford(id)) return false;
    const lane = leftmostEmptyAlly();
    return lane != null && tutAllowsPlay(id, lane);
  };
  const playActive = () => {
    const id = activeIdRef.current;
    if (id == null) return;
    const lane = leftmostEmptyAlly();
    if (lane != null && tutAllowsPlay(id, lane)) act(() => playToLane(id, lane));
    setActiveId(null);
  };
  const inspectActive = () => {
    const id = activeIdRef.current;
    if (id == null) return;
    const el = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement | null;
    inspect.open(id, el, true);
    setActiveId(null);
  };

  const { dragId, dragProps } = useCardDrag<PileId>({
    stageRef,
    canDrag: (id) => !busy.current && g.phase === 'alliance' && stateRef.current.piles.hand.includes(id) && canAfford(id) && tutCanDragCard(id),
    onDragStart: () => closeMenu(), // a drag supersedes the menu
    resolveDrop: (id, point, stage) => {
      const mm = metrics(stage.width, stage.height);
      if (point.y < mm.allyBandTop || point.y > mm.allyBandBot) return null;
      let best: number | null = null;
      let bestD = Infinity;
      for (let k = 0; k < LANES; k++) {
        const dx = Math.abs(point.x - mm.colX(k));
        if (dx < bestD) {
          bestD = dx;
          best = k;
        }
      }
      if (best == null || bestD > mm.spacing * 0.62) return null;
      if (allyPile(best).length > 0 || !canAfford(id)) return null;
      if (!tutAllowsPlay(id, best)) return null;
      return `ally${best}`;
    },
    onDrop: (id, target) => {
      if (target && target.startsWith('ally')) act(() => playToLane(id, Number(target.slice(4))));
      else act(async () => void (await relayout('hand')));
    },
  });

  // Tap detection for every card (independent of drag): a press that doesn't
  // slide opens the menu; a slide is a drag and useCardDrag handles it.
  const tapProps = (id: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      tap.current = { id, x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const t = tap.current;
      if (t && t.id === id && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8) tap.current = null;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const t = tap.current;
      tap.current = null;
      if (t && t.id === id) openMenu(id, e.currentTarget);
    },
    onPointerCancel: () => {
      tap.current = null;
    },
  });

  // Compose drag + tap handlers onto each card node.
  const slotProps = (id: number) => {
    const d = dragProps(id);
    const t = tapProps(id);
    return {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        t.onPointerDown(e);
        d.onPointerDown(e);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        t.onPointerMove(e);
        d.onPointerMove(e);
      },
      onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
        t.onPointerUp(e);
        d.onPointerUp(e);
      },
      onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => {
        t.onPointerCancel();
        d.onPointerCancel(e);
      },
    };
  };

  // Kick off turn 1 once. The walkthrough starts from its pre-dealt board with a
  // fixed mana pool instead of running a random horde phase.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (tutorial) {
      g.turn = 1;
      g.mana = 5;
      g.phase = 'alliance';
      render();
    } else {
      act(startTurnInner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived HUD values ────────────────────────────────────────────────────
  const inHand = (id: number) => piles.hand.includes(id);
  const isFaceDown = (id: number) => piles.deck.includes(id) || piles.hordeDeck.includes(id) || piles.reserve.includes(id);
  const emptyAlly = leftmostEmptyAlly() != null;
  const canPlayAny = g.phase === 'alliance' && emptyAlly && piles.hand.some((id) => canAfford(id));
  const pillageNow = pillageForTurn(cfg.pillage, cfg.pillageRampTurns, Math.max(1, g.turn));
  const castlePct = Math.max(0, Math.min(100, (g.castleHp / cfg.castleHp) * 100));
  const step = tutorial ? TUT_STEPS[tutStep] : undefined;

  return (
    <div className="sk-game">
      <header className="sk-hud">
        <button type="button" className="sk-quit" onClick={onQuit} aria-label="Back to menu">
          ‹ Menu
        </button>
        <div className="sk-hud-stats">
          <Stat label="Turn" value={Math.max(1, g.turn)} />
          <div className="sk-stat sk-mana">
            <span className="sk-stat-label">Mana</span>
            <strong>
              {g.mana}
              <em>/10</em>
            </strong>
          </div>
          <div className="sk-stat sk-castle-stat">
            <span className="sk-stat-label">Castle</span>
            <strong className={castlePct <= 34 ? 'low' : undefined}>{Math.max(0, g.castleHp)}</strong>
          </div>
          <Stat label="Deck" value={counts.deck} warn={counts.deck <= 6} />
          <div className="sk-stat">
            <span className="sk-stat-label">Raiders</span>
            <strong>−{pillageNow}/turn</strong>
          </div>
        </div>
        <button type="button" className="sk-help-btn" onClick={() => setShowHelp(true)} aria-label="How to play">
          ?
        </button>
      </header>

      <div
        className="sk-stage-wrap"
        ref={wrapRef}
        style={{ ['--cw' as string]: `${m.cardW}px`, ['--ch' as string]: `${m.cardH}px` }}
      >
        {/* Lane markers strip */}
        <div className="sk-markers" style={{ top: m.markerY }} aria-hidden="true">
          {Array.from({ length: LANES }, (_, k) => (
            <span key={k} className="sk-marker" style={{ left: m.colX(k) }}>
              {k + 1}
            </span>
          ))}
        </div>

        {/* Castle panel */}
        <div className="sk-castle" style={{ left: m.castleX, top: m.castleY }}>
          <span className="sk-castle-icon">🏰</span>
          <div className="sk-castle-bar">
            <span style={{ height: `${castlePct}%` }} className={castlePct <= 34 ? 'low' : undefined} />
          </div>
          <strong>{Math.max(0, g.castleHp)}</strong>
          <span className="sk-castle-label">Castle</span>
        </div>

        {/* Pile labels */}
        <ZoneLabel x={m.deckX} y={m.deckY} label="Deck" count={counts.deck} />
        <ZoneLabel x={m.discardX} y={m.discardY} label="Discard" count={counts.discard} />
        <ZoneLabel x={m.hordeDeckX} y={m.hordeDeckY} label="Horde" count={counts.hordeDeck} muted />
        {g.portalGone && !g.outsiderSpawned && (
          <div className="sk-portal-ghost" style={{ left: m.portalX, top: m.portalY }}>
            Outsider<br />incoming
          </div>
        )}

        {/* The cards */}
        <div className="cm-stage" ref={stageRef}>
          {cards.map((c) => (
            <div
              key={c.id}
              className="sk-slot"
              data-card-id={c.id}
              ref={(n) => registerCard(c.id, n)}
              style={{ position: 'absolute', top: 0, left: 0 }}
              {...slotProps(c.id)}
            >
              <CardFace
                card={c}
                faceDown={isFaceDown(c.id)}
                playable={inHand(c.id) && g.phase === 'alliance' && canAfford(c.id) && emptyAlly}
                affordable={canAfford(c.id)}
                dragging={dragId === c.id}
                active={activeId === c.id}
              />
            </div>
          ))}
        </div>
      </div>

      <footer className="sk-controls">
        <p className="sk-phase-hint">
          {g.phase === 'alliance'
            ? canPlayAny
              ? 'Alliance phase — drag an ally to a lane, or tap a card for Play / Inspect. Then resolve.'
              : 'Alliance phase — deploy what you can, then resolve the turn.'
            : g.phase === 'over'
              ? g.result?.won
                ? 'Victory.'
                : 'Defeated.'
              : 'The horde advances…'}
        </p>
        <button
          type="button"
          className="sk-resolve"
          onClick={resolveTurn}
          disabled={g.phase !== 'alliance' || (tutorial && TUT_STEPS[tutStep]?.gate !== 'resolve')}
        >
          Resolve turn ⚔
        </button>
      </footer>

      {toast && (
        <div key={toast} className="sk-toast" aria-live="polite">
          {toast}
        </div>
      )}
      {showHelp && <HowTo onClose={() => setShowHelp(false)} />}

      {/* Tap-a-card menu: Play / Inspect. */}
      {activeId != null && activeRect && (
        <>
          <div className="sk-menu-scrim" onPointerDown={closeMenu} />
          <div className="sk-cardmenu" style={{ left: activeRect.left + activeRect.width / 2, top: activeRect.top - 10 }}>
            {canPlayCard(activeId) && (
              <button type="button" className="sk-cardmenu-btn sk-cardmenu-play" onClick={playActive}>
                ⚔ Play
              </button>
            )}
            <button type="button" className="sk-cardmenu-btn" onClick={inspectActive}>
              🔍 Inspect
            </button>
          </div>
        </>
      )}

      <CardInspectLayer open={inspect.inspectId != null} sourceRect={inspect.sourceRect} onClose={inspect.close}>
        {inspect.inspectId != null && byId.get(inspect.inspectId) && <InspectCard card={byId.get(inspect.inspectId)!} />}
      </CardInspectLayer>

      {tutorial && step && (
        <>
          {/* Dim/highlight only when a target is on-screen and we're not mid-fight
              (so the player can watch the resolution unobscured). */}
          {spotRect && g.phase !== 'resolving' && <Spotlight rect={spotRect} />}
          <Coach
            step={tutStep + 1}
            total={TUT_STEPS.length}
            text={step.text}
            action={g.phase === 'resolving' ? undefined : step.action}
            place={spotRect && spotRect.top < window.innerHeight * 0.45 ? 'bottom' : 'top'}
            onNext={() => (tutStep + 1 >= TUT_STEPS.length ? onQuit() : setTutStep((s) => s + 1))}
            onSkip={onQuit}
            isLast={tutStep + 1 >= TUT_STEPS.length}
          />
        </>
      )}
    </div>
  );
}

// ── Small presentational helpers ───────────────────────────────────────────────
function xy(mm: ReturnType<typeof metrics>, xk: keyof ReturnType<typeof metrics>, yk: keyof ReturnType<typeof metrics>) {
  return { x: mm[xk] as number, y: mm[yk] as number };
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="sk-stat">
      <span className="sk-stat-label">{label}</span>
      <strong className={warn ? 'low' : undefined}>{value}</strong>
    </div>
  );
}

function ZoneLabel({ x, y, label, count, muted }: { x: number; y: number; label: string; count: number; muted?: boolean }) {
  return (
    <div className={`sk-zone${muted ? ' sk-zone-muted' : ''}`} style={{ left: x, top: y }} aria-hidden="true">
      <span className="sk-zone-count">{count}</span>
      <span className="sk-zone-label">{label}</span>
    </div>
  );
}
