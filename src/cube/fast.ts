/**
 * "Fastest solution": Kociemba's two-phase algorithm via min2phase.js
 * (cs0x7f, MIT). It finds ~20-move solutions in milliseconds. We then
 * split the answer at the point where the cube enters Kociemba's
 * subgroup G1, so the learner can see the two phases.
 */
import { applyAlg, CubeState, facelets, FaceName, FACES, tokenize } from './engine';
import type { SolvePlan } from './solver';

type Min2Phase = {
  Search: new () => { solution(f: string, maxDepth?: number, probeMax?: number, probeMin?: number): string };
  initFull(): void;
};

let lib: Min2Phase | null = null;

async function load(): Promise<Min2Phase> {
  if (lib) return lib;
  const mod = (await import('min2phase.js')) as unknown as { default?: Min2Phase } & Min2Phase;
  lib = (mod.default ?? mod) as Min2Phase;
  lib.initFull();
  return lib;
}

/** Facelets named by which centre each sticker matches (works for any orientation). */
export function kociembaString(s: CubeState): string {
  const f = facelets(s);
  const map = new Map<string, FaceName>();
  FACES.forEach((face, i) => map.set(f[i * 9 + 4], face));
  return [...f].map((c) => map.get(c)!).join('');
}

const AXES: { faces: string; name: string; label: string }[] = [
  { faces: 'UD', name: 'U/D', label: 'up–down' },
  { faces: 'RL', name: 'R/L', label: 'left–right' },
  { faces: 'FB', name: 'F/B', label: 'front–back' },
];

/** Moves allowed in phase 2 for an axis: any turn of its two faces, half turns elsewhere. */
const inG1Moves = (tok: string, axis: string) => axis.includes(tok[0]) || tok.endsWith('2');

/** Earliest index from which every remaining move stays inside G1 for some axis. */
export function splitPhases(moves: string[]) {
  let best = { at: moves.length, axis: AXES[0] };
  for (const axis of AXES) {
    let k = moves.length;
    while (k > 0 && inG1Moves(moves[k - 1], axis.faces)) k--;
    if (k < best.at) best = { at: k, axis };
  }
  return best;
}

export interface FastResult {
  moves: string[];
  ms: number;
}

/**
 * Solve with min2phase (always <= 21 moves), then, if `polish` is set, retry
 * for 20 and then 19 moves. Each retry has a small probe limit, so it is
 * bounded (~100 ms worst case) instead of searching open-endedly.
 */
export async function solveFast(s: CubeState, polish = true): Promise<FastResult> {
  const m = await load();
  const f = kociembaString(s);
  const t0 = performance.now();
  const first = new m.Search().solution(f, 21);
  if (first.startsWith('Error')) throw new Error(`This cube state isn't solvable (${first}). Was a piece twisted or a sticker moved?`);
  let best = tokenize(first);
  if (polish)
    for (const depth of [20, 19]) {
      if (best.length <= depth) continue;
      const shorter = new m.Search().solution(f, depth, 1000, 0);
      if (shorter.startsWith('Error')) break;
      best = tokenize(shorter);
    }
  return { moves: best, ms: performance.now() - t0 };
}

const fmt = (n: number) => n.toLocaleString('en-US');

/** How many trailing moves stay inside G1 (best axis). */
function g1Tail(moves: string[]) {
  const { at, axis } = splitPhases(moves);
  return { tail: moves.length - at, at, axis };
}

const MIN_VISIBLE_TAIL = 4;

