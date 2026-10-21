/**
 * Cube engine: a 3x3x3 cube modelled as 26 cubies, each with an integer
 * position (-1..1 on every axis) and an integer 3x3 rotation matrix.
 *
 * Coordinates: +x = Right, +y = Up, +z = Front.
 * Every move (face, wide, slice, rotation) is a quarter-turn rotation about
 * one axis applied to the cubies whose coordinate on that axis is in a set
 * of layers. Because everything is integer maths there is no drift.
 */

export type Vec3 = [number, number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number];
export type Axis = 0 | 1 | 2;
export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export interface Cubie {
  id: number;
  home: Vec3;
  pos: Vec3;
  rot: Mat3;
}

export interface CubeState {
  cubies: Cubie[];
}

export interface Move {
  /** Canonical token, e.g. "R", "R'", "R2", "r", "M", "x'". */
  name: string;
  axis: Axis;
  layers: number[];
  /** Number of positive (right-hand rule) quarter turns about +axis: 1, 2 or 3. */
  quarter: 1 | 2 | 3;
}

export const FACES: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_NORMAL: Record<FaceName, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Base definitions: axis, layers and the number of positive quarter turns
 * that equal ONE clockwise turn of that move.
 * R turns F->U which is a negative rotation about +x, so R = 3 positive quarters.
 */
const BASE: Record<string, { axis: Axis; layers: number[]; q: 1 | 3 }> = {
  R: { axis: 0, layers: [1], q: 3 },
  L: { axis: 0, layers: [-1], q: 1 },
  M: { axis: 0, layers: [0], q: 1 },
  U: { axis: 1, layers: [1], q: 3 },
  D: { axis: 1, layers: [-1], q: 1 },
  E: { axis: 1, layers: [0], q: 1 },
  F: { axis: 2, layers: [1], q: 3 },
  B: { axis: 2, layers: [-1], q: 1 },
  S: { axis: 2, layers: [0], q: 3 },
  r: { axis: 0, layers: [0, 1], q: 3 },
  l: { axis: 0, layers: [-1, 0], q: 1 },
  u: { axis: 1, layers: [0, 1], q: 3 },
  d: { axis: 1, layers: [-1, 0], q: 1 },
  f: { axis: 2, layers: [0, 1], q: 3 },
  b: { axis: 2, layers: [-1, 0], q: 1 },
  x: { axis: 0, layers: [-1, 0, 1], q: 3 },
  y: { axis: 1, layers: [-1, 0, 1], q: 3 },
  z: { axis: 2, layers: [-1, 0, 1], q: 3 },
};

export const BASE_MOVES = Object.keys(BASE);

function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0) as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[k * 3 + j];
      r[i * 3 + j] = s;
    }
  return r;
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Rotation matrix for `q` positive quarter turns about `axis`. */
export function quarterMatrix(axis: Axis, q: number): Mat3 {
  // One positive quarter turn (cos=0, sin=1)
  const one: Mat3 =
    axis === 0
      ? [1, 0, 0, 0, 0, -1, 0, 1, 0]
      : axis === 1
        ? [0, 0, 1, 0, 1, 0, -1, 0, 0]
        : [0, -1, 0, 1, 0, 0, 0, 0, 1];
  let m = IDENTITY;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) m = mul(one, m);
  return m;
}

const moveCache = new Map<string, Move>();

/** Parse a single move token such as R, R', R2, Rw, Rw2', r, M2, x'. */
export function parseMove(token: string): Move {
  const cached = moveCache.get(token);
  if (cached) return cached;
  const m = /^([URFDLBMESxyzurfdlb])(w?)(\d*)('?)$/.exec(token.replace(/’/g, "'"));
  if (!m) throw new Error(`Unknown move: "${token}"`);
  let face = m[1];
  if (m[2] === 'w') {
    if (!'URFDLB'.includes(face)) throw new Error(`Bad wide move: "${token}"`);
    face = face.toLowerCase();
  }
  const base = BASE[face];
  const amount = m[3] ? parseInt(m[3], 10) : 1;
  const prime = m[4] === "'";
  let turns = (amount % 4) * (prime ? -1 : 1);
  turns = ((turns % 4) + 4) % 4;
  if (turns === 0) throw new Error(`Null move: "${token}"`);
  const quarter = (((base.q * turns) % 4) + 4) % 4 as 1 | 2 | 3;
  const suffix = turns === 1 ? '' : turns === 2 ? '2' : "'";
  const move: Move = { name: face + suffix, axis: base.axis, layers: base.layers, quarter };
  moveCache.set(token, move);
  return move;
}

/** Split an algorithm string into move tokens. Brackets and commas are ignored. */
export function tokenize(alg: string): string[] {
  return alg
    .replace(/[()[\],]/g, ' ')
    .replace(/’/g, "'")
    .split(/\s+/)
    .filter(Boolean);
}

export function parseAlg(alg: string): Move[] {
  return tokenize(alg).map(parseMove);
}

export function invertToken(token: string): string {
  const m = parseMove(token);
  const face = m.name[0];
  if (m.name.endsWith('2')) return face + '2';
  if (m.name.endsWith("'")) return face;
  return face + "'";
}

export function invertAlg(alg: string): string {
  return tokenize(alg).reverse().map(invertToken).join(' ');
}

/** Normalise an alg string (canonical tokens, single spaces). */
export function cleanAlg(alg: string): string {
  return tokenize(alg).map((t) => parseMove(t).name).join(' ');
}

export function solvedState(): CubeState {
  const cubies: Cubie[] = [];
  let id = 0;
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        cubies.push({ id: id++, home: [x, y, z], pos: [x, y, z], rot: IDENTITY });
      }
  return { cubies };
}

