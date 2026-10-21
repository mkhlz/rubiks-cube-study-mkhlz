/** Every number quoted in the Theory chapters, checked. */
import { describe, expect, it } from 'vitest';
import { applyAlg, facelets, solvedState, tokenize } from '../src/cube/engine';
import { CHAPTERS } from '../src/data/theory';

const S = solvedState();
const order = (alg: string) => {
  let s = S;
  for (let i = 1; i < 5000; i++) {
    s = applyAlg(s, alg);
    if (facelets(s) === facelets(S)) return i;
  }
  return -1;
};
const changed = (alg: string) => {
  const s = applyAlg(S, alg);
  const moved = s.cubies.filter((c) => c.pos.join() !== c.home.join() || c.rot.join() !== '1,0,0,0,1,0,0,0,1');
  return {
    corners: moved.filter((c) => c.home.every((v) => v !== 0)).length,
    edges: moved.filter((c) => c.home.filter((v) => v !== 0).length === 2).length,
    displaced: moved.filter((c) => c.pos.join() !== c.home.join()).length,
  };
};
const f = (n: number) => BigInt(n);
const fact = (n: number): bigint => (n <= 1 ? 1n : BigInt(n) * fact(n - 1));

describe('theory facts', () => {
  it('number of positions', () => {
    const n = fact(8) * 3n ** 7n * fact(12) * 2n ** 11n / 2n;
    expect(n.toString()).toBe('43252003274489856000');
    expect((n * 12n).toString()).toBe('519024039293878272000');
    // "about 170 years" with ~8 billion people checking one per second
    const years = Number(n / f(8_000_000_000)) / (365.25 * 24 * 3600);
    expect(Math.round(years / 10) * 10).toBe(170);
  });
  it('Kociemba subgroup sizes', () => {
    expect((fact(8) * fact(8) * fact(4) / 2n).toString()).toBe('19508428800');
    expect((3n ** 7n * 2n ** 11n * 495n).toString()).toBe('2217093120');
  });
  it('orders of sequences', () => {
    expect(order("R U R' U'")).toBe(6);
    expect(order("R' F R F'")).toBe(6);
    expect(order('R U')).toBe(105);
    expect(order("R U2 D' B D'")).toBe(1260);
  });
  it('[R U R\', D] is a pure corner 3-cycle', () => {
    expect(changed("R U R' D R U' R' D'")).toEqual({ corners: 3, edges: 0, displaced: 3 });
  });
  it('superflip: 20 moves, every edge flipped in place, corners solved', () => {
    const sf = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
    expect(tokenize(sf)).toHaveLength(20);
    expect(changed(sf)).toEqual({ corners: 0, edges: 12, displaced: 0 });
  });
  it('the theory text quotes the same numbers', () => {
    const text = JSON.stringify(CHAPTERS);
    for (const s of ['43,252,003,274,489,856,000', '105', '1260', '19,508,428,800', '2,217,093,120']) expect(text).toContain(s);
  });
});
