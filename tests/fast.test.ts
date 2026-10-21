import { describe, expect, it } from 'vitest';
import { applyAlg, isSolved, solvedState } from '../src/cube/engine';
import { randomScramble } from '../src/cube/scramble';
import { applyFast, fastPlan, solveFast, splitPhases } from '../src/cube/fast';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe('fastest solver (two-phase)', () => {
  it('solves random scrambles in at most 21 moves', async () => {
    const rand = seeded(3);
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const s = applyAlg(solvedState(), randomScramble(25, rand));
      const { moves } = await solveFast(s);
      expect(isSolved(applyFast(s, moves))).toBe(true);
      expect(moves.length).toBeLessThanOrEqual(21);
      total += moves.length;
    }
    expect(total / 40).toBeLessThan(21);
  }, 60_000);

  it('works when the cube has been rotated or slice-turned', async () => {
    for (const extra of ['x', "z' M", 'y2 E S', "r u'"]) {
      const s = applyAlg(solvedState(), `R U F' L2 D B' ${extra} R2 U' F2`);
      const { moves } = await solveFast(s);
      expect(isSolved(applyFast(s, moves)), extra).toBe(true);
    }
  });

  it('phase 2 only uses G1 moves', () => {
    const sol = "R2 F2 R' L2 B' U F' L' F' U2 B2 U2 D2 B' L2 F' U2 L2 B L2 D".split(' ');
    const { at, axis } = splitPhases(sol);
    for (const t of sol.slice(at)) expect(axis.faces.includes(t[0]) || t.endsWith('2')).toBe(true);
    expect(at).toBeGreaterThan(0);
  });

  it('builds a plan whose moves solve the cube', async () => {
    const s = applyAlg(solvedState(), "R U F' L2 D B' R2 U' F2 L D2 B U2 R' F");
    const plan = await fastPlan(s, 140);
    const all = plan.stages.flatMap((st) => st.steps.map((x) => x.moves)).join(' ');
    expect(isSolved(applyAlg(s, all))).toBe(true);
    expect(plan.moveCount).toBeLessThanOrEqual(21);
  });
});
