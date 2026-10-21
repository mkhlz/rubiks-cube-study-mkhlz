/**
 * Guided solver using the beginner (layer-by-layer) method taught in the
 * course, so every step it shows is one the learner has seen in a lesson.
 *
 * Everything is computed in world coordinates relative to the centres, so
 * it works from any orientation (after x/y/z rotations or slice moves).
 * The white cross is found with a small IDA* search per edge; the rest
 * follows the exact rules from the lessons (verified by tests).
 */
import {
  applyAlg,
  applyMoveMut,
  cloneState,
  CubeState,
  Cubie,
  FaceName,
  FACE_NORMAL,
  homeStickers,
  Mat3,
  mulVec,
  parseMove,
  quarterMatrix,
  simplifyMoves,
  tokenize,
  Vec3,
  Move,
} from './engine';
import { COLOR_NAMES } from './colors';

export interface SolveStep {
  /** What to do and why, in plain language (HTML allowed: <b>). */
  text: string;
  /** Moves for this step (may be empty for "already done" notes). */
  moves: string;
  /** The same moves split into setup and algorithm, for display. */
  parts: string[];
  /** Home positions of the pieces this step is about (for highlighting). */
  focus: Vec3[];
}

export interface SolveStage {
  id: string;
  title: string;
  lesson: string;
  summary: string;
  steps: SolveStep[];
}

export interface SolvePlan {
  stages: SolveStage[];
  moveCount: number;
}

const TRIGGER = "R U R' U'";
const EDGE_RIGHT = "U R U' R' U' F' U F";
const EDGE_LEFT = "U' L' U L U F U' F'";
const YELLOW_CROSS = "F R U R' U' F'";
const SUNE = "R U R' U R U2 R'";
const A_PERM = "R' F R' B2 R F' R' B2 R2";
const U_PERM = "R U' R U R U R U' R' U' R2";

const AUF = ['', 'U', "U'", 'U2'];
const Y_TURNS = ['', 'y', "y'", 'y2'];

const eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const key = (v: Vec3) => v.join(',');
const isCorner = (h: Vec3) => h.filter((x) => x !== 0).length === 3;
const name = (c: FaceName) => COLOR_NAMES[c];

// ---------- reading the cube relative to its centres ----------

/** World direction of the centre with this colour. */
function centerDir(s: CubeState, color: FaceName): Vec3 {
  const n = FACE_NORMAL[color];
  return s.cubies.find((c) => eq(c.home, n))!.pos;
}

function cubie(s: CubeState, home: Vec3): Cubie {
  return s.cubies.find((c) => eq(c.home, home))!;
}

/** Each sticker's colour and the world direction it faces. */
function stickerDirs(c: Cubie) {
  return homeStickers(c).map((h) => ({ color: h.color, dir: mulVec(c.rot, h.normal) }));
}

function pieceSolved(s: CubeState, home: Vec3): boolean {
  return stickerDirs(cubie(s, home)).every((st) => eq(st.dir, centerDir(s, st.color)));
}

function targetPos(s: CubeState, home: Vec3): Vec3 {
  const t: Vec3 = [0, 0, 0];
  for (const st of homeStickers(cubie(s, home))) {
    const d = centerDir(s, st.color);
    t[0] += d[0];
    t[1] += d[1];
    t[2] += d[2];
  }
  return t;
}

function colorsOf(home: Vec3): FaceName[] {
  return homeStickers({ id: 0, home, pos: home, rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] }).map((h) => h.color);
}

const pieceName = (home: Vec3) => colorsOf(home).sort((a, b) => order(a) - order(b)).map(name).join('-');
const order = (c: FaceName) => ['D', 'U', 'F', 'R', 'B', 'L'].indexOf(c);

/** Try each prefix (e.g. AUFs) and return the first one after which pred holds. */
function firstThat(s: CubeState, prefixes: string[], pred: (t: CubeState) => boolean): string | null {
  for (const p of prefixes) if (pred(applyAlg(s, p))) return p;
  return null;
}

// ---------- IDA* for single cross edges ----------

const FACE_TURNS = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap((f) => [f, f + "'", f + '2']).map(parseMove);
const OPPOSITE: Record<string, string> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

interface Piece {
  pos: Vec3;
  rot: Mat3;
}

function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0) as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

const MOVE_MATS = FACE_TURNS.map((m) => quarterMatrix(m.axis, m.quarter));

function movePiece(p: Piece, m: Move, R: Mat3): Piece {
  if (!m.layers.includes(p.pos[m.axis])) return p;
  return { pos: mulVec(R, p.pos), rot: mul(R, p.rot) };
}

