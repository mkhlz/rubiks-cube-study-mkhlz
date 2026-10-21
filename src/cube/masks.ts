import type { Vec3 } from './engine';
import type { Mask } from './renderer';

const isCenter = (h: Vec3) => h.filter((v) => v !== 0).length === 1;
const isEdge = (h: Vec3) => h.filter((v) => v !== 0).length === 2;

/** Named highlight masks used by lessons: only these pieces keep their colours. */
export const MASKS: Record<string, Mask> = {
  centers: (h) => isCenter(h),
  edges: (h) => isEdge(h) || isCenter(h),
  corners: (h) => !isEdge(h),
  cross: (h) => isCenter(h) || (isEdge(h) && h[1] === -1),
  daisy: (h) => isCenter(h) || (isEdge(h) && h[1] === -1),
  firstLayer: (h) => isCenter(h) || h[1] === -1,
  f2l: (h) => isCenter(h) || h[1] <= 0,
  topEdges: (h) => isCenter(h) || h[1] <= 0 || isEdge(h),
};
