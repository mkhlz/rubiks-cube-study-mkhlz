import { describe, expect, it } from 'vitest';
import {
  applyAlg,
  facelets,
  invertAlg,
  isSolved,
  solvedState,
  BASE_MOVES,
  cleanAlg,
} from '../src/cube/engine';
import { randomScramble } from '../src/cube/scramble';

const solved = solvedState();
const key = (alg: string) => facelets(applyAlg(solved, alg));

function order(alg: string): number {
  let s = solved;
  for (let i = 1; i <= 2000; i++) {
    s = applyAlg(s, alg);
    if (isSolved(s) && facelets(s) === facelets(solved)) return i;
  }
  return -1;
}

describe('engine', () => {
  it('solved facelets are in URFDLB order', () => {
    expect(facelets(solved)).toBe('U'.repeat(9) + 'R'.repeat(9) + 'F'.repeat(9) + 'D'.repeat(9) + 'L'.repeat(9) + 'B'.repeat(9));
  });

  it('matches the Kociemba facelet string for R', () => {
    // Well-known: after R on a solved cube.
    expect(key('R')).toBe('UUFUUFUUFRRRRRRRRRFFDFFDFFDDDBDDBDDBLLLLLLLLLUBBUBBUBB');
  });

  it('matches the Kociemba facelet string for U and F', () => {
    expect(key('U')).toBe('UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB');
    expect(key('F')).toBe('UUUUUULLLURRURRURRFFFFFFFFFRRRDDDDDDLLDLLDLLDBBBBBBBBB');
  });

  it('every base move has order 4 and X X\' = identity', () => {
    for (const m of BASE_MOVES) {
      expect(order(m)).toBe(4);
      expect(key(`${m} ${m}'`)).toBe(facelets(solved));
      expect(key(`${m}2`)).toBe(key(`${m} ${m}`));
    }
  });

  it('sexy move has order 6, Sune has order 6, T-perm order 2', () => {
    expect(order("R U R' U'")).toBe(6);
    expect(order("R U R' U R U2 R'")).toBe(6);
    expect(order("R U R' U' R' F R2 U' R' U' R U R' F'")).toBe(2);
  });

  it('wide moves, slices and rotations agree with their definitions', () => {
    expect(key('r')).toBe(key("R M'"));
    expect(key('l')).toBe(key('L M'));
    expect(key('u')).toBe(key("U E'"));
    expect(key('d')).toBe(key('D E'));
    expect(key('f')).toBe(key('F S'));
    expect(key('b')).toBe(key("B S'"));
    expect(key('x')).toBe(key("R M' L'"));
    expect(key('y')).toBe(key("U E' D'"));
    expect(key('z')).toBe(key("F S B'"));
    expect(key('Rw')).toBe(key('r'));
    expect(key("Uw2")).toBe(key('u2'));
  });

  it('alg followed by inverse returns to solved', () => {
    for (let i = 0; i < 50; i++) {
      const s = randomScramble(25);
      expect(key(`${s} ${invertAlg(s)}`)).toBe(facelets(solved));
    }
    const fancy = "r U R' U' M2 U R U' R' U' M' x y' z2 Rw' f2 S E'";
    expect(key(`${fancy} ${invertAlg(fancy)}`)).toBe(facelets(solved));
  });

  it('cleans alg notation', () => {
    expect(cleanAlg("(R U2' R') [Rw' x2]")).toBe("R U2 R' r' x2");
  });

  it('scrambles avoid repeated faces', () => {
    for (let i = 0; i < 100; i++) {
      const t = randomScramble(25).split(' ');
      for (let j = 1; j < t.length; j++) expect(t[j][0]).not.toBe(t[j - 1][0]);
    }
  });
});
