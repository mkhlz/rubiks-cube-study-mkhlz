import { SETS, Alg, algKey } from '../data/algs';
import { algStatus, data, gradeCard, save, SrsCard } from '../store';
import { cubePlayer, diagramFor, esc, untrack, isTyping } from '../ui';
import { CubeView } from '../cube/renderer';
import { applyAlg, invertAlg, solvedState } from '../cube/engine';
import { AUFS, withAuf } from '../cube/auf';

type Pool = 'learning' | 'due' | 'all';
type Mode = 'recall' | 'quiz';
type Grade = 'again' | 'hard' | 'good' | 'easy';

const BOXES = ['New', '4 h', '1 day', '3 days', '1 week', '3 weeks'];
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Trainer with two modes:
 *  - Recall: see a case, recall the algorithm, reveal, grade yourself
 *    (spaced repetition; hard cards come back sooner).
 *  - Name it: pick the case's name from four options, against the clock.
 * Cases can be shown from a random angle (pre-AUF), and every reveal shows
 * a setup so you can drill on a real cube.
 */
export function trainerView(root: HTMLElement) {
  let setKey = (sessionGet('trainer-set') as string) || 'OLL2';
  let mode: Mode = (sessionGet('trainer-mode') as Mode) || 'recall';
  let pool: Pool = 'all';
  let group = 'all';
  let randomAuf = sessionGet('trainer-auf') !== 'off';
  let current: Alg | null = null;
  let forced: Alg | null = null;
  let auf = '';
  let revealed = false;
  let shownAt = 0;
  let player: { view: CubeView } | null = null;
  let undoStack: { key: string; card?: SrsCard; status: string }[] = [];
  const session = { reviewed: 0, good: 0, streak: 0, best: 0, times: [] as number[], quizRight: 0, quizTotal: 0 };

  root.innerHTML = `
    <header class="page-head"><h1>Trainer</h1>
      <p>Drill recognition and recall. <b>Recall</b> mode is spaced repetition: see a case, recall the algorithm, reveal and grade yourself, and hard cards come back sooner. <b>Name it</b> mode trains instant recognition: pick the case's name against the clock.</p></header>
    <div class="tr-top">
      <div class="seg tr-modes" role="tablist">
        <button data-mode="recall"><b>Recall</b><small>Flashcards with spaced repetition</small></button>
        <button data-mode="quiz"><b>Name it</b><small>Multiple-choice recognition drill</small></button>
      </div>
      <div class="trainer-controls">
        <label>Set <select id="set">${SETS.map((s) => `<option value="${s.key}" ${s.key === setKey ? 'selected' : ''}>${esc(s.title)} (${s.algs.length})</option>`).join('')}</select></label>
        <label>Group <select id="group"></select></label>
        <label class="pool-wrap">Cards <select id="pool">
          <option value="all">All cases</option>
          <option value="learning">Learning + learned</option>
          <option value="due">Due for review</option>
        </select></label>
        <label class="check-label"><input type="checkbox" id="auf" ${randomAuf ? 'checked' : ''}> Random angle (AUF)</label>
      </div>
    </div>
    <div class="tr-layout">
      <div class="trainer-card" id="card"></div>
      <aside class="tr-side">
        <div class="panel tr-session"><h3>This session</h3><div class="tr-stats" id="session"></div></div>
        <div class="panel tr-deck"><h3>Deck</h3><div id="deck"></div></div>
      </aside>
    </div>`;

  const cardEl = root.querySelector<HTMLElement>('#card')!;
  const set = () => SETS.find((s) => s.key === setKey)!;

  const inGroup = (a: Alg) => group === 'all' || a.group === group;
  const candidates = (): Alg[] => {
    let list = set().algs.filter(inGroup);
    if (mode === 'quiz') return list;
    if (pool === 'learning') list = list.filter((a) => algStatus(algKey(a)) !== 'new');
    if (pool === 'due') list = list.filter((a) => (data.srs[algKey(a)]?.due ?? 0) <= Date.now());
    return list;
  };

  const pick = () => {
    if (forced) {
      const f = forced;
      forced = null;
      return f;
    }
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

  /** The solution from the shown angle, with an adjusted first U turn highlighted. */
  const solutionHtml = (a: Alg) => {
    const { solution, adjusted } = withAuf(a.alg, auf);
    if (!adjusted) return esc(solution);
    const [head, ...rest] = solution.split(' ');
    return `<span class="auf" title="Adjusted for the angle">${esc(head)}</span> ${esc(rest.join(' '))}`;
  };
  const caseState = (a: Alg) => applyAlg(solvedState(), `${invertAlg(a.alg)} ${auf}`);
  const setupText = (a: Alg) => `${invertAlg(a.alg)}${auf ? ` ${auf}` : ''}`;

  const renderSession = () => {
    const t = avg(session.times);
    const acc = mode === 'quiz' ? (session.quizTotal ? Math.round((session.quizRight / session.quizTotal) * 100) : null) : session.reviewed ? Math.round((session.good / session.reviewed) * 100) : null;
    root.querySelector('#session')!.innerHTML = [
      [mode === 'quiz' ? String(session.quizTotal) : String(session.reviewed), mode === 'quiz' ? 'answered' : 'reviewed'],
      [acc === null ? '—' : `${acc}%`, mode === 'quiz' ? 'correct' : 'good or easy'],
      [`${session.streak}`, `streak (best ${session.best})`],
      [t === null ? '—' : fmt(t), 'avg recognition'],
    ]
      .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
      .join('');
  };

  const renderDeck = () => {
    const algs = set().algs.filter(inGroup);
    const now = Date.now();
    const counts = { new: 0, learning: 0, learned: 0 } as Record<string, number>;
    let due = 0;
    const boxes = [0, 0, 0, 0, 0, 0];
    for (const a of algs) {
      counts[algStatus(algKey(a))]++;
      const c = data.srs[algKey(a)];
      if (c) boxes[c.box]++;
      else boxes[0]++;
      if (c && c.due <= now) due++;
    }
    const max = Math.max(...boxes, 1);
    root.querySelector('#deck')!.innerHTML = `
      <div class="tr-counts"><span><b>${counts.new}</b> new</span><span><b>${counts.learning}</b> learning</span><span><b>${counts.learned}</b> learned</span><span><b>${due}</b> due</span></div>
      <div class="tr-boxes" role="img" aria-label="Cards per review interval">${boxes
        .map((n, i) => `<div class="tr-box" title="${BOXES[i]}: ${n} card${n === 1 ? '' : 's'}"><i style="height:${(n / max) * 100}%"></i><small>${BOXES[i]}</small><b>${n}</b></div>`)
        .join('')}</div>
      <p class="hint small">Click a case to drill it next.</p>
      <div class="tr-grid">${algs
        .map((a) => {
          const c = data.srs[algKey(a)];
          const r = data.recog[algKey(a)];
          const ra = r ? avg(r) : null;
          return `<button class="tr-cell box-${c ? c.box : 'n'} ${a === current ? 'on' : ''}" data-drill="${esc(algKey(a))}" title="${esc(a.name)}${c ? ` · box ${c.box}` : ' · new'}${ra ? ` · recognised in ${fmt(ra)}` : ''}">${diagramFor(a, 40)}</button>`;
        })
        .join('')}</div>`;
  };

  const renderGroups = () => {
    const groups = [...new Set(set().algs.map((a) => a.group))];
    if (!groups.includes(group)) group = 'all';
    root.querySelector('#group')!.innerHTML = `<option value="all">All groups</option>${groups.map((g) => `<option ${g === group ? 'selected' : ''}>${esc(g)}</option>`).join('')}`;
  };

  const show = () => {
    if (player) {
      untrack(player.view);
      player = null;
    }
    current = pick();
    revealed = false;
    auf = randomAuf && setKey !== 'BEG' ? AUFS[Math.floor(Math.random() * 4)] : '';
    shownAt = performance.now();
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    root.querySelector<HTMLElement>('.pool-wrap')!.hidden = mode === 'quiz';
    renderSession();
    renderDeck();
    if (!current) {
      cardEl.innerHTML = `<div class="empty"><p>No cards in this deck yet.</p><p>Choose "All cases", or mark some algorithms as <i>learning</i> in the <a href="#/algs/${setKey}">library</a>.</p></div>`;
      return;
    }
    if (mode === 'quiz') return showQuiz(current);
    const c = data.srs[algKey(current)];
    cardEl.innerHTML = `
      <div class="t-case">${diagramFor(current, 220, caseState(current))}</div>
      <div class="t-info">
        <span class="pill">${esc(current.group)}</span>
        <h2 class="t-name">Which algorithm solves this?</h2>
        <p class="hint">${c ? `Box ${c.box} · seen ${c.seen}×` : 'New card'}${auf ? ' · shown from a random angle' : ''}</p>
        <div class="t-answer" hidden>
          <h3>${esc(current.name)}</h3>
          <div class="alg-text big">${solutionHtml(current)}</div>
          ${current.tip ? `<p class="alg-tip">${esc(current.tip)}</p>` : ''}
          <p class="hint small t-time"></p>
          <details class="t-setup"><summary>Set this case up on a real cube</summary><p>Yellow on top, green in front, from solved: <code class="alg">${esc(setupText(current))}</code></p></details>
          <div class="t-player"></div>
        </div>
        <div class="t-actions">
          <button class="btn lg" data-t="reveal">Reveal <kbd>Space</kbd></button>
          <button class="btn ghost" data-t="skip">Skip <kbd>S</kbd></button>
        </div>
        <div class="t-grades" hidden>
          <button class="btn grade again" data-g="again">Again <kbd>1</kbd></button>
          <button class="btn grade hard" data-g="hard">Hard <kbd>2</kbd></button>
          <button class="btn grade good" data-g="good">Good <kbd>3</kbd></button>
          <button class="btn grade easy" data-g="easy">Easy <kbd>4</kbd></button>
        </div>
        <p class="hint small t-undo">${undoStack.length ? `<button class="linkish" data-t="undo">↶ Undo last grade</button> <kbd>Z</kbd>` : ''}</p>
      </div>`;
  };

  /** Records a recognition time (last 10 per card). */
  const logTime = (a: Alg, ms: number) => {
    session.times.push(ms);
    const k = algKey(a);
    data.recog[k] = [...(data.recog[k] ?? []), Math.round(ms)].slice(-10);
    save();
  };

  const showQuiz = (a: Alg) => {
    const pool = set().algs.filter((x) => x !== a && x.name !== a.name);
    const same = pool.filter((x) => x.group === a.group);
    const others = [...same.sort(() => Math.random() - 0.5), ...pool.sort(() => Math.random() - 0.5)];
    const options = [a, ...[...new Set(others)].slice(0, 3)].sort(() => Math.random() - 0.5);
    cardEl.innerHTML = `
      <div class="t-case">${diagramFor(a, 220, caseState(a))}</div>
      <div class="t-info">
        <span class="pill">${esc(set().title)}</span>
        <h2 class="t-name">Name this case</h2>
        <p class="hint">As fast as you can. Keys <kbd>1</kbd>–<kbd>4</kbd>.</p>
        <div class="q-opts">${options.map((o, i) => `<button class="opt q-opt" data-q="${i}" data-right="${o === a}"><kbd>${i + 1}</kbd> ${esc(o.name)} <small>${esc(o.group)}</small></button>`).join('')}</div>
        <div class="q-result" hidden></div>
      </div>`;
  };

  const answerQuiz = (i: number) => {
    if (!current || revealed) return;
    const b = cardEl.querySelectorAll<HTMLButtonElement>('.q-opt')[i];
    if (!b) return;
    revealed = true;
    const ms = performance.now() - shownAt;
    const right = b.dataset.right === 'true';
    cardEl.querySelectorAll<HTMLButtonElement>('.q-opt').forEach((x) => {
      x.classList.toggle('right', x.dataset.right === 'true');
      x.classList.toggle('wrong', x === b && !right);
      x.disabled = true;
    });
    session.quizTotal++;
    if (right) {
      session.quizRight++;
      session.streak++;
      session.best = Math.max(session.best, session.streak);
      logTime(current, ms);
    } else session.streak = 0;
    const res = cardEl.querySelector<HTMLElement>('.q-result')!;
    res.hidden = false;
    res.innerHTML = `<p>${right ? `✅ ${fmt(ms)}` : `❌ It's <b>${esc(current.name)}</b>.`} <code class="alg">${solutionHtml(current)}</code></p>
      <button class="btn" data-t="next">Next <kbd>Space</kbd></button>`;
    renderSession();
  };

  const reveal = () => {
    if (!current || revealed || mode !== 'recall') return;
    revealed = true;
    const ms = performance.now() - shownAt;
    logTime(current, ms);
    const r = data.recog[algKey(current)];
    cardEl.querySelector<HTMLElement>('.t-answer')!.hidden = false;
    cardEl.querySelector<HTMLElement>('.t-grades')!.hidden = false;
    cardEl.querySelector<HTMLElement>('.t-actions')!.hidden = true;
    cardEl.querySelector('.t-name')!.textContent = 'How well did you know it?';
    cardEl.querySelector('.t-time')!.textContent = `Recognised in ${fmt(ms)}${r && r.length > 1 ? ` · your average on this case ${fmt(avg(r)!)}` : ''}`;
    const { solution } = withAuf(current.alg, auf);
    player = cubePlayer(cardEl.querySelector('.t-player')!, { setup: `${invertAlg(current.alg)} ${auf}`.trim(), play: solution, height: 240 });
    renderSession();
  };

  const grade = (g: Grade) => {
    if (!current || !revealed || mode !== 'recall') return;
    const k = algKey(current);
    undoStack = [{ key: k, card: data.srs[k] ? { ...data.srs[k] } : undefined, status: algStatus(k) }, ...undoStack].slice(0, 20);
    gradeCard(k, g);
    session.reviewed++;
    if (g === 'good' || g === 'easy') session.good++;
    session.streak = g === 'again' ? 0 : session.streak + 1;
    session.best = Math.max(session.best, session.streak);
    show();
  };

  const undoGrade = () => {
    const u = undoStack.shift();
    if (!u) return;
    if (u.card) data.srs[u.key] = u.card;
    else delete data.srs[u.key];
    if (u.status === 'new') delete data.algs[u.key];
    else data.algs[u.key] = u.status as 'learning';
    session.reviewed = Math.max(0, session.reviewed - 1);
    save();
    forced = set().algs.find((a) => algKey(a) === u.key) ?? null;
    show();
  };

  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    if (b.dataset.t === 'reveal') reveal();
    if (b.dataset.t === 'skip' || b.dataset.t === 'next') show();
    if (b.dataset.t === 'undo') undoGrade();
    if (b.dataset.g) grade(b.dataset.g as Grade);
    if (b.dataset.q) answerQuiz(+b.dataset.q);
    if (b.dataset.drill) {
      forced = set().algs.find((a) => algKey(a) === b.dataset.drill) ?? null;
      show();
    }
    if (b.dataset.mode) {
      mode = b.dataset.mode as Mode;
      sessionSet('trainer-mode', mode);
      session.streak = 0;
      show();
    }
  });
  root.querySelector('#set')!.addEventListener('change', (e) => {
    setKey = (e.target as HTMLSelectElement).value;
    (e.target as HTMLElement).blur();
    sessionSet('trainer-set', setKey);
    group = 'all';
    renderGroups();
    show();
  });
  root.querySelector('#group')!.addEventListener('change', (e) => {
    group = (e.target as HTMLSelectElement).value;
    (e.target as HTMLElement).blur();
    show();
  });
  root.querySelector('#pool')!.addEventListener('change', (e) => {
    pool = (e.target as HTMLSelectElement).value as Pool;
    (e.target as HTMLElement).blur();
    show();
  });
  root.querySelector('#auf')!.addEventListener('change', (e) => {
    randomAuf = (e.target as HTMLInputElement).checked;
    sessionSet('trainer-auf', randomAuf ? 'on' : 'off');
    show();
  });
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (mode === 'quiz') {
      if (['1', '2', '3', '4'].includes(k)) answerQuiz(+k - 1);
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        if (revealed) show();
      }
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      reveal();
    }
    if (k === 's' && !revealed) show();
    if (k === 'z') undoGrade();
    const g = ({ '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' } as const)[k as '1'];
    if (g) grade(g);
  };
  window.addEventListener('keydown', onKey);
  renderGroups();
  show();
  return () => window.removeEventListener('keydown', onKey);
}

function sessionGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
