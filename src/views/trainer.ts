import { SETS, Alg, algKey } from '../data/algs';
import { algStatus, data, gradeCard } from '../store';
import { cubePlayer, diagramFor, esc, untrack , isTyping } from '../ui';
import { CubeView } from '../cube/renderer';

type Pool = 'learning' | 'due' | 'all';

/**
 * Spaced-repetition trainer: shows a case, you recall the algorithm,
 * reveal it, and grade yourself. Due cards come first.
 */
export function trainerView(root: HTMLElement) {
  let setKey = (sessionStorageGet('trainer-set') as string) || 'OLL2';
  let pool: Pool = 'all';
  let current: Alg | null = null;
  let revealed = false;
  let player: { view: CubeView } | null = null;
  let streak = 0;
  let reviewed = 0;

  root.innerHTML = `
    <header class="page-head"><h1>Trainer</h1>
      <p>See a case, recall the algorithm, reveal and grade yourself. Cards you find hard come back sooner (spaced repetition). Mark algorithms as <i>learning</i> in the library to build a focused deck.</p></header>
    <div class="trainer-controls">
      <label>Set <select id="set">${SETS.map((s) => `<option value="${s.key}" ${s.key === setKey ? 'selected' : ''}>${esc(s.title)} (${s.algs.length})</option>`).join('')}</select></label>
      <label>Cards <select id="pool">
        <option value="all">All cases in the set</option>
        <option value="learning">Only "learning" + "learned"</option>
        <option value="due">Only due for review</option>
      </select></label>
      <span class="spacer"></span>
      <span class="hint" id="session"></span>
    </div>
    <div class="trainer-card" id="card"></div>`;

  const cardEl = root.querySelector<HTMLElement>('#card')!;

  const candidates = (): Alg[] => {
    const set = SETS.find((s) => s.key === setKey)!;
    let list = set.algs;
    if (pool === 'learning') list = list.filter((a) => algStatus(algKey(a)) !== 'new');
    if (pool === 'due') list = list.filter((a) => (data.srs[algKey(a)]?.due ?? 0) <= Date.now());
    return list;
  };

  const pick = () => {
    const list = candidates();
    if (!list.length) return null;
    const now = Date.now();
    // Prefer overdue / unseen cards, then random.
    const scored = list
      .filter((a) => a !== current || list.length === 1)
      .map((a) => {
        const c = data.srs[algKey(a)];
        const overdue = c ? (now - c.due) / 3600_000 : 24;
        return { a, w: Math.max(0.5, overdue + 2) * (c ? 1 / (1 + c.box) : 2) * (0.5 + Math.random()) };
      })
      .sort((x, y) => y.w - x.w);
    return scored[0]?.a ?? null;
  };

  const show = () => {
    if (player) {
      untrack(player.view);
      player = null;
    }
    current = pick();
    revealed = false;
    root.querySelector('#session')!.textContent = `${reviewed} reviewed · streak ${streak}`;
    if (!current) {
      cardEl.innerHTML = `<div class="empty"><p>No cards in this deck yet.</p><p>Choose "All cases", or mark some algorithms as <i>learning</i> in the <a href="#/algs/${setKey}">library</a>.</p></div>`;
      return;
    }
    const c = data.srs[algKey(current)];
    cardEl.innerHTML = `
      <div class="t-case">${diagramFor(current, 220)}</div>
      <div class="t-info">
        <span class="pill">${esc(current.group)}</span>
        <h2 class="t-name">${revealed ? esc(current.name) : 'Which algorithm solves this?'}</h2>
        <p class="hint">${c ? `Box ${c.box} · seen ${c.seen}×` : 'New card'}</p>
        <div class="t-answer" hidden>
          <h3>${esc(current.name)}</h3>
          <div class="alg-text big">${esc(current.alg)}</div>
          ${current.tip ? `<p class="alg-tip">${esc(current.tip)}</p>` : ''}
          <div class="t-player"></div>
        </div>
        <div class="t-actions">
          <button class="btn lg" data-t="reveal">Reveal <kbd>Space</kbd></button>
        </div>
        <div class="t-grades" hidden>
          <button class="btn grade again" data-g="again">Again <kbd>1</kbd></button>
          <button class="btn grade hard" data-g="hard">Hard <kbd>2</kbd></button>
          <button class="btn grade good" data-g="good">Good <kbd>3</kbd></button>
          <button class="btn grade easy" data-g="easy">Easy <kbd>4</kbd></button>
        </div>
      </div>`;
  };

  const reveal = () => {
    if (!current || revealed) return;
    revealed = true;
    cardEl.querySelector<HTMLElement>('.t-answer')!.hidden = false;
    cardEl.querySelector<HTMLElement>('.t-grades')!.hidden = false;
    cardEl.querySelector<HTMLElement>('.t-actions')!.hidden = true;
    cardEl.querySelector('.t-name')!.textContent = 'How well did you know it?';
    player = cubePlayer(cardEl.querySelector('.t-player')!, { caseOf: current.alg, play: current.alg, height: 240 });
  };

  const grade = (g: 'again' | 'hard' | 'good' | 'easy') => {
    if (!current || !revealed) return;
    gradeCard(algKey(current), g);
    reviewed++;
    streak = g === 'again' ? 0 : streak + 1;
    show();
  };

  cardEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b?.dataset.t === 'reveal') reveal();
    if (b?.dataset.g) grade(b.dataset.g as 'good');
  });
  root.querySelector('#set')!.addEventListener('change', (e) => {
    setKey = (e.target as HTMLSelectElement).value;
    (e.target as HTMLElement).blur();
    sessionStorageSet('trainer-set', setKey);
    show();
  });
  root.querySelector('#pool')!.addEventListener('change', (e) => {
    pool = (e.target as HTMLSelectElement).value as Pool;
    (e.target as HTMLElement).blur();
    show();
  });
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if (e.key === ' ') {
      e.preventDefault();
      reveal();
    }
    const g = ({ '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' } as const)[e.key as '1'];
    if (g) grade(g);
  };
  window.addEventListener('keydown', onKey);
  show();
  return () => window.removeEventListener('keydown', onKey);
}

function sessionStorageGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