const pkey = (p: Piece) => key(p.pos) + '|' + p.rot.join('');

/** Distance (in face turns) of one piece from its goal, for every one of its 24 states. */
function distanceTable(goal: Piece): Map<string, number> {
  const dist = new Map<string, number>([[pkey(goal), 0]]);
  let frontier = [goal];
  for (let d = 1; frontier.length; d++) {
    const next: Piece[] = [];
    for (const p of frontier)
      FACE_TURNS.forEach((m, i) => {
        const q = movePiece(p, m, MOVE_MATS[i]);
        const k = pkey(q);
        if (!dist.has(k)) {
          dist.set(k, d);
          next.push(q);
        }
      });
    frontier = next;
  }
  return dist;
}

/** Shortest face-turn sequence that solves `target` while keeping `keep` solved. */
function solvePieces(s: CubeState, homes: Vec3[], maxDepth = 10): string[] {
  const goals = homes.map((h) => {
    const t = targetPos(s, h);
    // Goal rotation: the one that maps home stickers onto their centres.
    return { pos: t, rot: solvedRot(s) };
  });
  const tables = goals.map(distanceTable);
  const start = homes.map((h) => {
    const c = cubie(s, h);
    return { pos: c.pos, rot: c.rot } as Piece;
  });
  const h = (ps: Piece[]) => Math.max(...ps.map((p, i) => tables[i].get(pkey(p)) ?? 99));
  const path: number[] = [];
  const search = (ps: Piece[], g: number, bound: number, last: number): boolean => {
    const est = h(ps);
    if (est === 0) return true;
    if (g + est > bound) return false;
    for (let i = 0; i < FACE_TURNS.length; i++) {
      const m = FACE_TURNS[i];
      if (last >= 0) {
        const lf = FACE_TURNS[last].name[0];
        if (lf === m.name[0]) continue;
        // Opposite faces commute: only allow one order.
        if (OPPOSITE[lf] === m.name[0] && 'DLB'.includes(m.name[0]) === false) continue;
      }
      path.push(i);
      if (search(ps.map((p) => movePiece(p, m, MOVE_MATS[i])), g + 1, bound, i)) return true;
      path.pop();
    }
    return false;
  };
  for (let bound = h(start); bound <= maxDepth; bound++) {
    path.length = 0;
    if (search(start, 0, bound, -1)) return path.map((i) => FACE_TURNS[i].name);
  }
  throw new Error('cross search failed');
}

/** The rotation a cubie has when it is solved relative to the current centres. */
function solvedRot(s: CubeState): Mat3 {
  // Columns: where the home x, y, z directions point now (given by the centres).
  const ex = centerDir(s, 'R');
  const ey = centerDir(s, 'U');
  const ez = centerDir(s, 'F');
  return [ex[0], ey[0], ez[0], ex[1], ey[1], ez[1], ex[2], ey[2], ez[2]];
}

// ---------- the plan ----------

