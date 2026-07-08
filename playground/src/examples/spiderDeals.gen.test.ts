import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { byIdMap, deal, isWon, move, dealRow, type SpiderState } from './spiderRules';
import { solveGame, type AutoAction } from './spiderAuto';
import { encodeSolution, seededDeck } from './spiderDeals';

// ── Offline generator for pre-validated Spider deals ────────────────────────
// Regenerate spiderDeals.data.ts with:
//   GEN_SPIDER=1 pnpm exec vitest run src/examples/spiderDeals.gen.test.ts --testTimeout=0
// It walks seeds in order, keeps the ones solveGame can prove winnable, and
// stores each winning line so the demo never has to solve at runtime.

const POOL = 25; // deals per difficulty
const BUDGET_MS = 6000;

function replayWins(state: SpiderState, byId: ReturnType<typeof byIdMap>, actions: AutoAction[]): boolean {
  let s = state;
  for (const act of actions) {
    const next = act.type === 'deal' ? dealRow(s, byId) : move(s, byId, act.id, { type: 'tableau', index: act.dest });
    if (!next) return false;
    s = next;
  }
  return isWon(s);
}

describe.runIf(process.env.GEN_SPIDER)('generate spider deals', () => {
  it('generates and writes spiderDeals.data.ts', () => {
    const pools: Record<number, Array<{ seed: number; solution: number[] }>> = { 1: [], 2: [] };
    for (const suits of [1, 2]) {
      let tried = 0;
      for (let seed = 1; pools[suits].length < POOL && seed < 5000; seed++) {
        tried++;
        const d = deal(seededDeck(suits, seed));
        const byId = byIdMap(d.deck);
        const solution = solveGame(d.state, byId, BUDGET_MS);
        if (!solution) {
          console.error(`suits=${suits} seed=${seed}: rejected`);
          continue;
        }
        if (!replayWins(d.state, byId, solution)) throw new Error(`seed ${seed}: solution does not replay to a win`);
        pools[suits].push({ seed, solution: encodeSolution(solution) });
        console.error(`suits=${suits} seed=${seed}: OK (${pools[suits].length}/${POOL})`);
      }
      console.error(`suits=${suits}: kept ${pools[suits].length}/${tried} seeds`);
      if (pools[suits].length < POOL) throw new Error(`only ${pools[suits].length} deals found for ${suits} suits`);
    }

    const body = `// GENERATED — do not edit by hand. Regenerate with:
//   GEN_SPIDER=1 pnpm exec vitest run src/examples/spiderDeals.gen.test.ts --testTimeout=0
// Each entry: a shuffle seed proven winnable, plus its solved line
// (\`-1\` = deal a row, otherwise \`cardId * 10 + destColumn\`).

export const SPIDER_DEALS: Record<1 | 2, ReadonlyArray<{ seed: number; solution: ReadonlyArray<number> }>> = {
  1: ${JSON.stringify(pools[1])},
  2: ${JSON.stringify(pools[2])},
};
`;
    writeFileSync(join(__dirname, 'spiderDeals.data.ts'), body);
  });
});

describe('spider deal pools', () => {
  it('placeholder so the file is a valid suite when GEN_SPIDER is unset', () => {});
});
