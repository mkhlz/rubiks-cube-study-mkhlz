import { describe, expect, it } from 'vitest';
import { applyAlg, invertAlg, isSolved, solvedState } from '../src/cube/engine';
import { AUFS, withAuf } from '../src/cube/auf';
import { F2L, OLL, PLL } from '../src/data/algs';

describe('pre-AUF trainer cases', () => {
  it('the shown case plus the shown solution is solved', () => {
    for (const a of [...PLL, ...OLL.slice(0, 10), ...F2L.slice(0, 10)])
      for (const auf of AUFS) {
        const shown = applyAlg(solvedState(), `${invertAlg(a.alg)} ${auf}`);
        const after = applyAlg(shown, withAuf(a.alg, auf).solution);
        expect(isSolved(after), `${a.id} ${auf}`).toBe(true);
      }
  });
  it('merges the AUF into a leading U turn', () => {
    expect(withAuf("U R U' R'", 'U')).toEqual({ solution: "R U' R'", adjusted: true });
    expect(withAuf("R U R'", '')).toEqual({ solution: "R U R'", adjusted: false });
  });
});
