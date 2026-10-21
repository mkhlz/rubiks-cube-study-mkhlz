import type { FaceName } from './engine';

/** Yellow top, green front (the standard CFOP viewing orientation). */
export const STICKER_COLORS: Record<FaceName, string> = {
  U: '#ffd500',
  D: '#f4f4f4',
  F: '#00a651',
  B: '#1f5fd1',
  R: '#ff6a13',
  L: '#d1202f',
};

export const COLOR_NAMES: Record<FaceName, string> = {
  U: 'yellow',
  D: 'white',
  F: 'green',
  B: 'blue',
  R: 'orange',
  L: 'red',
};

export const MUTED = '#5b6170';