export function cloneState(s: CubeState): CubeState {
  return { cubies: s.cubies.map((c) => ({ ...c, pos: [...c.pos] as Vec3, rot: [...c.rot] as Mat3 })) };
}

export function inLayer(c: Cubie, move: Move): boolean {
  return move.layers.includes(c.pos[move.axis]);
}

/** Apply a move in place. */
export function applyMoveMut(s: CubeState, move: Move): void {
  const R = quarterMatrix(move.axis, move.quarter);
  for (const c of s.cubies) {
    if (!inLayer(c, move)) continue;
    c.pos = mulVec(R, c.pos);
    c.rot = mul(R, c.rot);
  }
}

export function applyAlg(s: CubeState, alg: string | Move[]): CubeState {
  const out = cloneState(s);
  const moves = typeof alg === 'string' ? parseAlg(alg) : alg;
  for (const m of moves) applyMoveMut(out, m);
  return out;
}

export function faceOfNormal(n: Vec3): FaceName {
  if (n[0] === 1) return 'R';
  if (n[0] === -1) return 'L';
  if (n[1] === 1) return 'U';
  if (n[1] === -1) return 'D';
  if (n[2] === 1) return 'F';
  return 'B';
}

/** Sticker index (0..8) of a sticker at world position p on face f, in Kociemba reading order. */
function stickerIndex(f: FaceName, p: Vec3): number {
  const [x, y, z] = p;
  let row: number, col: number;
  switch (f) {
    case 'U': row = z + 1; col = x + 1; break;
    case 'D': row = 1 - z; col = x + 1; break;
    case 'F': row = 1 - y; col = x + 1; break;
    case 'B': row = 1 - y; col = 1 - x; break;
    case 'R': row = 1 - y; col = 1 - z; break;
    case 'L': row = 1 - y; col = z + 1; break;
  }
  return row * 3 + col;
}

export interface Sticker {
  cubie: number;
  /** Colour = the face this sticker belonged to on a solved cube. */
  color: FaceName;
  face: FaceName;
  index: number;
  pos: Vec3;
}

/** Each cubie's stickers as (local normal, colour) on the solved cube. */
export function homeStickers(c: Cubie): { normal: Vec3; color: FaceName }[] {
  const out: { normal: Vec3; color: FaceName }[] = [];
  for (let a = 0; a < 3; a++) {
    if (c.home[a] === 0) continue;
    const n: Vec3 = [0, 0, 0];
    n[a] = c.home[a];
    out.push({ normal: n, color: faceOfNormal(n) });
  }
  return out;
}

export function stickers(s: CubeState): Sticker[] {
  const out: Sticker[] = [];
  for (const c of s.cubies) {
    for (const hs of homeStickers(c)) {
      const n = mulVec(c.rot, hs.normal);
      const face = faceOfNormal(n);
      out.push({ cubie: c.id, color: hs.color, face, index: stickerIndex(face, c.pos), pos: c.pos });
    }
  }
  return out;
}

/** 54-character facelet string in URFDLB order; each char is the sticker's home face. */
export function facelets(s: CubeState): string {
  const arr: string[] = new Array(54);
  for (const st of stickers(s)) arr[FACES.indexOf(st.face) * 9 + st.index] = st.color;
  return arr.join('');
}

export function faceString(f: string, face: FaceName): string {
  const i = FACES.indexOf(face) * 9;
  return f.slice(i, i + 9);
}

/** Solved in any orientation: every face is a single colour. */
export function isSolved(s: CubeState): boolean {
  const f = facelets(s);
  for (let i = 0; i < 6; i++) {
    const face = f.slice(i * 9, i * 9 + 9);
    if (!face.split('').every((c) => c === face[0])) return false;
  }
  return true;
}

/** First two layers solved relative to the centres (D face + bottom two rows of the sides). */
export function isF2LSolved(s: CubeState): boolean {
  const f = facelets(s);
  const center = (face: FaceName) => f[FACES.indexOf(face) * 9 + 4];
  const d = faceString(f, 'D');
  if (!d.split('').every((c) => c === center('D'))) return false;
  for (const face of ['F', 'R', 'B', 'L'] as FaceName[]) {
    const str = faceString(f, face);
    for (let i = 3; i < 9; i++) if (str[i] !== center(face)) return false;
  }
  return true;
}

/** Top face is one colour, matching the U centre. */
export function isTopOriented(s: CubeState): boolean {
  const f = facelets(s);
  const u = faceString(f, 'U');
  return u.split('').every((c) => c === u[4]);
}

/** Quick structural key for comparing states. */
export function stateKey(s: CubeState): string {
  return facelets(s);
}
