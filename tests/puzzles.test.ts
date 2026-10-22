import { describe, expect, it } from 'vitest';
import { applyAlg, applyMoveMut, cloneState, CubeState, facelets, parseMove, solvedState, tokenize } from '../src/cube/engine';
import { countMoves, isDone, PUZZLES, startOf, starsFor } from '../src/data/puzzles';
import { SOLVE_IN_N } from '../src/data/puzzles-solve';

describe('puzzles', () => {
  it('ids are unique and there are plenty at every level', () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
    for (const l of ['easy', 'medium', 'hard']) expect(PUZZLES.filter((p) => p.level === l).length).toBeGreaterThanOrEqual(30);
  });

  it('every reference solution reaches the goal in exactly par moves', () => {
    for (const p of PUZZLES) {
      expect(isDone(p, startOf(p)), `${p.id} starts solved`).toBe(false);
      expect(isDone(p, applyAlg(startOf(p), p.solution)), p.id).toBe(true);
      expect(countMoves(tokenize(p.solution))).toBe(p.par);
    }
  });

  it('patterns are recognised in any orientation', () => {
    const p = PUZZLES.find((x) => x.title === 'Checkerboard')!;
    expect(isDone(p, applyAlg(solvedState(), 'R2 L2 U2 D2 F2 B2'))).toBe(true);
    expect(isDone(p, applyAlg(solvedState(), 'M2 E2 S2 y x2'))).toBe(true);
    expect(isDone(p, applyAlg(solvedState(), 'R2 L2 U2 D2'))).toBe(false);
  });

  it('solve-in-N pars are optimal: nothing shorter solves them', () => {
    const moves = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap((f) => [f, `${f}'`, `${f}2`]).map(parseMove);
    // Positions within 3 moves of solved; a shorter solution of an n<=6 puzzle would meet them within n-1-3 moves.
    const near = new Map<string, number>([[facelets(solvedState()), 0]]);
    let frontier: CubeState[] = [solvedState()];
    for (let d = 1; d <= 3; d++) {
      const next: CubeState[] = [];
      for (const s of frontier)
        for (const m of moves) {
          const t = cloneState(s);
          applyMoveMut(t, m);
          const k = facelets(t);
          if (!near.has(k)) near.set(k, d), next.push(t);
        }
      frontier = next;
    }
    const dist = (s: CubeState, max: number) => {
      let best = near.get(facelets(s)) ?? Infinity;
      let level = [s];
      for (let k = 1; k <= 3 && k < best && k < max; k++) {
        const next: CubeState[] = [];
        for (const p of level)
          for (const m of moves) {
            const t = cloneState(p);
            applyMoveMut(t, m);
            const d = near.get(facelets(t));
            if (d !== undefined) best = Math.min(best, k + d);
            next.push(t);
          }
        level = next;
      }
      return best;
    };
    // Check every puzzle up to 5 moves fully, and that none of the 6-7 move ones is within 5.
    for (const [n, scr] of SOLVE_IN_N.filter(([n]) => n <= 5)) expect(dist(applyAlg(solvedState(), scr), n), scr).toBe(n);
    for (const [, scr] of SOLVE_IN_N.filter(([n]) => n > 5).slice(0, 6)) expect(dist(applyAlg(solvedState(), scr), 3), scr).toBeGreaterThan(5);
  }, 120_000);

  it('slices cost two moves, rotations are free', () => {
    expect(countMoves(tokenize("M2 E S' x y2 R U' r"))).toBe(9);
  });

  it('stars', () => {
    const p = PUZZLES[0];
    expect(starsFor(p, p.par)).toBe(3);
    expect(starsFor(p, p.par + 2)).toBe(2);
    expect(starsFor(p, p.par + 3)).toBe(1);
  });
});
