import { CubeView, keyToMove } from '../cube/renderer';
import { cleanAlg, invertAlg, invertToken, isSolved } from '../cube/engine';
import { randomScramble } from '../cube/scramble';
import { netDiagram } from '../cube/diagram';
import { data, save } from '../store';
import { esc, track , isTyping } from '../ui';

const FACE_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
const OTHER_MOVES = ['M', "M'", 'E', "E'", 'S', "S'", 'r', "r'", 'u', "u'", 'x', "x'", 'y', "y'", 'z', "z'"];

export function playView(root: HTMLElement) {
  root.innerHTML = `
  <header class="page-head"><h1>Playground</h1><p>Drag a layer to turn it, drag the background to look around, or use the keyboard and buttons.</p></header>
  <div class="play-layout">
    <div class="play-main">
      <div class="stage big" id="play-stage"></div>
      <div class="play-status"><span id="solved-badge" class="badge">Solved</span><span id="move-count">0 moves</span></div>
      <div class="player-bar">
        <button class="btn" data-a="scramble">🔀 Scramble</button>
        <button class="btn ghost" data-a="undo" title="Ctrl+Z">↶ Undo</button>
        <button class="btn ghost" data-a="rewind" title="Undo every move since the scramble">⏪ Rewind</button>
        <button class="btn ghost" data-a="reset">↺ Reset</button>
        <button class="btn ghost" data-a="view">⟲ View</button>
      </div>
      <label class="speed">Animation speed <input type="range" id="speed" min="40" max="500" step="20" value="${520 - data.settings.speed}"></label>
    </div>
    <aside class="play-side">
      <div class="panel">
        <h3>Apply an algorithm</h3>
        <form id="alg-form" class="alg-form">
          <input id="alg-input" placeholder="e.g. R U R' U' or (R U2 R') y'" autocomplete="off" spellcheck="false" />
          <button class="btn sm">Play</button>
        </form>
        <p class="hint" id="alg-error"></p>
        <div class="row-btns"><button class="btn ghost sm" data-a="setup">Show the case it solves</button></div>
      </div>
      <div class="panel">
        <h3>Moves</h3>
        <div class="move-grid">${FACE_MOVES.map((m) => `<button class="move-btn" data-m="${m}">${m}</button>`).join('')}</div>
        <details><summary>Slices, wide moves and rotations</summary>
          <div class="move-grid">${OTHER_MOVES.map((m) => `<button class="move-btn" data-m="${m}">${esc(m)}</button>`).join('')}</div>
        </details>
      </div>
      <div class="panel">
        <h3>Keyboard</h3>
        <p class="hint">Letter = clockwise, <kbd>Shift</kbd>+letter = counter-clockwise. <kbd>R</kbd> <kbd>L</kbd> <kbd>U</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>B</kbd> faces, <kbd>M</kbd> <kbd>E</kbd> <kbd>S</kbd> slices, <kbd>X</kbd> <kbd>Y</kbd> <kbd>Z</kbd> rotations. <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo, <kbd>Space</kbd> scramble.</p>
      </div>
      <div class="panel">
        <h3>History</h3>
        <div id="scramble-line" class="hint"></div>
        <div id="history" class="history"></div>
        <div id="net"></div>
      </div>
    </aside>
  </div>`;

  const stage = root.querySelector<HTMLElement>('#play-stage')!;
  let history: string[] = [];
  let scramble = '';
  let undoing = false;
  const view = track(
    new CubeView(stage, {
      speed: data.settings.speed,
      onMove: (m) => {
        if (undoing) return;
        history.push(m);
        refresh();
      },
    }),
  );

  const refresh = () => {
    const solved = isSolved(view.state);
    const badge = root.querySelector('#solved-badge')!;
    badge.textContent = solved ? 'Solved ✓' : 'Not solved';
    badge.classList.toggle('ok', solved);
    root.querySelector('#move-count')!.textContent = `${history.length} move${history.length === 1 ? '' : 's'}`;
    root.querySelector('#history')!.innerHTML = history.map((m) => `<span>${esc(m)}</span>`).join(' ');
    root.querySelector('#scramble-line')!.innerHTML = scramble ? `<b>Scramble:</b> ${esc(scramble)}` : '';
    root.querySelector('#net')!.innerHTML = netDiagram(view.state, 220);
  };
  refresh();

  const doScramble = () => {
    scramble = randomScramble(20);
    history = [];
    view.reset();
    undoing = true;
    view.play(scramble).then(() => {
      undoing = false;
      refresh();
    });
  };

  const undo = async () => {
    const last = history.pop();
    if (!last || view.busy) {
      if (last) history.push(last);
      return;
    }
    undoing = true;
    await view.turn(invertToken(last), 'auto');
    undoing = false;
    refresh();
  };

  const rewind = async () => {
    if (!history.length || view.busy) return;
    const inv = invertAlg(history.join(' '));
    history = [];
    undoing = true;
    await view.play(inv);
    undoing = false;
    refresh();
  };

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    const a = b.dataset.a;
    const m = b.dataset.m;
    if (m) view.turn(m);
    if (a === 'scramble') doScramble();
    if (a === 'undo') undo();
    if (a === 'rewind') rewind();
    if (a === 'reset') {
      history = [];
      scramble = '';
      view.reset();
      refresh();
    }
    if (a === 'view') view.resetView();
    if (a === 'setup') {
      const v = (root.querySelector('#alg-input') as HTMLInputElement).value;
      try {
        const alg = cleanAlg(v);
        if (!alg) return;
        history = [];
        scramble = `case of ${alg}`;
        view.reset();
        undoing = true;
        view.play(invertAlg(alg)).then(() => {
          undoing = false;
          refresh();
        });
        setError('');
      } catch (err) {
        setError((err as Error).message);
      }
    }
  });

  const setError = (msg: string) => (root.querySelector('#alg-error')!.textContent = msg);
  root.querySelector('#alg-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (root.querySelector('#alg-input') as HTMLInputElement).value;
    try {
      const alg = cleanAlg(v);
      setError('');
      view.play(alg, 'user');
    } catch (err) {
      setError((err as Error).message);
    }
  });

  root.querySelector<HTMLInputElement>('#speed')!.addEventListener('input', (e) => {
    const v = 520 - +(e.target as HTMLInputElement).value;
    view.speed = v;
    data.settings.speed = v;
    save();
  });

  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      doScramble();
      return;
    }
    const m = keyToMove(e);
    if (m) {
      e.preventDefault();
      view.turn(m);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