export function solve(input: CubeState): SolvePlan {
  let s = cloneState(input);
  const stages: SolveStage[] = [];
  let stage!: SolveStage;
  const begin = (id: string, title: string, lesson: string, summary: string) => {
    stage = { id, title, lesson, summary, steps: [] };
    stages.push(stage);
  };
  /** Each part is shown as its own group: setup turns first, then the algorithm. */
  const step = (text: string, alg: string | string[], focus: Vec3[]) => {
    const parts = (Array.isArray(alg) ? alg : [alg]).map((p) => simplifyMoves(tokenize(p)).join(' ')).filter(Boolean);
    const moves = parts.join(' ');
    s = applyAlg(s, moves);
    stage.steps.push({ text, moves, parts, focus });
  };

  const crossEdges: Vec3[] = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]];
  const whiteCorners: Vec3[] = [[1, -1, 1], [-1, -1, 1], [-1, -1, -1], [1, -1, -1]];
  const middleEdges: Vec3[] = [[1, 0, 1], [-1, 0, 1], [-1, 0, -1], [1, 0, -1]];

  // 0. Hold it the right way up.
  begin('orient', 'Hold the cube', 'b-overview', 'White centre on the bottom, yellow on top.');
  const flip = firstThat(s, ['', 'x2', 'x', "x'", 'z', "z'"], (t) => eq(centerDir(t, 'D'), [0, -1, 0]))!;
  if (flip) step(`Turn the whole cube so the <b>white centre is on the bottom</b> and yellow is on top. Keep it this way up until the end.`, flip, []);
  else step('The white centre is already on the bottom and yellow on top. Keep the cube this way up.', '', []);

  // 1. White cross, one edge at a time (shortest first).
  begin('cross', 'Step 1 · White cross', 'b-cross', 'Put the four white edges on the bottom, each matching its side centre.');
  const done: Vec3[] = [];
  for (let n = 0; n < 4; n++) {
    let best: { home: Vec3; moves: string[] } | null = null;
    for (const e of crossEdges) {
      if (done.some((d) => eq(d, e))) continue;
      const moves = solvePieces(s, [...done, e]);
      if (!best || moves.length < best.moves.length) best = { home: e, moves };
    }
    const { home, moves } = best!;
    const side = colorsOf(home).find((c) => c !== 'D')!;
    const text = moves.length
      ? `Bring the <b>white–${name(side)}</b> edge down between the white and ${name(side)} centres, white sticker facing down (${moves.length} move${moves.length > 1 ? 's' : ''}).`
      : `The <b>white–${name(side)}</b> edge is already in place.`;
    step(text, moves.join(' '), [...done, home]);
    done.push(home);
  }

  // 2. White corners: corner above its slot at front-right, then repeat the trigger.
  begin('corners', 'Step 2 · White corners', 'b-corners', `Put each white corner above its slot at the front-right, then repeat ${TRIGGER}.`);
  for (let guard = 0; guard < 12 && !whiteCorners.every((c) => pieceSolved(s, c)); guard++) {
    const todo = whiteCorners.filter((c) => !pieceSolved(s, c));
    const top = todo.find((c) => cubie(s, c).pos[1] === 1);
    if (!top) {
      const c = todo[0];
      const y = firstThat(s, Y_TURNS, (t) => eq(cubie(t, c).pos, [1, -1, 1]))!;
      step(
        `The <b>${pieceName(c)}</b> corner is stuck in the bottom layer. Turn the cube${y ? ` (<code>${y}</code>)` : ''} so it is at the front-right, then do <code>${TRIGGER}</code> once to lift it into the top layer.`,
        [y, TRIGGER],
        [...crossEdges, ...whiteCorners.filter((w) => pieceSolved(s, w)), c],
      );
      continue;
    }
    const c = top;
    const y = firstThat(s, Y_TURNS, (t) => eq(targetPos(t, c), [1, -1, 1]))!;
    const t1 = applyAlg(s, y);
    const u = firstThat(t1, AUF, (t) => eq(cubie(t, c).pos, [1, 1, 1]))!;
    const t2 = applyAlg(t1, u);
    const white = stickerDirs(cubie(t2, c)).find((x) => x.color === 'D')!.dir;
    const reps = white[0] === 1 ? 1 : white[1] === 1 ? 3 : 5;
    const facing = white[0] === 1 ? 'to the right' : white[1] === 1 ? 'up' : 'towards you';
    const setup = [y && `turn the cube (<code>${y}</code>) so its slot is at the front-right`, u && `turn the top (<code>${u}</code>) so the corner sits right above it`].filter(Boolean).join(', then ');
    step(
      `The <b>${pieceName(c)}</b> corner goes between the ${colorsOf(c).filter((x) => x !== 'D').map(name).join(' and ')} centres. ${setup ? setup[0].toUpperCase() + setup.slice(1) + '. ' : 'It is already above its slot. '}White faces ${facing}, so repeat <code>${TRIGGER}</code> <b>${reps}×</b>.`,
      [y, u, ...Array(reps).fill(TRIGGER)],
      [...crossEdges, ...whiteCorners.filter((w) => pieceSolved(s, w)), c],
    );
  }

  if (!stage.steps.length) step('All four white corners are already solved.', '', [...crossEdges, ...whiteCorners]);

  // 3. Middle layer edges.
  begin('middle', 'Step 3 · Middle layer', 'b-middle', 'Insert the four middle edges with the left or right algorithm.');
  const firstLayer = [...crossEdges, ...whiteCorners];
  for (let guard = 0; guard < 12 && !middleEdges.every((e) => pieceSolved(s, e)); guard++) {
    const todo = middleEdges.filter((e) => !pieceSolved(s, e));
    const top = todo.find((e) => cubie(s, e).pos[1] === 1);
    const solvedMid = () => middleEdges.filter((w) => pieceSolved(s, w));
    if (!top) {
      const e = todo[0];
      const y = firstThat(s, Y_TURNS, (t) => eq(cubie(t, e).pos, [1, 0, 1]))!;
      step(
        `The <b>${pieceName(e)}</b> edge is in the middle layer but in the wrong place or flipped. Turn the cube${y ? ` (<code>${y}</code>)` : ''} so it is at the front-right and do the right-hand algorithm once to kick it out to the top.`,
        [y, EDGE_RIGHT],
        [...firstLayer, ...solvedMid(), e],
      );
      continue;
    }
    const e = top;
    const ed = stickerDirs(cubie(s, e));
    const side = ed.find((x) => x.dir[1] === 0)!.color;
    const up = ed.find((x) => x.dir[1] === 1)!.color;
    const y = firstThat(s, Y_TURNS, (t) => eq(centerDir(t, side), [0, 0, 1]))!;
    const t1 = applyAlg(s, y);
    const u = firstThat(t1, AUF, (t) => eq(cubie(t, e).pos, [0, 1, 1]))!;
    const t2 = applyAlg(t1, u);
    const right = eq(centerDir(t2, up), [1, 0, 0]);
    const setup = [y && `turn the cube (<code>${y}</code>) so the ${name(side)} centre faces you`, u && `turn the top (<code>${u}</code>) to make an upside-down T`].filter(Boolean).join(', then ');
    step(
      `The <b>${pieceName(e)}</b> edge: ${setup ? setup + '. ' : 'it already makes an upside-down T with the front centre. '}Its top colour (${name(up)}) matches the <b>${right ? 'right' : 'left'}</b> centre, so use the ${right ? 'right' : 'left'} algorithm.`,
      [y, u, right ? EDGE_RIGHT : EDGE_LEFT],
      [...firstLayer, ...solvedMid(), e],
    );
  }

  if (!stage.steps.length) step('The middle layer is already solved.', '', [...crossEdges, ...whiteCorners, ...middleEdges]);
  const all = s.cubies.map((c) => c.home);

  // 4. Yellow cross.
  begin('ycross', 'Step 4 · Yellow cross', 'b-yellow-cross', `Look only at the top edges: dot → L → line → cross with ${YELLOW_CROSS}.`);
  const yellowUp = (t: CubeState, h: Vec3) => stickerDirs(cubie(t, h)).some((x) => x.color === 'U' && x.dir[1] === 1);
  const topEdgeAt = (t: CubeState, p: Vec3) => t.cubies.find((c) => eq(c.pos, p))!.home;
  const edgeUp = (t: CubeState, p: Vec3) => yellowUp(t, topEdgeAt(t, p));
  const B: Vec3 = [0, 1, -1], L: Vec3 = [-1, 1, 0], R: Vec3 = [1, 1, 0], F: Vec3 = [0, 1, 1];
  for (let guard = 0; guard < 4; guard++) {
    const n = [B, L, R, F].filter((p) => edgeUp(s, p)).length;
    if (n === 4) {
      if (!stage.steps.length) step('The yellow cross is already there. Nothing to do!', '', all);
      break;
    }
    if (n === 0) step(`No yellow edges on top (a <b>dot</b>). Do <code>${YELLOW_CROSS}</code> from any side to get an L.`, YELLOW_CROSS, all);
    else {
      const line = firstThat(s, AUF, (t) => edgeUp(t, L) && edgeUp(t, R));
      if (line !== null)
        step(`A <b>line</b>. ${line ? `Turn the top (<code>${line}</code>) so the line is horizontal, then do` : 'It is already horizontal; do'} <code>${YELLOW_CROSS}</code>.`, [line, YELLOW_CROSS], all);
      else {
        const ell = firstThat(s, AUF, (t) => edgeUp(t, B) && edgeUp(t, L))!;
        step(`An <b>L</b>. ${ell ? `Turn the top (<code>${ell}</code>) so it is at the back-left, then do` : 'It is already at the back-left; do'} <code>${YELLOW_CROSS}</code> to get a line.`, [ell, YELLOW_CROSS], all);
      }
    }
  }

  // 5. Yellow face (Sune rule).
  begin('yface', 'Step 5 · Yellow face', 'b-yellow-face', `Repeat the Sune (${SUNE}) using the front-left rule.`);
  const cornerAt = (t: CubeState, p: Vec3) => t.cubies.find((c) => eq(c.pos, p))!;
  const topCorners: Vec3[] = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]];
  for (let guard = 0; guard < 5; guard++) {
    const count = topCorners.filter((p) => yellowUp(s, cornerAt(s, p).home)).length;
    if (count === 4) {
      if (!stage.steps.length) step('The whole top is already yellow. Lucky!', '', all);
      break;
    }
    const fl: Vec3 = [-1, 1, 1];
    const yDir = (t: CubeState) => stickerDirs(cornerAt(t, fl)).find((x) => x.color === 'U')!.dir;
    const want: Vec3 = count === 0 ? [-1, 0, 0] : count === 1 ? [0, 1, 0] : [0, 0, 1];
    const u = firstThat(s, AUF, (t) => eq(yDir(t), want))!;
    const rule = count === 0 ? 'no yellow corners on top: front-left corner with yellow facing <b>left</b>' : count === 1 ? 'one yellow corner on top (the fish): put it at the <b>front-left</b>' : `${count} yellow corners on top: front-left corner with yellow facing <b>you</b>`;
    step(`${rule[0].toUpperCase() + rule.slice(1)}. ${u ? `Turn the top (<code>${u}</code>), then do` : 'Already in position; do'} the Sune <code>${SUNE}</code>.`, [u, SUNE], all);
  }

  // 6. Yellow corners (headlights at the back).
  begin('ycorners', 'Step 6 · Yellow corners', 'b-yellow-corners', 'Find headlights, hold them at the back, swap the corners.');
  const cornerColors = (t: CubeState, side: Vec3) =>
    t.cubies
      .filter((c) => c.pos[1] === 1 && isCorner(c.home))
      .flatMap((c) => stickerDirs(c).filter((st) => eq(st.dir, side)).map((st) => st.color));
  const SIDES: Vec3[] = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
  const lights = (t: CubeState, side: Vec3) => {
    const cc = cornerColors(t, side);
    return cc[0] === cc[1];
  };
  for (let guard = 0; guard < 3; guard++) {
    const sides = SIDES.filter((d) => lights(s, d));
    if (sides.length === 4) break;
    if (sides.length === 1) {
      const u = firstThat(s, AUF, (t) => lights(t, [0, 0, -1]))!;
      step(`There are <b>headlights</b> (two matching corner colours) on one side. ${u ? `Turn the top (<code>${u}</code>) so they are at the back, then do` : 'They are already at the back; do'} <code>${A_PERM}</code>.`, [u, A_PERM], all);
    } else step(`No headlights on any side. Do <code>${A_PERM}</code> once from any angle and headlights will appear.`, A_PERM, all);
  }
  const aligned = (t: CubeState) => SIDES.every((d) => cornerColors(t, d).every((c) => eq(centerDir(t, c), d)));
  const au = firstThat(s, AUF, aligned)!;
  step(au ? `All corners match each other. Turn the top (<code>${au}</code>) so they line up with their centres.` : 'All corners are already lined up with their centres.', au, all);

  // 7. Yellow edges (solved bar at the back).
  begin('yedges', 'Step 7 · Yellow edges', 'b-yellow-edges', 'Hold the solved side at the back and cycle the edges.');
  const solvedSide = (t: CubeState, d: Vec3) => {
    const colors = t.cubies.filter((c) => c.pos[1] === 1).flatMap((c) => stickerDirs(c).filter((st) => eq(st.dir, d)).map((st) => st.color));
    return colors.every((c) => eq(centerDir(t, c), d));
  };
  for (let guard = 0; guard < 4; guard++) {
    if (s.cubies.every((c) => pieceSolved(s, c.home))) break;
    const bar = SIDES.find((d) => solvedSide(s, d));
    if (bar) {
      const y = firstThat(s, Y_TURNS, (t) => solvedSide(t, [0, 0, -1]))!;
      step(`One side is completely solved. ${y ? `Turn the cube (<code>${y}</code>) so it is at the <b>back</b>, then do` : 'It is already at the back; do'} <code>${U_PERM}</code>.`, [y, U_PERM], all);
    } else step(`No side is completely solved yet. Do <code>${U_PERM}</code> once from any side; a solved side will appear.`, U_PERM, all);
  }
  if (!s.cubies.every((c) => pieceSolved(s, c.home))) throw new Error('solver did not finish');
  if (!stage.steps.length) step('The edges were already solved.', '', all);
  stage.steps.push({ text: '🎉 <b>Solved!</b> That is the whole beginner method. Scramble again and try it yourself with the steps open.', moves: '', parts: [], focus: all });

  const moveCount = stages.reduce((n, st) => n + st.steps.reduce((k, x) => k + tokenize(x.moves).length, 0), 0);
  return { stages, moveCount };
}

/** Apply a whole plan (for tests). */
export function applyPlan(s: CubeState, plan: SolvePlan): CubeState {
  let t = cloneState(s);
  for (const st of plan.stages) for (const x of st.steps) for (const tok of tokenize(x.moves)) applyMoveMut(t, parseMove(tok));
  return t;
}

export { pieceSolved };
