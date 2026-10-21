import { describe, expect, it } from 'vitest';
import { applyAlg, isF2LSolved, isSolved, solvedState, tokenize } from '../src/cube/engine';
import { randomScramble } from '../src/cube/scramble';
import { applyPlan, solve } from '../src/cube/solver';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe('guided solver', () => {
  it('solves 300 random scrambles, every stage in order', () => {
    const rand = seeded(7);
    let total = 0;
    let worst = 0;
    for (let i = 0; i < 300; i++) {
      const scr = randomScramble(25, rand);
      const start = applyAlg(solvedState(), scr);
      const plan = solve(start);
      expect(isSolved(applyPlan(start, plan)), scr).toBe(true);
      // After the middle-layer stage the first two layers must be done.
      let s = start;
      for (const st of plan.stages) {
        for (const x of st.steps) s = applyAlg(s, x.moves);
        if (st.id === 'middle') expect(isF2LSolved(s), scr).toBe(true);
      }
      expect(plan.stages.map((s) => s.id)).toEqual(['orient', 'cross', 'corners', 'middle', 'ycross', 'yface', 'ycorners', 'yedges']);
      total += plan.moveCount;
      worst = Math.max(worst, plan.moveCount);
    }
    // Sanity: a beginner solve is long but bounded.
    expect(total / 300).toBeLessThan(170);
    expect(worst).toBeLessThan(260);
    console.log(`avg ${(total / 300).toFixed(1)} moves, worst ${worst}`);
  }, 120_000);

  it('works from any orientation (rotations and slice moves)', () => {
    const rand = seeded(99);
    for (let i = 0; i < 60; i++) {
      const extra = ['x', "z'", 'M', 'y2 E', "S x2", "r u'"][i % 6];
      const start = applyAlg(solvedState(), `${randomScramble(20, rand)} ${extra}`);
      const plan = solve(start);
      expect(isSolved(applyPlan(start, plan))).toBe(true);
    }
  });

  it('a solved cube needs no moves except notes', () => {
    const plan = solve(solvedState());
    expect(plan.moveCount).toBe(0);
    expect(plan.stages.every((s) => s.steps.length > 0)).toBe(true);
  });

  it('every step explains itself', () => {
    const plan = solve(applyAlg(solvedState(), "R U F' L2 D B' R2 U' F2 L D2 B U2 R' F"));
    for (const st of plan.stages) for (const x of st.steps) {
      expect(x.text.length).toBeGreaterThan(10);
      expect(() => tokenize(x.moves)).not.toThrow();
    }
  });
});
