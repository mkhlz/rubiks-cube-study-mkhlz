import { describe, expect, it } from 'vitest';
import { applyAlg, facelets, isF2LSolved, isSolved, isTopOriented, solvedState } from '../src/cube/engine';
import { caseState, f2lSignature, ollSignature, pllSignature } from '../src/cube/cases';
import { F2L, OLL, OLL2, PLL, PLL2, Alg } from '../src/data/algs';

const allAlgs = (a: Alg) => [a.alg, ...(a.alts ?? [])];

/** All F2L pieces other than the front-right pair are home. */
function otherF2LIntact(alg: string): boolean {
  const s = caseState(alg);
  return s.cubies.every((c) => {
    const [x, y, z] = c.home;
    const f2l = y <= 0 && !(x === 0 && z === 0);
    const fr = x === 1 && z === 1 && y <= 0;
    if (!f2l || fr) return true;
    return c.pos.join() === c.home.join() && c.rot.join() === '1,0,0,0,1,0,0,0,1';
  });
}

describe('OLL', () => {
  it('has 57 algorithms', () => expect(OLL).toHaveLength(57));
  for (const a of OLL)
    it(`${a.id} keeps F2L and is a real case`, () => {
      for (const alg of allAlgs(a)) {
        const s = caseState(alg);
        expect(isF2LSolved(s), alg).toBe(true);
        expect(isTopOriented(s), alg).toBe(false);
      }
    });
  it('every OLL is a different case', () => {
    const sigs = OLL.map((a) => ollSignature(caseState(a.alg)));
    const dupes = OLL.filter((_, i) => sigs.indexOf(sigs[i]) !== i).map((a) => a.id);
    expect(dupes).toEqual([]);
  });
  it('alternatives solve the same case', () => {
    for (const a of OLL) for (const alt of a.alts ?? []) expect(ollSignature(caseState(alt))).toBe(ollSignature(caseState(a.alg)));
  });
});

describe('PLL', () => {
  it('has 21 algorithms', () => expect(PLL).toHaveLength(21));
  for (const a of PLL)
    it(`${a.id} keeps F2L + orientation and is a real case`, () => {
      for (const alg of allAlgs(a)) {
        const s = caseState(alg);
        expect(isF2LSolved(s), alg).toBe(true);
        expect(isTopOriented(s), alg).toBe(true);
        // not just an AUF
        const solvedByAuf = ['', 'U', 'U2', "U'"].some((u) => isSolved(applyAlg(s, u)));
        expect(solvedByAuf, alg).toBe(false);
      }
    });
  it('every PLL is a different case', () => {
    const sigs = PLL.map((a) => pllSignature(caseState(a.alg)));
    const dupes = PLL.filter((_, i) => sigs.indexOf(sigs[i]) !== i).map((a) => a.id);
    expect(dupes).toEqual([]);
  });
  it('alternatives solve the same case', () => {
    for (const a of PLL) for (const alt of a.alts ?? []) expect(pllSignature(caseState(alt)), `${a.id}: ${alt}`).toBe(pllSignature(caseState(a.alg)));
  });
});

describe('2-look sets', () => {
  it('2-look OLL edges only touch edges, corners keep edges oriented', () => {
    for (const a of OLL2) {
      const s = caseState(a.alg);
      expect(isF2LSolved(s), a.id).toBe(true);
      expect(isTopOriented(s), a.id).toBe(false);
      if (a.group === 'Corner orientation') {
        const u = facelets(s).slice(0, 9);
        for (const i of [1, 3, 5, 7]) expect(u[i], a.id).toBe(u[4]);
      }
    }
    const co = OLL2.filter((a) => a.group === 'Corner orientation').map((a) => ollSignature(caseState(a.alg)));
    expect(new Set(co).size).toBe(7);
  });
  it('2-look PLL algs are PLLs; edge algs keep corners', () => {
    for (const a of PLL2) {
      const s = caseState(a.alg);
      expect(isF2LSolved(s), a.id).toBe(true);
      expect(isTopOriented(s), a.id).toBe(true);
    }
    expect(new Set(PLL2.map((a) => pllSignature(caseState(a.alg)))).size).toBe(6);
  });
});

describe('F2L', () => {
  it('has 41 cases', () => expect(F2L).toHaveLength(41));
  for (const a of F2L)
    it(`${a.id} only affects the front-right pair`, () => {
      expect(otherF2LIntact(a.alg), a.alg).toBe(true);
      expect(isF2LSolved(caseState(a.alg)), a.alg).toBe(false);
    });
  it('every F2L is a different case', () => {
    const sigs = F2L.map((a) => f2lSignature(caseState(a.alg)));
    expect(new Set(sigs).size).toBe(41);
  });
  it('solved cube is untouched by alg + inverse', () => {
    expect(facelets(applyAlg(caseState(F2L[0].alg), F2L[0].alg))).toBe(facelets(solvedState()));
  });
});
