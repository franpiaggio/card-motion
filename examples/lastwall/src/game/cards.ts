// ── Card model ────────────────────────────────────────────────────────────────
// Every physical card the table can move is one of these. The card-motion engine
// only reads `id`; everything else is ours to mutate as the game plays out.

export type Kind = 'ally' | 'monster' | 'portal' | 'outsider' | 'minion';

// ── Keywords ──────────────────────────────────────────────────────────────────
// Effects that fire inside the phases already in the loop (deploy / fight / end):
//   trample   — excess strike damage carries on (ally → portal, monster → castle)
//   charge    — strikes first; if it kills, takes no damage back
//   rally     — on deploy, adjacent allies gain +1 attack
//   bulwark   — takes 1 less from each strike
//   volley    — also deals 1 to the monster in the next lane over
//   regenerate— heals 1 at end of turn
//   frenzy    — gains +1 attack each turn it survives
//   venom     — any damage it deals to an ally destroys it
export type Keyword = 'trample' | 'charge' | 'rally' | 'bulwark' | 'volley' | 'regenerate' | 'frenzy' | 'venom';

export const KW_LABEL: Record<Keyword, string> = {
  trample: 'Trample',
  charge: 'Charge',
  rally: 'Rally',
  bulwark: 'Bulwark',
  volley: 'Volley',
  regenerate: 'Regen',
  frenzy: 'Frenzy',
  venom: 'Venom',
};

export const KW_DESC: Record<Keyword, string> = {
  trample: "Overkill carries on — an ally's spills to the portal, a monster's to your castle.",
  charge: 'Strikes first; if it kills, it takes no damage back.',
  rally: 'On deploy, the allies flanking it gain +1 attack.',
  bulwark: 'Takes 1 less from every strike.',
  volley: 'Also deals 1 to the monster one lane to the right.',
  regenerate: 'Heals 1 at the end of each turn.',
  frenzy: 'Gains +1 attack every turn it survives.',
  venom: 'Any damage it deals to an ally destroys it.',
};

export interface GCard {
  id: number;
  kind: Kind;
  name: string;
  /** Short label for the placeholder face — clarity over art. */
  glyph: string;
  atk: number;
  hp: number; // current health (mutated by damage)
  maxHp: number;
  cost?: number; // allies only
  keywords?: Keyword[];
  tempAtk?: number; // this-turn attack buff (treachery); cleared in the end phase
  // portal-only
  stage?: number;
  wave?: number; // monsters summoned per horde phase
  boost?: number; // mana granted per horde phase
}

export const hasKw = (c: GCard, k: Keyword): boolean => !!c.keywords?.includes(k);

// ── Templates ─────────────────────────────────────────────────────────────────
// Placeholder rosters. Names + a one-glyph mark keep each card readable at a
// glance; the color/kind tells you friend from foe.

interface AllyTpl {
  name: string;
  glyph: string;
  cost: number;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  weight: number; // relative copies in the deck
}

interface MonTpl {
  name: string;
  glyph: string;
  atk: number;
  hp: number;
  keywords?: Keyword[];
  weight: number;
}

export const ALLY_TEMPLATES: AllyTpl[] = [
  { name: 'Recruit', glyph: '†', cost: 1, atk: 1, hp: 1, weight: 4 },
  { name: 'Footman', glyph: '♦', cost: 2, atk: 2, hp: 3, weight: 5 },
  { name: 'Skirmisher', glyph: '↟', cost: 2, atk: 3, hp: 1, keywords: ['volley'], weight: 4 },
  { name: 'Herald', glyph: '✚', cost: 3, atk: 2, hp: 3, keywords: ['rally'], weight: 3 },
  { name: 'Warden', glyph: '⛨', cost: 3, atk: 1, hp: 6, keywords: ['bulwark'], weight: 3 },
  { name: 'Lancer', glyph: '➶', cost: 4, atk: 3, hp: 3, keywords: ['trample'], weight: 3 },
  { name: 'Knight', glyph: '♞', cost: 5, atk: 4, hp: 5, keywords: ['charge'], weight: 3 },
];

export const MON_TEMPLATES: MonTpl[] = [
  { name: 'Whelp', glyph: '◦', atk: 1, hp: 1, weight: 4 },
  { name: 'Grunt', glyph: '●', atk: 2, hp: 2, weight: 5 },
  { name: 'Stalker', glyph: '◆', atk: 2, hp: 3, keywords: ['venom'], weight: 3 },
  { name: 'Crawler', glyph: '❖', atk: 2, hp: 4, keywords: ['regenerate'], weight: 3 },
  { name: 'Ravager', glyph: '⟁', atk: 3, hp: 3, keywords: ['frenzy'], weight: 3 },
  { name: 'Brute', glyph: '✦', atk: 3, hp: 4, keywords: ['trample'], weight: 3 },
  { name: 'Maw', glyph: '✖', atk: 4, hp: 6, keywords: ['trample'], weight: 2 },
];

