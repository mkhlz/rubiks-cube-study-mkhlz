/**
 * Random-move scrambler (not a WCA random-state scramble): 20-25 face turns,
 * never turning the same face twice in a row and never three turns on one axis.
 */
const FACES = ['U', 'D', 'R', 'L', 'F', 'B'];
const AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
const SUFFIX = ['', "'", '2'];

export function randomScramble(length = 21, rand: () => number = Math.random): string {
  const out: string[] = [];
  const faces: string[] = [];
  while (out.length < length) {
    const f = FACES[Math.floor(rand() * 6)];
    const n = faces.length;
    if (n > 0 && faces[n - 1] === f) continue;
    if (n > 1 && AXIS[faces[n - 1]] === AXIS[f] && AXIS[faces[n - 2]] === AXIS[f]) continue;
    faces.push(f);
    out.push(f + SUFFIX[Math.floor(rand() * 3)]);
  }
  return out.join(' ');
}
