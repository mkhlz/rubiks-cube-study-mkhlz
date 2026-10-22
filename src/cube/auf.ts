/**
 * Pre-AUF: show a case from a random angle, as it really appears after
 * F2L. The case is the algorithm's inverse followed by a U turn, so the
 * solution is that U turn undone, then the algorithm.
 */
import { invertToken, simplifyMoves, tokenize } from './engine';

export const AUFS = ['', 'U', "U'", 'U2'];

export function withAuf(alg: string, auf: string) {
  const moves = simplifyMoves(tokenize(auf ? `${invertToken(auf)} ${alg}` : alg));
  const first = tokenize(alg)[0];
  return {
    /** Plays from the shown case to solved; an AUF merges into a leading U turn. */
    solution: moves.join(' '),
    /** The opening U turn differs from the plain algorithm's (worth highlighting). */
    adjusted: !!auf && moves[0] !== first,
  };
}
