/** Every number quoted in the Theory chapters, checked. */
import { describe, expect, it } from 'vitest';
import { applyAlg, applyMoveMut, cloneState, facelets, parseMove, solvedState, tokenize } from '../src/cube/engine';
import { existsSync } from 'node:fs';
import { CHAPTERS, DISTANCES, WR_SINGLE } from '../src/data/theory';
import { PHOTOS } from '../src/data/photos';

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
  it('positions at distance 0-4 (HTM), counted by breadth-first search', () => {
    const moves = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap((f) => [f, f + "'", f + '2']).map(parseMove);
    const seen = new Set([facelets(S)]);
    let frontier = [S];
    const counts = [1];
    for (let d = 1; d <= 4; d++) {
      const next = [];
      for (const s of frontier)
        for (const m of moves) {
          const t = cloneState(s);
          applyMoveMut(t, m);
          const k = facelets(t);
          if (!seen.has(k)) {
            seen.add(k);
            next.push(t);
          }
        }
      counts.push(next.length);
      frontier = next;
    }
    expect(counts).toEqual(DISTANCES.slice(0, 5).map((d) => d[2]));
    // exact counts sum to less than the total; estimates add up to roughly the total
    const total = DISTANCES.reduce((a, d) => a + d[2], 0);
    expect(Math.abs(total / 43252003274489856000 - 1)).toBeLessThan(0.02);
  });
  it('family and supercube counts', () => {
    expect((fact(7) * 3n ** 6n).toString()).toBe('3674160');
    expect(4n ** 6n / 2n).toBe(2048n);
    const four = fact(7) * 3n ** 6n * fact(24) * (fact(24) / 24n ** 6n);
    expect(four.toString().slice(0, 2)).toBe('74');
    expect(four.toString()).toHaveLength(46); // 7.4 x 10^45
  });
  it('record milestones only ever get faster', () => {
    for (let i = 1; i < WR_SINGLE.length; i++) {
      expect(WR_SINGLE[i][0]).toBeGreaterThan(WR_SINGLE[i - 1][0]);
      expect(WR_SINGLE[i][1]).toBeLessThan(WR_SINGLE[i - 1][1]);
    }
  });
  it('every photo is self-hosted and credited', () => {
    for (const p of Object.values(PHOTOS)) {
      expect(existsSync(`public/photos/${p.file}`), p.file).toBe(true);
      expect(p.author && p.license && p.alt && p.source.startsWith('https://commons.wikimedia.org/')).toBeTruthy();
    }
  });
});