/** Present the two-phase solution in the same plan format as the guided solver. */
export async function fastPlan(s: CubeState, beginnerMoves?: number): Promise<SolvePlan> {
  const polished = await solveFast(s, true);
  let { moves } = polished;
  const ms = polished.ms;
  // Prefer an answer whose phase 2 is visible, if it costs no extra moves.
  if (g1Tail(moves).tail < MIN_VISIBLE_TAIL) {
    const plain = await solveFast(s, false);
    if (plain.moves.length <= moves.length && g1Tail(plain.moves).tail >= MIN_VISIBLE_TAIL) moves = plain.moves;
  }
  if (!moves.length)
    return { stages: [{ id: 'done', title: 'Already solved', lesson: 'p-methods', summary: '', steps: [{ text: 'Nothing to do: the cube is solved.', moves: '', parts: [], focus: [] }] }], moveCount: 0 };
  const { tail, at, axis } = g1Tail(moves);
  const compare = beginnerMoves ? ` The beginner method needs <b>${beginnerMoves}</b> moves on this same cube.` : '';
  const intro = {
    id: 'intro',
    title: 'How the computer sees it',
    lesson: 'p-methods',
    summary: "Kociemba's two-phase algorithm, the method behind most cube-solving robots.",
    steps: [
      {
        text: `Found a <b>${moves.length}-move</b> solution in ${Math.max(1, Math.round(ms))} ms.${compare} No human method works like this: the middle of the solve looks like random noise. The trick is to aim for a <b>halfway house</b>, the subgroup <b>G1</b>, first.`,
        moves: '',
        parts: [],
        focus: [],
      },
    ],
  };
  const outro = {
    text: `🎉 <b>Solved in ${moves.length} moves.</b> Every position can be solved in 20 or fewer ("God's number", proved in 2010), and most need 17–18, so this is close to perfect. Why don't humans do this? Read <a href="#/theory#computers">How computers solve it</a>.`,
    moves: '',
    parts: [],
    focus: [],
  };

  if (tail < MIN_VISIBLE_TAIL) {
    return {
      moveCount: moves.length,
      stages: [
        intro,
        {
          id: 'solution',
          title: 'The solution',
          lesson: 'p-methods',
          summary: 'Phase 1 reaches G1, phase 2 finishes using only U, D and half turns.',
          steps: [
            {
              text: `To go faster, this solver also searches <b>rotated and inverted copies</b> of your cube and keeps the shortest answer. This time the winner came from one of those copies, so the two phases are interleaved instead of sitting in two clean blocks. (On about half of scrambles you'll see a clean phase 2; scramble again to see one.)`,
              moves: moves.join(' '),
              parts: [moves.join(' ')],
              focus: [],
            },
            outro,
          ],
        },
      ],
    };
  }

  const p1 = moves.slice(0, at);
  const p2 = moves.slice(at);
  return {
    moveCount: moves.length,
    stages: [
      intro,
      {
        id: 'phase1',
        title: 'Phase 1 · Reach the subgroup G1',
        lesson: 'p-methods',
        summary: `Fix every edge and corner orientation, and put the 4 middle-slice edges back in their slice (relative to the ${axis.label} axis).`,
        steps: [
          {
            text: p1.length
              ? `Phase 1 doesn't solve anything you can see. It moves the cube into <b>G1</b>: the ${fmt(19508428800)} positions that can be finished using only <code>${axis.faces[0]}</code>/<code>${axis.faces[1]}</code> turns and <b>half turns</b> of the other faces. There are only ${fmt(2217093120)} ways to be "outside" in this sense, so the computer can search them very fast.`
              : `Lucky: this cube is already inside G1 relative to the ${axis.label} axis, so phase 1 needs 0 moves.`,
            moves: p1.join(' '),
            parts: p1.length ? [p1.join(' ')] : [],
            focus: [],
          },
        ],
      },
      {
        id: 'phase2',
        title: 'Phase 2 · Solve inside G1',
        lesson: 'p-methods',
        summary: `Only ${axis.faces[0]}, ${axis.faces[1]} and half turns from here on.`,
        steps: [
          {
            text: `Watch the move set: from now on only <code>${axis.faces[0]}</code>, <code>${axis.faces[1]}</code> and <b>half turns</b> appear, so nothing gets un-oriented again. That restriction is what makes the second search small enough to be quick.`,
            moves: p2.join(' '),
            parts: [p2.join(' ')],
            focus: [],
          },
          outro,
        ],
      },
    ],
  };
}

/** Exposed for tests. */
export function applyFast(s: CubeState, moves: string[]) {
  return applyAlg(s, moves.join(' '));
}
