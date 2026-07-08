import { describe, expect, it } from 'vitest';
import { byIdMap, deal, dealRow, isWon, move } from './spiderRules';
import { decodeSolution, seededDeck } from './spiderDeals';
import { SPIDER_DEALS } from './spiderDeals.data';

// The demo's deals are only as good as this guarantee: every pooled seed must
// deal deterministically and its stored line must replay to a win. If the
// rules engine or the shuffle ever changes, this fails loudly.
describe('pre-validated spider deal pools', () => {
  it('every stored solution replays to a win', () => {
    for (const suits of [1, 2] as const) {
      expect(SPIDER_DEALS[suits].length, `pool for ${suits} suit(s)`).toBeGreaterThanOrEqual(20);
      for (const { seed, solution } of SPIDER_DEALS[suits]) {
        const d = deal(seededDeck(suits, seed));
        const byId = byIdMap(d.deck);
        let s = d.state;
        for (const act of decodeSolution(solution)) {
          const next = act.type === 'deal' ? dealRow(s, byId) : move(s, byId, act.id, { type: 'tableau', index: act.dest });
          if (!next) throw new Error(`suits=${suits} seed=${seed}: stored line hit an illegal action`);
          s = next;
        }
        expect(isWon(s), `suits=${suits} seed=${seed}`).toBe(true);
      }
    }
  });
});
