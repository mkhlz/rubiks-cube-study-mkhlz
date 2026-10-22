/**
 * Practice puzzles, from "undo one move" to a 20-move pattern.
 * Solve-in-N pars are true optimal move counts (scripts/gen-puzzles.ts);
 * the others reuse the app's verified algorithms, so a par is always
 * achievable. tests/puzzles.test.ts checks every reference solution.
 */
import { applyAlg, CubeState, facelets, invertAlg, isF2LSolved, isSolved, isTopOriented, solvedState, tokenize } from '../cube/engine';
import { F2L, OLL2, PLL2 } from './algs';
import { SOLVE_IN_N } from './puzzles-solve';

export type Level = 'easy' | 'medium' | 'hard';
export type Kind = 'solve' | 'f2l' | 'oll' | 'pll' | 'pattern';

export interface Puzzle {
  id: string;
  level: Level;
  kind: Kind;
  title: string;
  /** Applied to a solved cube to get the start position. */
  start: string;
  /** A reference solution from the start position; its length is the par. */
  solution: string;
  par: number;
  /** For patterns: the algorithm that makes the target from solved. */
  target?: string;
  /** For orientation puzzles: only the yellow cross (edges) is required. */
  edgesOnly?: boolean;
}

export const KINDS: Record<Kind, { label: string; goal: string }> = {
  solve: { label: 'Solve in N', goal: 'Solve the cube in as few moves as the par. Every par here is the true minimum.' },
  f2l: { label: 'F2L pair', goal: 'Insert the front-right corner and edge pair without breaking the cross or the other slots.' },
  oll: { label: 'Orient', goal: 'Make the whole top face yellow, keeping the first two layers solved.' },
  pll: { label: 'Permute', goal: 'Finish the cube: the top is already yellow, now put every piece in place.' },
  pattern: { label: 'Pattern', goal: 'Starting from solved, recreate the pattern shown. Any orientation counts.' },
};

const ROTATIONS = ['', 'x', 'x2', "x'", 'z', "z'"].flatMap((a) => ['', 'y', 'y2', "y'"].map((b) => `${a} ${b}`.trim()));

/**
 * Half-turn metric, as the solve-in-N pars are measured: a slice (M, E, S)
 * is two face turns, whole-cube rotations are free, anything else is one.
 */
export const moveCost = (m: string) => (/^[xyz]/.test(m) ? 0 : /^[MES]/.test(m) ? 2 : 1);
export const countMoves = (moves: string[]) => moves.reduce((a, m) => a + moveCost(m), 0);

const PATTERNS: [string, string][] = [
  ['Checkerboard', 'M2 E2 S2'],
  ['Six spots', "U D' R L' F B' U D'"],
  ['Four spots', "F2 B2 U D' R2 L2 U D'"],
  ['Stripes', 'F2 B2 L2 R2'],
  ['Tetris', "L R F B U' D' L' R'"],
  ['Wire', 'R L F B R L F B R L F B R2 B2 L2 R2 B2 L2'],
  ['Cube in a cube', "F L F U' R U F2 L2 U' L' B D' B' L2 U"],
  ['Superflip', "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"],
];

const lvl = (n: number, easy: number, medium: number): Level => (n <= easy ? 'easy' : n <= medium ? 'medium' : 'hard');
const pad = (n: number) => String(n).padStart(2, '0');

export const PUZZLES: Puzzle[] = [
  ...SOLVE_IN_N.map(([n, scr], i): Puzzle => ({
    id: `solve-${pad(i + 1)}`,
    level: lvl(n, 3, 5),
    kind: 'solve',
    title: `Solve in ${n}`,
    start: scr,
    solution: invertAlg(scr),
    par: n,
  })),
  ...F2L.map((a, i): Puzzle => {
    const n = countMoves(tokenize(a.alg));
    return { id: `f2l-${pad(i + 1)}`, level: lvl(n, 4, 8), kind: 'f2l', title: `Pair ${i + 1}`, start: invertAlg(a.alg), solution: a.alg, par: n };
  }),
  ...OLL2.map((a, i): Puzzle => ({
    id: `oll-${pad(i + 1)}`,
    level: 'medium',
    kind: 'oll',
    title: a.group === 'Edge orientation' ? `Cross: ${a.name}` : `Corners: ${a.name}`,
    start: invertAlg(a.alg),
    solution: a.alg,
    par: countMoves(tokenize(a.alg)),
    edgesOnly: a.group === 'Edge orientation' || undefined,
  })),
  ...PLL2.map((a, i): Puzzle => ({ id: `pll-${pad(i + 1)}`, level: 'hard', kind: 'pll', title: a.name, start: invertAlg(a.alg), solution: a.alg, par: countMoves(tokenize(a.alg)) })),
  ...PATTERNS.map(([name, a], i): Puzzle => {
    const n = countMoves(tokenize(a));
    return { id: `pattern-${pad(i + 1)}`, level: lvl(n, 8, 15), kind: 'pattern', title: name, start: '', solution: a, par: n, target: a };
  }),
];


export const PUZZLE_BY_ID = new Map(PUZZLES.map((p) => [p.id, p]));

export const startOf = (p: Puzzle): CubeState => applyAlg(solvedState(), p.start);

/** The four top edges show the U centre's colour. */
function topCross(s: CubeState) {
  const f = facelets(s);
  return [1, 3, 5, 7].every((i) => f[i] === f[4]);
}

/** Has the puzzle's goal been reached? */
export function isDone(p: Puzzle, s: CubeState): boolean {
  switch (p.kind) {
    case 'solve':
    case 'pll':
      return isSolved(s);
    case 'f2l':
      return isF2LSolved(s);
    case 'oll':
      return isF2LSolved(s) && (p.edgesOnly ? topCross(s) : isTopOriented(s));
    case 'pattern': {
      const target = facelets(applyAlg(solvedState(), p.target!));
      return ROTATIONS.some((r) => facelets(r ? applyAlg(s, r) : s) === target);
    }
  }
}

/** 3 stars at or under par, 2 within two moves, otherwise 1. */
export const starsFor = (p: Puzzle, moves: number) => (moves <= p.par ? 3 : moves <= p.par + 2 ? 2 : 1);
