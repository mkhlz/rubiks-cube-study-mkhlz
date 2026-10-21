import { describe, expect, it } from 'vitest';
import { moveFor, simplifyMoves } from '../src/cube/renderer';
import { applyAlg, facelets, invertToken, parseMove, solvedState } from '../src/cube/engine';

describe('renderer helpers', () => {
  it('simplifies cancelling and merging turns', () => {
    expect(simplifyMoves(['R', "R'", 'U', 'U', 'F', 'F2', "F'"])).toEqual(['U2', 'F2']);
    expect(simplifyMoves(['R', 'r', "R'"])).toEqual(['R', 'r', "R'"]);
  });
  it('a rewind (reverse inverse of the simplified trail) returns to the start', () => {
    const trail = ['R', 'U', "U'", 'F2', 'x', "R'", "R'", 'M', 'y'];
    const s = applyAlg(solvedState(), trail.join(' '));
    const back = applyAlg(s, simplifyMoves(trail).reverse().map(invertToken).join(' '));
    expect(facelets(back)).toBe(facelets(solvedState()));
  });
  it('drag mapping matches the move definitions', () => {
    for (const axis of [0, 1, 2] as const)
      for (const layer of [-1, 0, 1])
        for (const positive of [true, false]) {
          const m = parseMove(moveFor(axis, layer, positive));
          expect(m.axis).toBe(axis);
          expect(m.layers).toEqual([layer]);
          expect(m.quarter).toBe(positive ? 1 : 3);
        }
  });
});
