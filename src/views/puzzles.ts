import { CubeView, keyToMove } from '../cube/renderer';
import { applyAlg, invertToken, solvedState, tokenize } from '../cube/engine';
import { isoDiagram, netDiagram } from '../cube/diagram';
import { MASKS } from '../cube/masks';
import { countMoves, isDone, Kind, KINDS, Level, Puzzle, PUZZLE_BY_ID, PUZZLES, startOf, starsFor } from '../data/puzzles';
import { data, save } from '../store';
import { esc, isTyping, track } from '../ui';

const LEVELS: [Level, string, string][] = [
  ['easy', 'Easy', 'Undo a few moves, simple pairs, quick patterns'],
  ['medium', 'Medium', '4-5 move solves, longer pairs, orient the last layer'],
  ['hard', 'Hard', '6-7 move solves, PLL, long patterns'],
];
const FACE_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

const stars = (n: number) => `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
const thumb = (p: Puzzle, size: number) => {
  if (p.kind === 'pattern') return isoDiagram(applyAlg(solvedState(), p.target!), size);
  return isoDiagram(startOf(p), size, p.kind === 'f2l' ? MASKS.f2l : undefined);
};
const goalText = (p: Puzzle) => (p.edgesOnly ? 'Make the yellow cross on top (edges only), keeping the first two layers solved.' : KINDS[p.kind].goal);

/** Practice puzzles: pick one, solve it on the 3D cube, beat the par. */
export function puzzlesView(root: HTMLElement, arg?: string) {
  let current = (arg && PUZZLE_BY_ID.get(arg)) || PUZZLES.find((p) => !data.puzzles[p.id]) || PUZZLES[0];
  let level: Level = current.level;
  let kind: Kind | 'all' = 'all';
  let moves: string[] = [];
  let undoing = false;
  let hints = 0;
  let done = false;

  root.innerHTML = `
    <header class="page-head"><h1>Puzzles</h1>
      <p>Bite-sized challenges for daily practice. Undo a scramble in the fewest moves, insert an F2L pair, finish the last layer, or rebuild a pattern from memory. Beat the par for three stars.</p></header>
    <div class="pz-levels" role="tablist"></div>
    <div class="pz-layout">
      <section class="pz-main panel">
        <div class="pz-head"></div>
        <div class="pz-stage-wrap">
          <div class="stage pz-stage"></div>
          <div class="pz-win" hidden></div>
        </div>
        <div class="pz-status"><span class="badge" id="pz-count"></span><span class="pz-moves" id="pz-moves"></span></div>
        <div class="player-bar">
          <button class="btn ghost sm" data-a="undo" title="Ctrl+Z">↶ Undo</button>
          <button class="btn ghost sm" data-a="reset">↺ Restart</button>
          <button class="btn ghost sm" data-a="hint">💡 Hint</button>
          <button class="btn ghost sm" data-a="view">⟲ View</button>
          <span class="spacer"></span>
          <button class="btn ghost sm" data-a="prev">← Prev</button>
          <button class="btn sm" data-a="next">Next →</button>
        </div>
        <p class="hint pz-hint" id="pz-hint"></p>
        <div class="move-grid">${FACE_MOVES.map((m) => `<button class="move-btn" data-m="${m}">${m}</button>`).join('')}</div>
        <p class="hint small">Drag layers on the cube, tap the buttons, or type: letter = clockwise, <kbd>Shift</kbd>+letter = anticlockwise, <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo. Moves are counted like the par: rotations (<kbd>X</kbd> <kbd>Y</kbd> <kbd>Z</kbd>) are free, slices (<kbd>M</kbd> <kbd>E</kbd> <kbd>S</kbd>) count as two.</p>
      </section>
      <aside class="pz-side">
        <div class="pz-kinds"></div>
        <ol class="pz-list"></ol>
      </aside>
    </div>`;

  const stage = root.querySelector<HTMLElement>('.pz-stage')!;
  const view = track(
    new CubeView(stage, {
      speed: data.settings.speed,
      onMove: (m) => {
        if (undoing) return;
        moves.push(m);
        afterMove();
      },
    }),
  );

  const solvedCount = (l: Level) => PUZZLES.filter((p) => p.level === l && data.puzzles[p.id]).length;
  const totalStars = () => PUZZLES.reduce((a, p) => a + (data.puzzles[p.id]?.stars ?? 0), 0);

  const renderLevels = () => {
    root.querySelector('.pz-levels')!.innerHTML =
      LEVELS.map(([k, name, desc]) => {
        const all = PUZZLES.filter((p) => p.level === k).length;
        const n = solvedCount(k);
        return `<button class="pz-level ${k === level ? 'on' : ''}" data-level="${k}" role="tab" aria-selected="${k === level}">
          <span class="pz-level-name">${name}</span><small>${desc}</small>
          <span class="pz-meter"><i style="width:${(n / all) * 100}%"></i></span><span class="pz-level-count">${n}/${all} solved</span></button>`;
      }).join('') + `<div class="pz-total"><b>${totalStars()}</b><span>of ${PUZZLES.length * 3} ★</span></div>`;
  };

  const listFor = () => PUZZLES.filter((p) => p.level === level && (kind === 'all' || p.kind === kind));

  const renderList = () => {
    const kinds = [...new Set(PUZZLES.filter((p) => p.level === level).map((p) => p.kind))];
    if (kind !== 'all' && !kinds.includes(kind)) kind = 'all';
    root.querySelector('.pz-kinds')!.innerHTML = [['all', 'All'] as const, ...kinds.map((k) => [k, KINDS[k].label] as const)]
      .map(([k, label]) => `<button class="chip ${k === kind ? 'on' : ''}" data-kind="${k}">${label}</button>`)
      .join('');
    root.querySelector('.pz-list')!.innerHTML = listFor()
      .map((p) => {
        const r = data.puzzles[p.id];
        return `<li><button class="pz-item ${p.id === current.id ? 'on' : ''} ${r ? 'solved' : ''}" data-id="${p.id}">
          ${thumb(p, 54)}
          <span class="pz-item-text"><b>${esc(p.title)}</b><small>${KINDS[p.kind].label} · par ${p.par}</small></span>
          ${r ? stars(r.stars) : '<span class="pz-new">new</span>'}</button></li>`;
      })
      .join('');
    root.querySelector('.pz-item.on')?.scrollIntoView({ block: 'nearest' });
  };

  const renderHead = () => {
    const r = data.puzzles[current.id];
    root.querySelector('.pz-head')!.innerHTML = `
      <div class="pz-goal">
        <span class="level">${LEVELS.find(([k]) => k === current.level)![1]} · ${KINDS[current.kind].label}</span>
        <h2>${esc(current.title)}</h2>
        <p>${goalText(current)}</p>
        <p class="hint">Par <b>${current.par}</b> move${current.par === 1 ? '' : 's'}${r ? ` · your best ${r.best} ${stars(r.stars)}` : ''}</p>
      </div>
      <figure class="pz-target">${current.kind === 'pattern' ? `${isoDiagram(applyAlg(solvedState(), current.target!), 104)}<figcaption>Target</figcaption>` : `${netDiagram(startOf(current), 150)}<figcaption>Start</figcaption>`}</figure>`;
  };

  const refresh = () => {
    const n = countMoves(moves);
    const over = n > current.par;
    const badge = root.querySelector('#pz-count')!;
    badge.textContent = `${n} / ${current.par}`;
    badge.classList.toggle('ok', done);
    badge.classList.toggle('over', over && !done);
    root.querySelector('#pz-moves')!.textContent = moves.length ? moves.join(' ') : 'No moves yet';
  };

  const load = (p: Puzzle) => {
    current = p;
    level = p.level;
    moves = [];
    hints = 0;
    done = false;
    view.setState(startOf(p));
    if (p.kind === 'f2l') view.setMask(MASKS.f2l);
    else view.setMask(null);
    root.querySelector<HTMLElement>('.pz-win')!.hidden = true;
    root.querySelector('#pz-hint')!.textContent = '';
    history.replaceState(null, '', `#/puzzles/${p.id}`);
    renderLevels();
    renderHead();
    renderList();
    refresh();
  };

  const afterMove = () => {
    refresh();
    if (done || !isDone(current, view.state)) return;
    done = true;
    const n = countMoves(moves);
    // Hints cap the reward: one hint = max 2 stars, the whole solution = 1.
    const earned = Math.min(starsFor(current, n), hints === 0 ? 3 : hints < current.par ? 2 : 1);
    const prev = data.puzzles[current.id];
    data.puzzles[current.id] = {
      best: Math.min(n, prev?.best ?? Infinity),
      stars: Math.max(earned, prev?.stars ?? 0),
      at: Date.now(),
    };
    save();
    const win = root.querySelector<HTMLElement>('.pz-win')!;
    win.innerHTML = `<div class="pz-win-card">${stars(earned)}<h3>${n <= current.par ? (n < current.par ? 'Under par!' : 'Par!') : 'Solved!'}</h3>
      <p>${n} move${n === 1 ? '' : 's'} · par ${current.par}${hints ? ` · ${hints} hint${hints === 1 ? '' : 's'}` : ''}</p>
      <div class="row-btns"><button class="btn ghost sm" data-a="reset">Try again</button><button class="btn sm" data-a="next">Next puzzle → <kbd>Enter</kbd></button></div></div>`;
    win.hidden = false;
    renderLevels();
    renderHead();
    renderList();
    refresh();
  };

  const undo = async () => {
    const last = moves.pop();
    if (!last || view.busy) {
      if (last) moves.push(last);
      return;
    }
    undoing = true;
    await view.turnMove(invertToken(last), 'auto');
    undoing = false;
    if (done && !isDone(current, view.state)) {
      done = false;
      root.querySelector<HTMLElement>('.pz-win')!.hidden = true;
    }
    refresh();
  };

  const restart = async () => {
    if (!moves.length) return;
    await view.settle();
    undoing = true;
    await view.rewind(1200);
    undoing = false;
    view.setState(startOf(current));
    moves = [];
    done = false;
    root.querySelector<HTMLElement>('.pz-win')!.hidden = true;
    refresh();
  };

  const hint = () => {
    const sol = tokenize(current.solution);
    if (moves.length && hints === 0) {
      root.querySelector('#pz-hint')!.innerHTML = 'Hints follow the reference solution <b>from the start</b>. Press Restart, then Hint again.';
      return;
    }
    hints = Math.min(sol.length, hints + 1);
    const shown = sol.slice(0, hints).map((m) => `<code class="alg">${esc(m)}</code>`).join(' ');
    root.querySelector('#pz-hint')!.innerHTML = `${hints === sol.length ? 'Full solution' : `First ${hints} of ${sol.length}`}: ${shown}${hints < sol.length ? ' …' : ''}`;
  };

  const step = (dir: 1 | -1) => {
    const list = listFor();
    const i = list.findIndex((p) => p.id === current.id);
    const next = list[(i + dir + list.length) % list.length] ?? PUZZLES[0];
    load(next);
  };

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('button');
    if (!b) return;
    if (b.dataset.m && !done) view.turnMove(b.dataset.m);
    if (b.dataset.level) {
      level = b.dataset.level as Level;
      const first = listFor().find((p) => !data.puzzles[p.id]) ?? listFor()[0];
      load(first);
    }
    if (b.dataset.kind) {
      kind = b.dataset.kind as Kind | 'all';
      const list = listFor();
      if (!list.includes(current)) load(list.find((p) => !data.puzzles[p.id]) ?? list[0]);
      else renderList();
    }
    if (b.dataset.id) load(PUZZLE_BY_ID.get(b.dataset.id)!);
    const a = b.dataset.a;
    if (a === 'undo') undo();
    if (a === 'reset') restart();
    if (a === 'hint') hint();
    if (a === 'view') view.resetView();
    if (a === 'next') step(1);
    if (a === 'prev') step(-1);
  });

  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && done) {
      e.preventDefault();
      step(1);
      return;
    }
    const m = keyToMove(e);
    if (m && !done) {
      e.preventDefault();
      view.turnMove(m);
    }
  };
  window.addEventListener('keydown', onKey);
  load(current);
  return () => window.removeEventListener('keydown', onKey);
}
