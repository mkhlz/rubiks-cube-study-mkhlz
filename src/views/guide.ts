/**
 * Guided solve panel: walks through a beginner-method solution of the
 * playground cube one step at a time. The learner can watch each step,
 * step back, let it auto-solve, or do the moves themselves (their moves
 * are checked against the plan).
 */
import { CubeView } from '../cube/renderer';
import { invertToken, isSolved, tokenize, Vec3 } from '../cube/engine';
import { solve, SolvePlan, SolveStep } from '../cube/solver';
import { fastPlan, solveFast } from '../cube/fast';
import { esc } from '../ui';

interface FlatStep {
  stage: number;
  step: SolveStep;
  indexInStage: number;
}

const isCenter = (h: Vec3) => h.filter((v) => v !== 0).length === 1;
const sameHome = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export function mountGuide(panel: HTMLElement, view: CubeView, hooks: { onChange: () => void }) {
  let plan: SolvePlan | null = null;
  let flat: FlatStep[] = [];
  let si = 0; // current step
  let mi = 0; // moves of the current step already done
  let auto = false;
  let working = false;
  let stale = false;
  let focusOn = true;
  let mode: 'beginner' | 'fast' = 'beginner';
  let compareTimer = 0;
  let thinking = false;

  const tokens = (st: FlatStep) => tokenize(st.step.moves);

  const applyFocus = () => {
    const st = flat[si];
    if (!plan || !st || !focusOn || !st.step.focus.length || st.step.focus.length >= 26) {
      view.setMask(null);
      return;
    }
    const focus = st.step.focus;
    view.setMask((h) => isCenter(h) || focus.some((f) => sameHome(f, h)));
  };

  const idle = () => {
    panel.innerHTML = `
      <h3>🧭 Solve it for me</h3>
      <div class="seg" role="radiogroup" aria-label="Solving method">
        <button role="radio" aria-checked="${mode === 'beginner'}" class="${mode === 'beginner' ? 'on' : ''}" data-mode="beginner"><b>Beginner method</b><small>Explained step by step, the way the course teaches it</small></button>
        <button role="radio" aria-checked="${mode === 'fast'}" class="${mode === 'fast' ? 'on' : ''}" data-mode="fast"><b>Fastest solution</b><small>Computer two-phase search, ~20 moves</small></button>
      </div>
      <div class="row-btns">
        <button class="btn" data-g="start" ${thinking ? 'disabled' : ''}>${thinking ? 'Thinking…' : 'Guide me step by step'}</button>
        <button class="btn ghost" data-g="auto" ${thinking ? 'disabled' : ''}>Auto-solve ▶</button>
      </div>
      <div class="compare" id="compare"></div>`;
    scheduleCompare();
  };

  /** "This cube: beginner 152 moves vs computer 19" (recomputed after moves). */
  const scheduleCompare = () => {
    clearTimeout(compareTimer);
    compareTimer = window.setTimeout(async () => {
      const box = panel.querySelector<HTMLElement>('#compare');
      if (!box || plan) return;
      if (isSolved(view.state)) {
        box.innerHTML = '<span class="hint">Scramble the cube to compare methods on it.</span>';
        return;
      }
      try {
        const beginner = solve(view.state).moveCount;
        const fast = (await solveFast(view.state, false)).moves.length;
        if (plan || !panel.querySelector('#compare')) return;
        const max = Math.max(beginner, fast);
        box.innerHTML = `<p class="hint">On <b>this</b> cube:</p>
          <div class="cmp-row"><span>Beginner</span><i style="width:${(beginner / max) * 100}%"></i><b>${beginner}</b></div>
          <div class="cmp-row fast"><span>Computer</span><i style="width:${(fast / max) * 100}%"></i><b>${fast}</b></div>
          <p class="hint small">Full CFOP would be around 55–60. <a href="#/theory#methods">Why the difference?</a></p>`;
      } catch (err) {
        box.innerHTML = `<p class="hint">${esc((err as Error).message)}</p>`;
      }
    }, 350);
  };

  /** Move chips; identical consecutive parts (e.g. a repeated trigger) collapse into one "×n" chip. */
  const movesHtml = (st: FlatStep) => {
    const groups: { part: string; n: number; start: number }[] = [];
    let g = 0;
    for (const part of st.step.parts) {
      const len = tokenize(part).length;
      const last = groups[groups.length - 1];
      if (last && last.part === part) last.n++;
      else groups.push({ part, n: 1, start: g });
      g += len;
    }
    return groups
      .map(({ part, n, start }) => {
        const toks = tokenize(part);
        const local = mi - start;
        const rep = Math.min(n, Math.max(0, Math.floor(local / toks.length)));
        const pos = local - rep * toks.length;
        const allDone = local >= n * toks.length;
        const html = toks
          .map((t, j) => {
            const cls = allDone || (local >= 0 && j < pos) ? 'done' : local >= 0 && j === pos && !stale ? 'next' : '';
            return `<span class="mv ${cls}">${esc(t)}</span>`;
          })
          .join(' ');
        const badge = n > 1 ? `<span class="reps">×${n}${local >= 0 && !allDone ? ` <small>(${rep + 1}/${n})</small>` : ''}</span>` : '';
        return `<span class="part">${html}${badge}</span>`;
      })
      .join('<span class="part-sep">then</span>');
  };

  const render = () => {
    if (!plan) return idle();
    const done = si >= flat.length;
    const st = flat[Math.min(si, flat.length - 1)];
    const stage = plan.stages[st.stage];
    const stageCount = plan.stages[st.stage].steps.length;
    const movesLeft = flat.slice(si).reduce((n, f, k) => n + tokens(f).length - (k === 0 ? mi : 0), 0);
    panel.innerHTML = `
      <div class="guide-head">
        <h3>🧭 ${mode === 'fast' ? 'Fastest solution' : 'Guided solve'}</h3>
        <button class="icon-btn" data-g="exit" aria-label="Close guide" title="Close guide">✕</button>
      </div>
      <ol class="stage-dots" aria-label="Stages">
        ${plan.stages
          .map((s, i) => `<li class="${i < st.stage || done ? 'done' : i === st.stage ? 'now' : ''}" title="${esc(s.title)}"><span>${i}</span></li>`)
          .join('')}
      </ol>
      <div class="guide-stage">
        <span class="level">${done ? 'Finished' : `${st.stage === 0 ? 'Before you start' : `Step ${st.stage} of ${plan.stages.length - 1}`}${stageCount > 1 ? ` · part ${st.indexInStage + 1} of ${stageCount}` : ''}`}</span>
        <h4>${esc(stage.title)}</h4>
        <p class="hint">${esc(stage.summary)} <a href="#/learn/${stage.lesson}">Lesson →</a></p>
      </div>
      <div class="guide-step ${stale ? 'stale' : ''}">
        <p>${st.step.text}</p>
        ${st.step.moves ? `<div class="guide-moves">${movesHtml(st)}</div>` : ''}
        ${stale ? `<p class="warn">Your moves went off the plan, no problem! <button class="btn sm" data-g="replan">Re-plan from here</button></p>` : ''}
      </div>
      <div class="guide-controls">
        <button class="btn ghost sm" data-g="back" ${si === 0 && mi === 0 ? 'disabled' : ''} title="Undo the previous step">◀ Back</button>
        ${done ? '' : st.step.moves ? `<button class="btn sm" data-g="show" ${working ? 'disabled' : ''}>▶ Show me</button>` : `<button class="btn sm" data-g="next">Next ▶</button>`}
        <button class="btn ghost sm" data-g="toggle-auto">${auto ? '⏸ Pause' : '⏩ Auto-solve'}</button>
      </div>
      <label class="check-label"><input type="checkbox" data-g="focus" ${focusOn ? 'checked' : ''}/> Highlight only the pieces for this step</label>
      <p class="hint small">${done ? `Done in ${plan.moveCount} moves.` : `Or do the highlighted move yourself with the keyboard, buttons or by dragging; I'll follow along. ${movesLeft} moves to go.`}</p>`;
    applyFocus();
  };

  const start = async (autoRun = false) => {
    if (view.busy || thinking) return;
    if (mode === 'fast') {
      thinking = true;
      idle();
      try {
        plan = await fastPlan(view.state, solve(view.state).moveCount);
      } catch (err) {
        thinking = false;
        idle();
        panel.querySelector('#compare')!.innerHTML = `<p class="warn">${esc((err as Error).message)}</p>`;
        return;
      }
      thinking = false;
    } else plan = solve(view.state);
    flat = plan.stages.flatMap((s, stage) => s.steps.map((step, indexInStage) => ({ stage, step, indexInStage })));
    si = 0;
    mi = 0;
    stale = false;
    auto = autoRun;
    render();
    if (autoRun) runAuto();
  };

  const advanceIfComplete = () => {
    while (si < flat.length && mi >= tokens(flat[si]).length && tokens(flat[si]).length) {
      si++;
      mi = 0;
    }
  };

  /** Play the rest of the current step. */
  const showStep = async () => {
    if (!plan || working || stale || si >= flat.length) return;
    working = true;
    render();
    const toks = tokens(flat[si]);
    while (mi < toks.length && plan) {
      await view.turnMove(toks[mi], 'auto');
      mi++;
      render();
    }
    working = false;
    if (!plan) return;
    si++;
    mi = 0;
    render();
    hooks.onChange();
  };

  const next = () => {
    if (si < flat.length) {
      si++;
      mi = 0;
      render();
    }
  };

  const back = async () => {
    if (!plan || working || view.busy) return;
    working = true;
    auto = false;
    if (mi === 0) {
      // Step back over notes to the previous step that has moves.
      do si--;
      while (si > 0 && !tokens(flat[si]).length);
      if (si < 0) si = 0;
      mi = tokens(flat[si]).length;
    }
    const undo = tokens(flat[si]).slice(0, mi).reverse().map(invertToken);
    render();
    for (const t of undo) {
      await view.turnMove(t, 'auto');
      mi--;
      render();
    }
    mi = 0;
    stale = false;
    working = false;
    render();
    hooks.onChange();
  };

  const runAuto = async () => {
    auto = true;
    render();
    while (auto && plan && si < flat.length && !stale) {
      if (tokens(flat[si]).length) await showStep();
      else next();
      if (auto && plan && si < flat.length) await new Promise((r) => setTimeout(r, 650));
    }
    auto = false;
    if (plan) render();
  };

  const exit = () => {
    plan = null;
    auto = false;
    view.setMask(null);
    idle();
  };

  panel.addEventListener('click', (e) => {
    const modeBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
    if (modeBtn && !plan) {
      mode = modeBtn.dataset.mode as 'beginner' | 'fast';
      idle();
      return;
    }
    const g = (e.target as HTMLElement).closest<HTMLElement>('[data-g]')?.dataset.g;
    if (!g) return;
    if (g === 'start') start(false);
    if (g === 'auto') start(true);
    if (g === 'exit') exit();
    if (g === 'show') showStep();
    if (g === 'next') next();
    if (g === 'back') back();
    if (g === 'replan') start(false);
    if (g === 'toggle-auto') {
      if (auto) auto = false;
      else runAuto();
      render();
    }
  });
  panel.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.g === 'focus') {
      focusOn = t.checked;
      applyFocus();
    }
  });

  idle();

  return {
    /** Called for every finished move; user moves are checked against the plan. */
    notify(move: string, source: 'user' | 'auto') {
      if (!plan) {
        scheduleCompare();
        return;
      }
      if (source !== 'user' || working) return;
      if (si >= flat.length) return;
      // Skip over note-only steps.
      while (si < flat.length && !tokens(flat[si]).length) si++;
      const expected = tokens(flat[si])?.[mi];
      if (!stale && expected === move) {
        mi++;
        advanceIfComplete();
      } else stale = true;
      if (isSolved(view.state)) si = flat.length;
      render();
    },
    /** The cube was changed from outside (scramble, reset...): close the guide. */
    exit,
    get active() {
      return !!plan;
    },
  };
}
