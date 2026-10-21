/**
 * Executes the beginner last-layer instructions exactly as the lessons
 * teach them, on many random last-layer states, to prove the rules work.
 */
import { describe, expect, it } from 'vitest';
import { applyAlg, CubeState, facelets, FACES, FaceName, invertAlg, isF2LSolved, isSolved, solvedState } from '../src/cube/engine';
import { BEG, OLL, PLL } from '../src/data/algs';

const alg = (id: string) => BEG.find((a) => a.id === id)!.alg;
const AUF = ['', 'U', 'U2', "U'"];

function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function randomLL(rand: () => number): CubeState {
  let s = solvedState();
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  for (let i = 0; i < 3; i++) s = applyAlg(s, `${pick(AUF)} ${invertAlg(pick(OLL).alg)} ${pick(AUF)} ${invertAlg(pick(PLL).alg)}`);
  return s;
}

const top = (s: CubeState) => facelets(s).slice(0, 9);
const sideRow = (s: CubeState, f: FaceName) => facelets(s).slice(FACES.indexOf(f) * 9, FACES.indexOf(f) * 9 + 3);
const yellow = (c: string) => c === 'U';

/** Rotate U until pred holds; returns the new state or null if no AUF works. */
function aufUntil(s: CubeState, pred: (s: CubeState) => boolean): CubeState | null {
  for (const u of AUF) {
    const t = applyAlg(s, u);
    if (pred(t)) return t;
  }
  return null;
}

function yellowCross(s: CubeState): { s: CubeState; uses: number } {
  let uses = 0;
  for (let guard = 0; guard < 4; guard++) {
    const u = top(s);
    const e = { back: yellow(u[1]), left: yellow(u[3]), right: yellow(u[5]), front: yellow(u[7]) };
    const n = Object.values(e).filter(Boolean).length;
    if (n === 4) return { s, uses };
    if (n === 2) {
      const line = aufUntil(s, (t) => yellow(top(t)[3]) && yellow(top(t)[5]));
      const ell = aufUntil(s, (t) => yellow(top(t)[1]) && yellow(top(t)[3]));
      s = (line ?? ell)!;
    }
    s = applyAlg(s, alg('Yellow cross'));
    uses++;
  }
  throw new Error('yellow cross did not converge');
}

function yellowFace(s: CubeState): { s: CubeState; uses: number } {
  let uses = 0;
  for (let guard = 0; guard < 5; guard++) {
    const u = top(s);
    const count = [0, 2, 6, 8].filter((i) => yellow(u[i])).length;
    if (count === 4) return { s, uses };
    // Front-left corner: top = U[6], left side = L[2], front side = F[0].
    const want = (t: CubeState) =>
      count === 0 ? yellow(sideRow(t, 'L')[2]) : count === 1 ? yellow(top(t)[6]) : yellow(sideRow(t, 'F')[0]);
    s = aufUntil(s, want)!;
    expect(s, `no AUF satisfies the Sune rule for ${count} corners`).not.toBeNull();
    s = applyAlg(s, alg('Yellow face'));
    uses++;
  }
  throw new Error('yellow face did not converge');
}

const headlights = (s: CubeState, f: FaceName) => sideRow(s, f)[0] === sideRow(s, f)[2];

function corners(s: CubeState): { s: CubeState; uses: number } {
  let uses = 0;
  for (let guard = 0; guard < 3; guard++) {
    const sides = (['F', 'R', 'B', 'L'] as FaceName[]).filter((f) => headlights(s, f));
    if (sides.length === 4) {
      // Line the corners up with the centres.
      const aligned = aufUntil(s, (t) => (['F', 'R', 'B', 'L'] as FaceName[]).every((f) => sideRow(t, f)[0] === f));
      return { s: aligned!, uses };
    }
    if (sides.length === 1) s = aufUntil(s, (t) => headlights(t, 'B'))!;
    s = applyAlg(s, alg('Corners'));
    uses++;
  }
  throw new Error('corners did not converge');
}

function edges(s: CubeState): { s: CubeState; uses: number } {
  let uses = 0;
  for (let guard = 0; guard < 4; guard++) {
    if (isSolved(s)) return { s, uses };
    const bar = (['F', 'R', 'B', 'L'] as const).find((f) => new Set(sideRow(s, f)).size === 1);
    if (bar) s = applyAlg(s, { F: 'y2', R: "y'", B: '', L: 'y' }[bar]);
    s = applyAlg(s, alg('Edges'));
    uses++;
  }
  throw new Error('edges did not converge');
}

describe('beginner last layer method (as taught)', () => {
  it('solves 400 random last layers', () => {
    const rand = seeded(42);
    const maxUses = { cross: 0, face: 0, corners: 0, edges: 0 };
    for (let i = 0; i < 400; i++) {
      let s = randomLL(rand);
      expect(isF2LSolved(s)).toBe(true);
      const a = yellowCross(s);
      const b = yellowFace(a.s);
      const c = corners(b.s);
      const d = edges(c.s);
      s = d.s;
      expect(isSolved(s)).toBe(true);
      maxUses.cross = Math.max(maxUses.cross, a.uses);
      maxUses.face = Math.max(maxUses.face, b.uses);
      maxUses.corners = Math.max(maxUses.corners, c.uses);
      maxUses.edges = Math.max(maxUses.edges, d.uses);
    }
    // The lessons promise these maximums.
    expect(maxUses.cross).toBeLessThanOrEqual(3);
    expect(maxUses.face).toBeLessThanOrEqual(3);
    expect(maxUses.corners).toBeLessThanOrEqual(2);
    expect(maxUses.edges).toBeLessThanOrEqual(3);
  });

  it('second-layer algs only move one middle edge and keep the first layer', () => {
    for (const id of ['Edge right', 'Edge left']) {
      const s = applyAlg(solvedState(), invertAlg(alg(id)));
      const moved = s.cubies.filter((c) => c.home[1] <= 0 && (c.pos.join() !== c.home.join() || c.rot.join() !== '1,0,0,0,1,0,0,0,1'));
      expect(moved.length, id).toBe(1);
      expect(moved[0].home[1], id).toBe(0);
    }
  });
});
