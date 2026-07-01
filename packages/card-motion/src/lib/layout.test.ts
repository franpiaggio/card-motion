import { describe, expect, it } from 'vitest';
import { stack, fan, row, stackLayout, fanLayout, rowLayout } from './layout';
import type { CardData, PileLayoutContext } from '../types';

// These layouts don't read the card, but the context type requires one.
const dummyCard: CardData = { id: 0, rank: 'A', suit: '♠', color: 'black' };
const ctx = (over: Partial<PileLayoutContext> = {}): PileLayoutContext => ({
  anchor: { x: 500, y: 300 },
  width: 900,
  height: 600,
  card: dummyCard,
  ...over,
});

describe('stackLayout', () => {
  it('sits the first card exactly on the anchor', () => {
    const t = stackLayout(0, 10, ctx());
    expect(t.x).toBe(500);
    expect(t.y).toBe(300);
  });

  it('offsets each subsequent card for volume, keeping it a tight stack', () => {
    const a = stackLayout(0, 10, ctx());
    const b = stackLayout(9, 10, ctx());
    // Small, monotonic drift — never a big spread.
    expect(b.x).toBeGreaterThan(a.x);
    expect(Math.abs(b.x - a.x)).toBeLessThan(5);
  });
});

describe('fanLayout', () => {
  it('centers a single card on the anchor with no tilt', () => {
    const t = fanLayout(0, 1, ctx());
    expect(t.x).toBe(500);
    expect(t.rotation).toBe(0);
  });

  it('is symmetric: the outer cards mirror around the anchor', () => {
    const first = fanLayout(0, 5, ctx());
    const last = fanLayout(4, 5, ctx());
    expect(first.x + last.x).toBeCloseTo(2 * 500); // mirrored around anchor.x
    expect(first.rotation).toBeCloseTo(-last.rotation); // opposite tilt
  });

  it('puts the middle card of an odd fan straight on the anchor', () => {
    const mid = fanLayout(2, 5, ctx());
    expect(mid.x).toBeCloseTo(500);
    expect(mid.rotation).toBeCloseTo(0);
  });

  it('tightens spacing as the fan grows so it never runs away', () => {
    const spacingFew = fanLayout(1, 2, ctx()).x - fanLayout(0, 2, ctx()).x;
    const spacingMany = fanLayout(1, 20, ctx()).x - fanLayout(0, 20, ctx()).x;
    expect(spacingMany).toBeLessThanOrEqual(spacingFew);
    expect(spacingMany).toBeGreaterThan(0);
  });
});

describe('rowLayout', () => {
  it('centers a single card on the anchor', () => {
    const t = rowLayout(0, 1, ctx());
    expect(t.x).toBe(500);
  });

  it('centers the whole row on the anchor (mean x == anchor.x)', () => {
    const count = 5;
    const xs = Array.from({ length: count }, (_, i) => rowLayout(i, count, ctx()).x);
    const mean = xs.reduce((s, x) => s + x, 0) / count;
    expect(mean).toBeCloseTo(500);
  });

  it('clamps spacing so a big row never overflows the stage', () => {
    const count = 30;
    const xs = Array.from({ length: count }, (_, i) => rowLayout(i, count, ctx({ width: 400 })).x);
    const spread = Math.max(...xs) - Math.min(...xs);
    expect(spread).toBeLessThanOrEqual(400); // stays within the stage width
  });
});

describe('layout factories', () => {
  it('the default instances equal the zero-config factories', () => {
    expect(stackLayout(3, 10, ctx())).toEqual(stack()(3, 10, ctx()));
    expect(fanLayout(1, 5, ctx())).toEqual(fan()(1, 5, ctx()));
    expect(rowLayout(2, 5, ctx())).toEqual(row()(2, 5, ctx()));
  });

  it('stack: honors offset and scale', () => {
    const s = stack({ offset: 2, scale: 0.8 });
    expect(s(0, 10, ctx()).x).toBe(500); // first card on the anchor
    expect(s(3, 10, ctx()).x - s(0, 10, ctx()).x).toBe(6); // 3 × offset
    expect(s(3, 10, ctx()).y - s(0, 10, ctx()).y).toBe(-6); // stacks upward
    expect(s(0, 10, ctx()).scale).toBe(0.8);
  });

  it('fan: honors tilt, dip and maxSpacing', () => {
    const f = fan({ tilt: 10, dip: 0, maxSpacing: 40 });
    expect(f(0, 5, ctx()).rotation).toBeCloseTo(-f(4, 5, ctx()).rotation); // symmetric tilt
    expect(f(4, 5, ctx()).rotation).toBeCloseTo(20); // off 2 × tilt 10
    expect(f(0, 5, ctx()).y).toBe(300); // dip 0 → flat
    expect(f(1, 5, ctx()).x - f(0, 5, ctx()).x).toBeLessThanOrEqual(40); // maxSpacing caps it
  });

  it('row: fixed spacing overrides the width-based clamp, and stays centered', () => {
    const r = row({ spacing: 50, scale: 0.7 });
    expect(r(1, 3, ctx()).x - r(0, 3, ctx()).x).toBe(50);
    const xs = Array.from({ length: 3 }, (_, i) => r(i, 3, ctx()).x);
    expect(xs.reduce((s, x) => s + x, 0) / 3).toBeCloseTo(500); // mean x == anchor.x
    expect(r(0, 3, ctx()).scale).toBe(0.7);
  });
});
