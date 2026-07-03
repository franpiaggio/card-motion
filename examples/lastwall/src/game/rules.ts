import { hasKw, type GCard } from './cards';

// ── Combat math ───────────────────────────────────────────────────────────────
// Pure functions so the fight phase is easy to reason about (and to test). The
// component mutates card hp based on what these return.

/** A card's attack this turn, including any temporary treachery buff. */
export function power(card: GCard): number {
  return Math.max(0, card.atk + (card.tempAtk ?? 0));
}

export interface LaneOutcome {
  toCastle: number; // damage the castle takes from this lane
  toPortal: number; // damage the portal/outsider-target takes from an unopposed ally
  monDied: boolean;
  allyDied: boolean;
}

/** Strike damage `attacker` lands on `defender`, after the defender's Bulwark. */
function strikeDamage(attacker: GCard, defender: GCard): number {
  return Math.max(0, power(attacker) - (hasKw(defender, 'bulwark') ? 1 : 0));
}

/**
 * Resolve one lane. Mutates `ally`/`mon` hp in place and reports the spill that
 * lands on the castle or the portal.
 *
 * - Ally + monster trade blows. Keywords apply:
 *     charge  — strikes first; if it kills, takes no return damage
 *     bulwark — reduces each incoming strike by 1
 *     venom   — any damage dealt to an ally destroys it
 *     trample — overkill carries on (ally → portal, monster → castle)
 * - Unopposed monster strikes the castle; unopposed ally strikes the portal.
 */
export function resolveLane(ally: GCard | undefined, mon: GCard | undefined): LaneOutcome {
  const out: LaneOutcome = { toCastle: 0, toPortal: 0, monDied: false, allyDied: false };

  if (ally && mon) {
    const monHpBefore = mon.hp;
    const allyHpBefore = ally.hp;
    const toMon = strikeDamage(ally, mon);
    const toAlly = strikeDamage(mon, ally);

    // Ally's strike lands, carrying trample overkill to the portal.
    const allyHits = () => {
      mon.hp -= toMon;
      if (hasKw(ally, 'trample') && toMon > monHpBefore) out.toPortal += toMon - monHpBefore;
    };
    // Monster's strike lands: venom is lethal, trample overkill hits the castle.
    const monHits = () => {
      ally.hp -= toAlly;
      if (hasKw(mon, 'venom') && toAlly > 0) ally.hp = Math.min(ally.hp, 0);
      if (hasKw(mon, 'trample') && toAlly > allyHpBefore) out.toCastle += toAlly - allyHpBefore;
    };

    const allyFirst = hasKw(ally, 'charge') && !hasKw(mon, 'charge');
    const monFirst = hasKw(mon, 'charge') && !hasKw(ally, 'charge');

    if (allyFirst) {
      allyHits();
      if (mon.hp > 0) monHits(); // survivor strikes back
    } else if (monFirst) {
      monHits();
      if (ally.hp > 0) allyHits();
    } else {
      allyHits();
      monHits();
    }

    out.monDied = mon.hp <= 0;
    out.allyDied = ally.hp <= 0;
  } else if (mon && !ally) {
    out.toCastle += power(mon);
  } else if (ally && !mon) {
    out.toPortal += power(ally);
  }

  return out;
}

/** The wave count (monsters summoned) for a given turn under a difficulty ramp. */
export function waveForTurn(base: number, max: number, rampTurns: number, turn: number): number {
  return Math.min(max, base + Math.floor((turn - 1) / rampTurns));
}

/** Cards the raiders strip from your deck this turn. */
export function pillageForTurn(base: number, rampTurns: number, turn: number): number {
  return base + Math.floor((turn - 1) / rampTurns);
}
