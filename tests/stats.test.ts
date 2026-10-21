import { describe, expect, it } from 'vitest';
import { averageOf, formatTime } from '../src/stats';
import type { Solve } from '../src/store';

const solves = (...t: (number | 'DNF')[]): Solve[] =>
  t.map((x) => (x === 'DNF' ? { ms: 1000, scramble: '', at: 0, penalty: 'DNF' } : { ms: x * 1000, scramble: '', at: 0 }));

describe('stats', () => {
  it('ao5 drops best and worst', () => {
    expect(averageOf(solves(20, 25, 22, 40, 23), 5)).toBeCloseTo(23333.33, 1);
  });
  it('one DNF is dropped, two make the average DNF', () => {
    expect(averageOf(solves(20, 'DNF', 22, 24, 23), 5)).toBeCloseTo(23000, 1);
    expect(averageOf(solves(20, 'DNF', 'DNF', 24, 23), 5)).toBe(Infinity);
  });
  it('needs enough solves', () => expect(averageOf(solves(1, 2), 5)).toBeNull());
  it('formats times', () => {
    expect(formatTime(9876)).toBe('9.88');
    expect(formatTime(75500)).toBe('1:15.50');
    expect(formatTime(Infinity)).toBe('DNF');
  });
});
