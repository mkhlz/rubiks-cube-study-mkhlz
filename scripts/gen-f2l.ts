/**
 * Generates src/data/f2l.ts: one algorithm for each of the 41 F2L cases
 * (front-right slot). Cases are enumerated from every placement of the FR
 * corner and edge in the top layer or the slot, then solved with a
 * bidirectional search over <R, U, F> that keeps the cross and the other
 * three slots intact. Run with: npx tsx scripts/gen-f2l.ts
 */
import { writeFileSync } from 'node:fs';
import {
  applyMoveMut,
  cloneState,
  CubeState,
  invertAlg,
  Mat3,
  mulVec,
  parseMove,
  quarterMatrix,
  solvedState,
  Vec3,
} from '../src/cube/engine';
import { f2lSignature } from '../src/cube/cases';

const MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'].map(parseMove);

const isF2LPiece = (h: Vec3) => h[1] <= 0 && !(h[0] === 0 && h[2] === 0);
const eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const CORNER: Vec3 = [1, -1, 1];
const EDGE: Vec3 = [1, 0, 1];

function reduced(): CubeState {
  return { cubies: solvedState().cubies.filter((c) => isF2LPiece(c.home)) };
}

const key = (s: CubeState) => s.cubies.map((c) => c.pos.join('') + c.rot.join('')).join('|');

// All 24 proper rotations.
function rotations(): Mat3[] {
  const seen = new Map<string, Mat3>();
  const queue: Mat3[] = [[1, 0, 0, 0, 1, 0, 0, 0, 1]];
  while (queue.length) {
    const m = queue.pop()!;
    const k = m.join();
    if (seen.has(k)) continue;
    seen.set(k, m);
    for (let a = 0; a < 3; a++) {
      const q = quarterMatrix(a as 0 | 1 | 2, 1);
      const r = new Array(9).fill(0) as Mat3;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) for (let t = 0; t < 3; t++) r[i * 3 + j] += q[i * 3 + t] * m[t * 3 + j];
      queue.push(r);
    }
  }
  return [...seen.values()];
}

const ROTS = rotations();
const placements = (home: Vec3, targets: Vec3[]) =>
  targets.flatMap((p) => ROTS.filter((m) => eq(mulVec(m, home), p)).map((rot) => ({ pos: p, rot })));

const cornerSpots: Vec3[] = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1], CORNER];
const edgeSpots: Vec3[] = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0], EDGE];

// Backward table: every reduced state within DEPTH moves of solved -> path back to solved.
const DEPTH = 6;
const table = new Map<string, string[]>();
{
  let frontier: { s: CubeState; path: string[] }[] = [{ s: reduced(), path: [] }];
  table.set(key(frontier[0].s), []);
  for (let d = 0; d < DEPTH; d++) {
    const next: typeof frontier = [];
    for (const { s, path } of frontier)
      for (const m of MOVES) {
        if (path.length && path[0][0] === m.name[0]) continue;
        const t = cloneState(s);
        applyMoveMut(t, m);
        const k = key(t);
        if (table.has(k)) continue;
        // path from t back to solved: inverse of m, then path
        const p = [invertAlg(m.name), ...path];
        table.set(k, p);
        next.push({ s: t, path: p });
      }
    frontier = next;
  }
}

function score(alg: string[]): number {
  let sc = alg.length * 10;
  for (const t of alg) {
    if (t[0] === 'F') sc += t.endsWith('2') ? 5 : 2;
    if (t === 'R2') sc += 2;
  }
  // Prefer starting with an AUF or R/F rather than ending with one.
  if (alg.length && alg[alg.length - 1][0] === 'U') sc += 3;
  return sc;
}

function solve(start: CubeState): string[] {
  let best: string[] | null = null;
  let frontier: { s: CubeState; path: string[] }[] = [{ s: start, path: [] }];
  for (let d = 0; d <= DEPTH; d++) {
    for (const { s, path } of frontier) {
      const back = table.get(key(s));
      if (back) {
        const full = simplify([...path, ...back]);
        if (!best || score(full) < score(best)) best = full;
      }
    }
    if (best && d >= best.length - DEPTH + 1) break;
    const next: typeof frontier = [];
    for (const { s, path } of frontier)
      for (const m of MOVES) {
        if (path.length && path[path.length - 1][0] === m.name[0]) continue;
        const t = cloneState(s);
        applyMoveMut(t, m);
        next.push({ s: t, path: [...path, m.name] });
      }
    frontier = next;
  }
  if (!best) throw new Error('no solution');
  return best;
}

/** Merge consecutive same-face turns (forward and backward halves can meet on one face). */
function simplify(tokens: string[]): string[] {
  const amt = (t: string) => (t.endsWith('2') ? 2 : t.endsWith("'") ? 3 : 1);
  const out: string[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (last && last[0] === t[0]) {
      out.pop();
      const n = (amt(last) + amt(t)) % 4;
      if (n) out.push(t[0] + ['', '', '2', "'"][n]);
    } else out.push(t);
  }
  return out;
}

const cases = new Map<string, { state: CubeState; group: string }>();
for (const c of placements(CORNER, cornerSpots))
  for (const e of placements(EDGE, edgeSpots)) {
    const s = reduced();
    const corner = s.cubies.find((x) => eq(x.home, CORNER))!;
    const edge = s.cubies.find((x) => eq(x.home, EDGE))!;
    corner.pos = c.pos;
    corner.rot = c.rot;
    edge.pos = e.pos;
    edge.rot = e.rot;
    const sig = f2lSignature(s);
    if (cases.has(sig)) continue;
    const cIn = eq(c.pos, CORNER);
    const eIn = eq(e.pos, EDGE);
    const group = cIn && eIn ? 'Both in slot' : cIn ? 'Corner in slot' : eIn ? 'Edge in slot' : 'Both in top layer';
    cases.set(sig, { state: s, group });
  }

const solvedSig = f2lSignature(reduced());
const results: { group: string; alg: string }[] = [];
for (const [sig, { state, group }] of cases) {
  if (sig === solvedSig) continue;
  results.push({ group, alg: solve(state).join(' ') });
}

const ORDER = ['Both in top layer', 'Edge in slot', 'Corner in slot', 'Both in slot'];
results.sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || a.alg.split(' ').length - b.alg.split(' ').length);

console.log(`${results.length} cases`);
const body = results
  .map((r, i) => `  { id: 'F2L ${i + 1}', set: 'F2L', name: 'F2L ${i + 1}', group: '${r.group}', alg: "${r.alg}" },`)
  .join('\n');
writeFileSync(
  new URL('../src/data/f2l.ts', import.meta.url),
  `// Generated by scripts/gen-f2l.ts — do not edit by hand.\nimport type { Alg } from './algs';\n\nexport const F2L: Alg[] = [\n${body}\n];\n`,
);
