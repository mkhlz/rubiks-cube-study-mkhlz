/**
 * Case recognition helpers. A "case" is the state an algorithm solves, i.e.
 * inverse(alg) applied to a solved cube. Signatures are canonical over
 * AUF (U turns before/after) and viewing angle so two algs for the same
 * case get the same signature.
 */
import {
  applyAlg,
  CubeState,
  facelets,
  FACES,
  FaceName,
  invertAlg,
  solvedState,
  stickers,
} from './engine';

const RING: FaceName[] = ['F', 'R', 'B', 'L'];
const U_TURNS = ['', 'U', 'U2', "U'"];
const Y_TURNS = ['', 'y', 'y2', "y'"];

export function caseState(alg: string): CubeState {
  return applyAlg(solvedState(), invertAlg(alg));
}

/** Last-layer stickers (U face + top row of the 4 sides) in a fixed order. */
function llStickers(s: CubeState): string[] {
  const f = facelets(s);
  const out: string[] = [];
  for (let i = 0; i < 9; i++) out.push(f[i]);
  for (const face of RING) {
    const o = FACES.indexOf(face) * 9;
    for (let i = 0; i < 3; i++) out.push(f[o + i]);
  }
  return out;
}

function centerOf(s: CubeState, face: FaceName): FaceName {
  return facelets(s)[FACES.indexOf(face) * 9 + 4] as FaceName;
}

/** Orientation pattern of the last layer (which stickers show the U colour). */
export function ollSignature(s: CubeState): string {
  let best = '';
  for (const pre of U_TURNS) {
    const t = applyAlg(s, pre);
    const up = centerOf(t, 'U');
    const sig = llStickers(t).map((c) => (c === up ? '1' : '0')).join('');
    if (!best || sig < best) best = sig;
  }
  return best;
}

/** Permutation pattern of the last layer, relative to the side centres. */
export function pllSignature(s: CubeState): string {
  let best = '';
  for (const view of Y_TURNS)
    for (const pre of U_TURNS) {
      const sig = relativeLL(applyAlg(s, `${pre} ${view}`));
      if (!best || sig < best) best = sig;
    }
  return best;
}

/**
 * LL side stickers expressed as ring offsets relative to the face they sit on.
 * A post-AUF shifts every offset by the same amount, so offsets are
 * normalised against the first sticker.
 */
function relativeLL(s: CubeState): string {
  const ring = RING.map((f) => centerOf(s, f));
  const f = facelets(s);
  const out: number[] = [];
  RING.forEach((face, fi) => {
    const o = FACES.indexOf(face) * 9;
    for (let i = 0; i < 3; i++) {
      const c = f[o + i] as FaceName;
      const j = ring.indexOf(c);
      out.push(((j - fi) % 4 + 4) % 4);
    }
  });
  // Normalise a uniform offset (post-AUF): subtract the first corner sticker's offset.
  const base = out[0];
  return out.map((v) => ((v - base) % 4 + 4) % 4).join('');
}

/** Location of the front-right F2L corner and edge, canonical over pre-AUF. */
export function f2lSignature(s: CubeState): string {
  let best = '';
  for (const pre of U_TURNS) {
    const t = applyAlg(s, pre);
    const parts: string[] = [];
    for (const st of stickers(t)) {
      // The FR pair pieces are the cubies whose home is (1,-1,1) and (1,0,1).
      const c = t.cubies.find((x) => x.id === st.cubie)!;
      const h = c.home;
      const isCorner = h[0] === 1 && h[1] === -1 && h[2] === 1;
      const isEdge = h[0] === 1 && h[1] === 0 && h[2] === 1;
      if (isCorner || isEdge) parts.push(`${isCorner ? 'c' : 'e'}${st.color}${st.face}${st.index}`);
    }
    const sig = parts.sort().join(',');
    if (!best || sig < best) best = sig;
  }
  return best;
}