let nextId = 0;
const mkId = () => nextId++;

/** Reset the id counter so each fresh game starts from a clean, stable set. */
export function resetIds() {
  nextId = 0;
}

function weightedDeck<T extends { weight: number }>(templates: T[], size: number): T[] {
  const pool: T[] = [];
  // Lay out copies proportional to weight, then trim/pad to the exact size.
  const totalW = templates.reduce((s, t) => s + t.weight, 0);
  for (const t of templates) {
    const copies = Math.max(1, Math.round((t.weight / totalW) * size));
    for (let i = 0; i < copies; i++) pool.push(t);
  }
  while (pool.length > size) pool.pop();
  let i = 0;
  while (pool.length < size) pool.push(templates[i++ % templates.length]);
  return pool;
}

export function buildAllyDeck(size: number): GCard[] {
  return weightedDeck(ALLY_TEMPLATES, size).map((t) => ({
    id: mkId(),
    kind: 'ally' as const,
    name: t.name,
    glyph: t.glyph,
    atk: t.atk,
    hp: t.hp,
    maxHp: t.hp,
    cost: t.cost,
    keywords: t.keywords,
  }));
}

export function buildHordeDeck(size: number): GCard[] {
  return weightedDeck(MON_TEMPLATES, size).map((t) => ({
    id: mkId(),
    kind: 'monster' as const,
    name: t.name,
    glyph: t.glyph,
    atk: t.atk,
    hp: t.hp,
    maxHp: t.hp,
    keywords: t.keywords,
  }));
}

export function buildPortal(stage: number, hp: number, wave: number, boost: number): GCard {
  return {
    id: mkId(),
    kind: 'portal',
    name: `Portal · Stage ${stage}`,
    glyph: stage === 1 ? 'I' : 'II',
    atk: 0,
    hp,
    maxHp: hp,
    stage,
    wave,
    boost,
  };
}

export function buildOutsider(hp: number, atk: number): GCard {
  return {
    id: mkId(),
    kind: 'outsider',
    name: 'The Outsider',
    glyph: '☠',
    atk,
    hp,
    maxHp: hp,
    keywords: ['trample'],
  };
}

// ── Tutorial ──────────────────────────────────────────────────────────────────
// A fixed, hand-authored opening so the walkthrough's highlights and prompts line
// up with real cards. No randomness: same board every time.

// Tutorial cards stay vanilla (no keywords) so the first lesson isn't cluttered.
function mkAlly(name: string, glyph: string, cost: number, atk: number, hp: number): GCard {
  return { id: mkId(), kind: 'ally', name, glyph, atk, hp, maxHp: hp, cost };
}
function mkMon(name: string, glyph: string, atk: number, hp: number): GCard {
  return { id: mkId(), kind: 'monster', name, glyph, atk, hp, maxHp: hp };
}

export interface TutorialDeal {
  cards: GCard[];
  initial: Record<string, number[]>;
  ids: { grunt: number; portal: number; outsider: number; footman: number; skirmisher: number; warden: number; recruit: number };
}

export function buildTutorialDeal(): TutorialDeal {
  resetIds();
  const footman = mkAlly('Footman', '♦', 2, 2, 3);
  const skirmisher = mkAlly('Skirmisher', '↟', 2, 3, 1);
  const warden = mkAlly('Warden', '⛨', 3, 1, 6);
  const recruit = mkAlly('Recruit', '†', 1, 1, 1);
  const portal = buildPortal(1, 6, 1, 3);
  const outsider = buildOutsider(8, 4);
  const grunt = mkMon('Grunt', '●', 2, 2);
  // A small draw pile so the deck counter and the draw-on-kill both read true.
  const deck = Array.from({ length: 8 }, () => mkAlly('Footman', '♦', 2, 2, 3));

  const cards = [footman, skirmisher, warden, recruit, ...deck, portal, outsider, grunt];
  return {
    cards,
    initial: {
      mon0: [grunt.id],
      portal: [portal.id],
      reserve: [outsider.id],
      hand: [footman.id, skirmisher.id, warden.id, recruit.id],
      deck: deck.map((c) => c.id),
    },
    ids: {
      grunt: grunt.id,
      portal: portal.id,
      outsider: outsider.id,
      footman: footman.id,
      skirmisher: skirmisher.id,
      warden: warden.id,
      recruit: recruit.id,
    },
  };
}
