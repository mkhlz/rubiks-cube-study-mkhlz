/**
 * Progress persistence. Everything lives in this browser's localStorage;
 * every access is guarded so private windows / blocked storage still work.
 */
export type AlgStatus = 'new' | 'learning' | 'learned';

export interface Solve {
  ms: number;
  scramble: string;
  at: number;
  penalty?: '+2' | 'DNF';
}

export interface PuzzleResult {
  /** Fewest moves used in a successful attempt. */
  best: number;
  /** Most stars earned (hints cap it). */
  stars: number;
  at: number;
}

export interface SrsCard {
  box: number;
  due: number;
  seen: number;
}

interface Data {
  lessons: Record<string, number>;
  algs: Record<string, AlgStatus>;
  srs: Record<string, SrsCard>;
  solves: Solve[];
  plans: Record<string, Record<string, boolean>>;
  quiz: Record<string, boolean>;
  puzzles: Record<string, PuzzleResult>;
  /** Trainer: recent recognition times (ms) per card, newest last. */
  recog: Record<string, number[]>;
  settings: { speed: number; inspection: boolean; theme: 'auto' | 'light' | 'dark' };
}

const KEY = 'cubecraft-academy-v1';

const defaults = (): Data => ({
  lessons: {},
  algs: {},
  srs: {},
  solves: [],
  plans: {},
  quiz: {},
  puzzles: {},
  recog: {},
  settings: { speed: 220, inspection: true, theme: 'auto' },
});

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return defaults();
  }
}

export const data: Data = load();

const listeners = new Set<() => void>();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function onChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function completeLesson(id: string, done = true) {
  if (done) data.lessons[id] = Date.now();
  else delete data.lessons[id];
  save();
}

export function setAlgStatus(id: string, status: AlgStatus) {
  if (status === 'new') delete data.algs[id];
  else data.algs[id] = status;
  save();
}

export const algStatus = (id: string): AlgStatus => data.algs[id] ?? 'new';

/** Leitner-style spaced repetition. Boxes 0..5, intervals in hours. */
const INTERVALS_H = [0, 4, 24, 72, 168, 504];

export function gradeCard(id: string, grade: 'again' | 'hard' | 'good' | 'easy') {
  const card = data.srs[id] ?? { box: 0, due: 0, seen: 0 };
  if (grade === 'again') card.box = 0;
  else if (grade === 'hard') card.box = Math.max(1, card.box);
  else if (grade === 'good') card.box = Math.min(5, card.box + 1);
  else card.box = Math.min(5, card.box + 2);
  card.seen++;
  card.due = Date.now() + INTERVALS_H[card.box] * 3600_000;
  data.srs[id] = card;
  if (card.box >= 4 && algStatus(id) !== 'learned') data.algs[id] = 'learned';
  else if (card.box < 4 && algStatus(id) === 'new') data.algs[id] = 'learning';
  save();
}

export function addSolve(s: Solve) {
  data.solves.unshift(s);
  save();
}

export function exportData(): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string) {
  const parsed = JSON.parse(json);
  Object.assign(data, defaults(), parsed);
  save();
}

export function resetAll() {
  Object.assign(data, defaults());
  save();
}
