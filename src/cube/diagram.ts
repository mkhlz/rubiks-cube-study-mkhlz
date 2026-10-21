/**
 * SVG case diagrams generated from a CubeState, so diagrams always match
 * their algorithm.
 */
import { CubeState, FaceName, facelets, FACES, Sticker, stickers, Vec3 } from './engine';
import { MUTED, STICKER_COLORS } from './colors';

export type DiagramMode = 'full' | 'oll';

/**
 * Top-down last-layer view: U face plus the top row of each side
 * drawn as thin strips (the standard OLL/PLL diagram).
 */
export function llDiagram(s: CubeState, mode: DiagramMode = 'full', size = 120): string {
  const f = facelets(s);
  const up = f[4];
  const col = (c: string) => (mode === 'oll' ? (c === up ? STICKER_COLORS.U : MUTED) : STICKER_COLORS[c as FaceName]);
  const cell = 26;
  const strip = 9;
  const gap = 2;
  const o = strip + gap * 2;
  const total = o * 2 + cell * 3;
  const rects: string[] = [];
  const rect = (x: number, y: number, w: number, h: number, c: string) =>
    rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" stroke="#0d0f14" stroke-width="1.2"/>`);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(o + c * cell, o + r * cell, cell, cell, col(f[r * 3 + c]));
  const side = (face: FaceName) => {
    const i = FACES.indexOf(face) * 9;
    return [f[i], f[i + 1], f[i + 2]];
  };
  // Back strip (B top row reads right-to-left when viewed from above).
  side('B').forEach((c, i) => rect(o + (2 - i) * cell + 2, gap, cell - 4, strip, col(c)));
  side('F').forEach((c, i) => rect(o + i * cell + 2, o + cell * 3 + gap, cell - 4, strip, col(c)));
  side('L').forEach((c, i) => rect(gap, o + i * cell + 2, strip, cell - 4, col(c)));
  side('R').forEach((c, i) => rect(o + cell * 3 + gap, o + (2 - i) * cell + 2, strip, cell - 4, col(c)));
  return `<svg class="diagram" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-label="Last layer diagram">${rects.join('')}</svg>`;
}

/** Isometric view of the U, F and R faces. */
export function isoDiagram(s: CubeState, size = 120, mask?: (home: Vec3) => boolean): string {
  const k = 1 / Math.SQRT2;
  const k6 = 1 / Math.sqrt(6);
  const proj = (p: Vec3): [number, number] => [(p[0] - p[2]) * k, -(-p[0] + 2 * p[1] - p[2]) * k6];
  const homes = new Map(s.cubies.map((c) => [c.id, c.home]));
  const polys: string[] = [];
  const visible: FaceName[] = ['U', 'F', 'R'];
  for (const st of stickers(s) as Sticker[]) {
    if (!visible.includes(st.face)) continue;
    const a = st.face === 'U' ? 1 : st.face === 'R' ? 0 : 2;
    const [t1, t2] = [0, 1, 2].filter((i) => i !== a);
    const corners: Vec3[] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([u, v]) => {
      const p = [...st.pos] as Vec3;
      p[a] = 1.5;
      p[t1] += u * 0.45;
      p[t2] += v * 0.45;
      return p;
    });
    const pts = corners.map(proj).map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
    const on = !mask || mask(homes.get(st.cubie)!);
    polys.push(`<polygon points="${pts}" fill="${on ? STICKER_COLORS[st.color] : MUTED}" stroke="#0d0f14" stroke-width="0.07" stroke-linejoin="round"/>`);
  }
  return `<svg class="diagram" viewBox="-2.3 -2.6 4.6 5.2" width="${size}" height="${size}" role="img" aria-label="Cube diagram"><g>${polys.join('')}</g></svg>`;
}

/** Flat unfolded net (cross layout), used for scramble previews. */
export function netDiagram(s: CubeState, width = 240): string {
  const f = facelets(s);
  const cell = 10;
  const pos: Record<FaceName, [number, number]> = { U: [3, 0], L: [0, 3], F: [3, 3], R: [6, 3], B: [9, 3], D: [3, 6] };
  const rects: string[] = [];
  for (const face of FACES) {
    const [ox, oy] = pos[face];
    const base = FACES.indexOf(face) * 9;
    for (let i = 0; i < 9; i++) {
      const x = (ox + (i % 3)) * cell;
      const y = (oy + Math.floor(i / 3)) * cell;
      rects.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${cell - 1}" height="${cell - 1}" rx="1.5" fill="${STICKER_COLORS[f[base + i] as FaceName]}"/>`);
    }
  }
  return `<svg class="diagram net" viewBox="0 0 ${cell * 12} ${cell * 9}" width="${width}" role="img" aria-label="Scramble preview">${rects.join('')}</svg>`;
}
