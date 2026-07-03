export interface Difficulty {
  key: string;
  name: string;
  blurb: string;
  castleHp: number;
  deckSize: number;
  hordeSize: number;
  /** Two portal stages: destroy stage 1 to reveal stage 2; destroy stage 2 to summon the Outsider. */
  portal: { hp: number; wave: number; boost: number }[];
  baseWave: number; // monsters summoned on turn 1
  maxWave: number; // cap as the assault ramps
  waveRampTurns: number; // +1 wave every N turns
  pillage: number; // cards raiders strip from your deck each turn
  pillageRampTurns: number; // +1 pillage every N turns
  outsiderHp: number;
  outsiderAtk: number;
  handStart: number;
}

// A calm, no-ramp scenario for the guided walkthrough. The board is dealt by
// buildTutorialDeal(); these numbers just feed the HUD and the fight math.
export const TUTORIAL_CFG: Difficulty = {
  key: 'tutorial',
  name: 'Walkthrough',
  blurb: 'A guided first game.',
  castleHp: 30,
  deckSize: 8,
  hordeSize: 8,
  portal: [
    { hp: 6, wave: 1, boost: 3 },
    { hp: 8, wave: 1, boost: 3 },
  ],
  baseWave: 1,
  maxWave: 1,
  waveRampTurns: 99,
  pillage: 1,
  pillageRampTurns: 99,
  outsiderHp: 8,
  outsiderAtk: 4,
  handStart: 4,
};

export const DIFFICULTIES: Difficulty[] = [
  {
    key: 'recruit',
    name: 'Recruit',
    blurb: 'A forgiving siege. Deep deck, tall walls, a slow horde.',
    castleHp: 30,
    deckSize: 44,
    hordeSize: 22,
    portal: [
      { hp: 8, wave: 1, boost: 3 },
      { hp: 10, wave: 2, boost: 3 },
    ],
    baseWave: 1,
    maxWave: 2,
    waveRampTurns: 3,
    pillage: 1,
    pillageRampTurns: 4,
    outsiderHp: 14,
    outsiderAtk: 4,
    handStart: 5,
  },
  {
    key: 'veteran',
    name: 'Veteran',
    blurb: 'The intended fight. Waves build, raiders bite, mana is tight.',
    castleHp: 24,
    deckSize: 40,
    hordeSize: 26,
    portal: [
      { hp: 11, wave: 1, boost: 3 },
      { hp: 14, wave: 2, boost: 2 },
    ],
    baseWave: 1,
    maxWave: 3,
    waveRampTurns: 3,
    pillage: 2,
    pillageRampTurns: 3,
    outsiderHp: 18,
    outsiderAtk: 5,
    handStart: 5,
  },
  {
    key: 'warlord',
    name: 'Warlord',
    blurb: 'A brutal onslaught. Thin deck, low walls, no mercy.',
    castleHp: 20,
    deckSize: 36,
    hordeSize: 30,
    portal: [
      { hp: 14, wave: 2, boost: 2 },
      { hp: 18, wave: 3, boost: 2 },
    ],
    baseWave: 2,
    maxWave: 3,
    waveRampTurns: 2,
    pillage: 2,
    pillageRampTurns: 2,
    outsiderHp: 24,
    outsiderAtk: 6,
    handStart: 4,
  },
];
