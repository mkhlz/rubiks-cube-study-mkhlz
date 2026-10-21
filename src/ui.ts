/** Shared UI helpers: escaping, interactive cube players, algorithm cards, modal. */
import { applyAlg, invertAlg, solvedState, tokenize, CubeState } from './cube/engine';
import { CubeView } from './cube/renderer';
import { MASKS } from './cube/masks';
import { isoDiagram, llDiagram } from './cube/diagram';
import { Alg, algKey } from './data/algs';
import { algStatus, data } from './store';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** True when a key event comes from a form field (so page shortcuts should ignore it). */
export function isTyping(e: Event, sel = 'input, textarea, select') {
  const t = e.target as Element | null;
  return !!t?.closest?.(sel);
}

/** Every live CubeView; disposed when the route changes. */
const live = new Set<CubeView>();

export function disposeCubes() {
  live.forEach((v) => v.dispose());
  live.clear();
}

export function track(v: CubeView) {
  live.add(v);
  return v;
}

export function untrack(v: CubeView) {
  live.delete(v);
  v.dispose();
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function algTokensHtml(alg: string) {
  return tokenize(alg)
    .map((t, i) => `<span class="mv" data-i="${i}">${esc(t)}</span>`)
    .join(' ');
}

export interface PlayerOptions {
  setup?: string;
  caseOf?: string;
  play?: string;
  mask?: string;
  caption?: string;
  height?: number;
  interactive?: boolean;
}

export function startState(o: PlayerOptions): CubeState {
  if (o.caseOf) return applyAlg(solvedState(), invertAlg(o.caseOf));
  if (o.setup) return applyAlg(solvedState(), o.setup);
  return solvedState();
}

/**
 * A 3D cube with Reset / Step / Play controls and the algorithm shown with
 * the current move highlighted.
 */
export function cubePlayer(host: HTMLElement, o: PlayerOptions) {
  const wrap = el('div', 'player');
  const stage = el('div', 'stage');
  stage.style.height = `${o.height ?? 300}px`;
  wrap.appendChild(stage);
  const moves = o.play ? tokenize(o.play) : [];
  const bar = el('div', 'player-bar');
  bar.innerHTML = `
    <button class="btn ghost sm" data-a="reset" title="Back to the start">↺ Reset</button>
    ${moves.length ? `<button class="btn ghost sm" data-a="step" title="One move">Step ▸</button><button class="btn sm" data-a="play">▶ Play</button>` : ''}
    <span class="spacer"></span>
    <button class="btn ghost sm" data-a="view" title="Reset camera">⟲ View</button>`;
  wrap.appendChild(bar);
  let algEl: HTMLElement | null = null;
  if (moves.length) {
    algEl = el('div', 'alg-line', algTokensHtml(o.play!));
    wrap.appendChild(algEl);
  }
  if (o.caption) wrap.appendChild(el('p', 'caption', o.caption));
  host.appendChild(wrap);

  const view = track(new CubeView(stage, { interactive: o.interactive !== false, speed: data.settings.speed }));
  if (o.mask && MASKS[o.mask]) view.setMask(MASKS[o.mask]);
  let idx = 0;
  let playing = false;
  const highlight = () => {
    algEl?.querySelectorAll('.mv').forEach((m, i) => {
      m.classList.toggle('done', i < idx);
      m.classList.toggle('now', i === idx && playing);
    });
  };
  const reset = () => {
    playing = false;
    idx = 0;
    view.setState(startState(o));
    highlight();
  };
  reset();

  const stepOnce = async () => {
    if (idx >= moves.length) return false;
    const m = moves[idx];
    highlight();
    await view.turn(m, 'auto');
    idx++;
    highlight();
    return true;
  };

  bar.addEventListener('click', async (e) => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a;
    if (!a) return;
    if (a === 'reset') reset();
    if (a === 'view') view.resetView();
    if (a === 'step' && !view.busy) {
      if (idx >= moves.length) reset();
      playing = true;
      await stepOnce();
      playing = false;
      highlight();
    }
    if (a === 'play' && !playing) {
      if (idx >= moves.length) reset();
      playing = true;
      while (playing && (await stepOnce()));
      playing = false;
      highlight();
    }
  });
  return { view, reset };
}

export function diagramFor(a: Alg, size = 110) {
  const s = applyAlg(solvedState(), invertAlg(a.alg));
  if (a.set === 'F2L') return isoDiagram(s, size, MASKS.f2l);
  if (a.set === 'BEG') {
    if (a.group === 'First layer') return isoDiagram(s, size, MASKS.firstLayer);
    if (a.group === 'Second layer') return isoDiagram(s, size, MASKS.f2l);
  }
  const ollLike = a.set === 'OLL' || a.set === 'OLL2' || a.id === 'Yellow cross' || a.id === 'Yellow face';
  return llDiagram(s, ollLike ? 'oll' : 'full', size);
}

const STATUS_LABEL = { new: 'New', learning: 'Learning', learned: 'Learned' };

export function algCard(a: Alg) {
  const key = algKey(a);
  const st = algStatus(key);
  return `<article class="alg-card status-${st}" data-key="${esc(key)}">
    <button class="diagram-btn" data-act="show" title="Show on 3D cube">${diagramFor(a)}</button>
    <div class="alg-body">
      <div class="alg-head"><h4>${esc(a.name)}</h4><span class="pill">${esc(a.group)}</span></div>
      <div class="alg-text">${esc(a.alg)}</div>
      ${a.alts?.length ? `<div class="alg-alt">alt: ${a.alts.map(esc).join(' · ')}</div>` : ''}
      ${a.tip ? `<p class="alg-tip">${esc(a.tip)}</p>` : ''}
      <div class="alg-actions">
        <button class="status-btn" data-act="status" title="Cycle status">${STATUS_LABEL[st]}</button>
        <button class="btn ghost sm" data-act="show">3D ▶</button>
      </div>
    </div>
  </article>`;
}

let modalEl: HTMLElement | null = null;

export function openModal(title: string, build: (body: HTMLElement) => void) {
  closeModal();
  modalEl = el('div', 'modal-back');
  modalEl.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">✕</button></header>
    <div class="modal-body"></div></div>`;
  document.body.appendChild(modalEl);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl || (e.target as HTMLElement).closest('[data-close]')) closeModal();
  });
  build(modalEl.querySelector('.modal-body')!);
}

const modalCubes = new Set<CubeView>();
export function closeModal() {
  if (!modalEl) return;
  modalCubes.forEach((v) => untrack(v));
  modalCubes.clear();
  modalEl.remove();
  modalEl = null;
}

export function showAlgModal(a: Alg) {
  openModal(a.name, (body) => {
    const p = cubePlayer(body, { caseOf: a.alg, play: a.alg, height: 340, caption: a.tip });
    modalCubes.add(p.view);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
