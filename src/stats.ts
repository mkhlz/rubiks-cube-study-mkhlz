import type { Solve } from './store';

/** Effective time in ms; Infinity for DNF. */
export function effective(s: Solve): number {
  if (s.penalty === 'DNF') return Infinity;
  return s.ms + (s.penalty === '+2' ? 2000 : 0);
}

export function formatTime(ms: number): string {
  if (!isFinite(ms)) return 'DNF';
  const total = ms / 1000;
  if (total < 60) return total.toFixed(2);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/**
 * WCA-style average of the most recent n solves: drop the best and worst
 * (5% each side for n >= 12, at least one), mean of the rest. More than the
 * trimmed amount of DNFs makes the average a DNF. Returns null if too few solves.
 */
export function averageOf(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null;
  const times = solves.slice(0, n).map(effective).sort((a, b) => a - b);
  const trim = n < 12 ? 1 : Math.ceil(n * 0.05);
  const kept = times.slice(trim, n - trim);
  if (kept.some((t) => !isFinite(t))) return Infinity;
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

export function best(solves: Solve[]): number | null {
  if (!solves.length) return null;
  return Math.min(...solves.map(effective));
}

/** Best rolling average of n over the whole history. */
export function bestAverage(solves: Solve[], n: number): number | null {
  let bestAvg: number | null = null;
  for (let i = 0; i + n <= solves.length; i++) {
    const a = averageOf(solves.slice(i), n);
    if (a !== null && (bestAvg === null || a < bestAvg)) bestAvg = a;
  }
  return bestAvg;
}
