import { randomScramble } from '../cube/scramble';
import { applyAlg, solvedState } from '../cube/engine';
import { netDiagram } from '../cube/diagram';
import { addSolve, data, save } from '../store';
import { averageOf, best, bestAverage, effective, formatTime } from '../stats';
import { esc , isTyping } from '../ui';

type Phase = 'idle' | 'holding' | 'ready' | 'inspecting' | 'running';

/** Speedsolving timer: hold Space (or touch) to arm, release to start, any key to stop. */
export function timerView(root: HTMLElement) {
  let scramble = randomScramble(20);
  let phase: Phase = 'idle';
  let holdStart = 0;
  let inspectStart = 0;
  let start = 0;
  let raf = 0;
  let inspectPenalty: '+2' | 'DNF' | undefined;

  root.innerHTML = `
    <div class="timer-page">
      <div class="scramble-box">
        <div class="scramble" id="scramble"></div>
        <div class="scramble-tools">
          <button class="btn ghost sm" id="new-scr">New scramble</button>
          <label class="check-label"><input type="checkbox" id="insp" ${data.settings.inspection ? 'checked' : ''}/> 15 s inspection</label>
        </div>
        <div id="scr-net"></div>
      </div>
      <div class="timer-pad" id="pad" tabindex="0" aria-label="Timer: hold space or touch and hold, release to start">
        <div class="time" id="time">0.00</div>
        <div class="timer-hint" id="hint">Hold <kbd>Space</kbd> (or touch and hold) until the time turns green, release to start.</div>
      </div>
      <div class="timer-stats" id="stats"></div>
      <div class="solves">
        <div class="solves-head"><h3>Session</h3><button class="btn ghost sm" id="clear">Clear all</button></div>
        <ol id="list"></ol>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const timeEl = $('#time');
  const pad = $('#pad');

  const renderScramble = () => {
    $('#scramble').textContent = scramble;
    $('#scr-net').innerHTML = netDiagram(applyAlg(solvedState(), scramble), 200);
  };

  const renderStats = () => {
    const s = data.solves;
    const cell = (label: string, v: number | null) => `<div class="stat"><b>${v === null ? '—' : formatTime(v)}</b><span>${label}</span></div>`;
    $('#stats').innerHTML = [
      cell('best', best(s)),
      cell('ao5', averageOf(s, 5)),
      cell('ao12', averageOf(s, 12)),
      cell('ao100', averageOf(s, 100)),
      cell('best ao5', bestAverage(s.slice(0, 500), 5)),
      `<div class="stat"><b>${s.length}</b><span>solves</span></div>`,
    ].join('');
    $('#list').innerHTML = s
      .slice(0, 200)
      .map(
        (x, i) => `<li data-i="${i}"><span class="n">${s.length - i}.</span>
          <span class="t ${x.penalty ? 'pen' : ''}">${formatTime(effective(x))}${x.penalty === '+2' ? '+' : ''}</span>
          <span class="scr" title="${esc(x.scramble)}">${esc(x.scramble)}</span>
          <span class="acts"><button data-p="+2" class="${x.penalty === '+2' ? 'on' : ''}">+2</button><button data-p="DNF" class="${x.penalty === 'DNF' ? 'on' : ''}">DNF</button><button data-p="del" aria-label="Delete">✕</button></span></li>`,
      )
      .join('');
  };

  const setPhase = (p: Phase) => {
    phase = p;
    pad.dataset.phase = p;
  };

  const tick = () => {
    const now = performance.now();
    if (phase === 'running') timeEl.textContent = formatTime(now - start);
    if (phase === 'inspecting' || (phase === 'holding' && inspectStart) || (phase === 'ready' && inspectStart)) {
      const left = 15 - (now - inspectStart) / 1000;
      if (phase === 'inspecting') timeEl.textContent = left > 0 ? String(Math.ceil(left)) : left > -2 ? '+2' : 'DNF';
    }
    if (phase === 'holding' && now - holdStart > 300) {
      setPhase('ready');
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const press = () => {
    if (phase === 'running') {
      const ms = performance.now() - start;
      setPhase('idle');
      timeEl.textContent = formatTime(ms);
      addSolve({ ms: Math.round(ms), scramble, at: Date.now(), penalty: inspectPenalty });
      inspectStart = 0;
      scramble = randomScramble(20);
      renderScramble();
      renderStats();
      return;
    }
    if (phase === 'idle' && data.settings.inspection) {
      setPhase('inspecting');
      inspectStart = performance.now();
      inspectPenalty = undefined;
      $('#hint').innerHTML = 'Inspecting. Hold <kbd>Space</kbd> to arm, release to start.';
      return;
    }
    if (phase === 'idle' || phase === 'inspecting') {
      holdStart = performance.now();
      setPhase('holding');
      if (!data.settings.inspection) timeEl.textContent = '0.00';
    }
  };

  const release = () => {
    if (phase === 'holding' && performance.now() - holdStart > 300) setPhase('ready');
    if (phase === 'holding') {
      setPhase(inspectStart ? 'inspecting' : 'idle');
      return;
    }
    if (phase === 'ready') {
      if (inspectStart) {
        const over = (performance.now() - inspectStart) / 1000 - 15;
        inspectPenalty = over > 2 ? 'DNF' : over > 0 ? '+2' : undefined;
      } else inspectPenalty = undefined;
      start = performance.now();
      setPhase('running');
      $('#hint').textContent = 'Press any key or tap to stop.';
    }
  };

  const keydown = (e: KeyboardEvent) => {
    if (isTyping(e, 'input, select, textarea, button')) return;
    if (phase === 'running') {
      e.preventDefault();
      press();
      return;
    }
    if (e.key === ' ' && !e.repeat) {
      e.preventDefault();
      press();
    } else if (e.key === ' ') e.preventDefault();
    if (e.key === 'Escape') {
      setPhase('idle');
      inspectStart = 0;
      timeEl.textContent = '0.00';
    }
  };
  const keyup = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      release();
    }
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    press();
  });
  pad.addEventListener('pointerup', () => release());

  $('#new-scr').addEventListener('click', () => {
    scramble = randomScramble(20);
    renderScramble();
  });
  $<HTMLInputElement>('#insp').addEventListener('change', (e) => {
    data.settings.inspection = (e.target as HTMLInputElement).checked;
    save();
  });
  $('#clear').addEventListener('click', () => {
    if (!data.solves.length || !confirm(`Delete all ${data.solves.length} solves?`)) return;
    data.solves = [];
    save();
    renderStats();
  });
  $('#list').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    const li = (e.target as HTMLElement).closest('li');
    if (!b || !li) return;
    const i = +li.dataset.i!;
    const p = b.dataset.p;
    if (p === 'del') data.solves.splice(i, 1);
    else if (p === '+2' || p === 'DNF') data.solves[i].penalty = data.solves[i].penalty === p ? undefined : p;
    save();
    renderStats();
  });

  renderScramble();
  renderStats();
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
  };
}
