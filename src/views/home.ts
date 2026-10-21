import { TRACKS, ALL_LESSONS } from '../data/curriculum';
import { SETS, algKey } from '../data/algs';
import { data } from '../store';
import { averageOf, best, formatTime } from '../stats';
import { esc, track } from '../ui';
import { CubeView } from '../cube/renderer';
import { randomScramble } from '../cube/scramble';
import { invertAlg } from '../cube/engine';

export function homeView(root: HTMLElement) {
  const done = ALL_LESSONS.filter((l) => data.lessons[l.id]).length;
  const next = ALL_LESSONS.find((l) => !data.lessons[l.id]);
  const learned = SETS.flatMap((s) => s.algs).filter((a) => data.algs[algKey(a)] === 'learned').length;
  const totalAlgs = SETS.flatMap((s) => s.algs).length;
  const ao5 = averageOf(data.solves, 5);
  const pb = best(data.solves);

  root.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <span class="eyebrow">Rubik's Cube study app</span>
      <h1>From your first twist to <span class="scribble"><span class="grad">speedcuber</span>.<svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 16 C 60 6, 110 22, 160 12 S 250 6, 296 14"/></svg></span></h1>
      <p class="lead">A full course with a real 3D cube: learn notation, solve it for the first time with the beginner method, then climb through CFOP, all 41 F2L, 57 OLL and 21 PLL cases with a spaced-repetition trainer, timer and week-by-week study plans.</p>
      <div class="hero-cta">
        <a class="btn lg" href="#/learn/${next ? next.id : 'f-anatomy'}">${done ? 'Continue: ' + esc(next?.title ?? 'Review') : 'Start lesson 1'} →</a>
        <a class="btn ghost lg" href="#/play">Open the playground</a>
      </div>
    </div>
    <div class="hero-cube" id="hero-cube" aria-label="Animated 3D cube"></div>
  </section>

  ${marquee(['Learn it', 'Solve it', 'Drill it', 'Time it', 'Beat your PB', 'Zero to sub-20'], '')}
  ${marquee(["R U R' U'", "R U R' U R U2 R'", "F R U R' U' F'", "M2 U M2 U2 M2 U M2", "R U R' U' R' F R2 U' R' U' R U R' F'", "r U R' U' M2 U R U' R' U' M'", 'x2 y', "R' F R' B2 R F' R' B2 R2"], 'alt')}

  <section class="stats-row">
    <div class="stat"><b>${done}/${ALL_LESSONS.length}</b><span>lessons done</span></div>
    <div class="stat"><b>${learned}/${totalAlgs}</b><span>algorithms learned</span></div>
    <div class="stat"><b>${pb === null ? '—' : formatTime(pb)}</b><span>best single</span></div>
    <div class="stat"><b>${ao5 === null ? '—' : formatTime(ao5)}</b><span>current ao5</span></div>
  </section>

  <h2 class="section-title">Your path</h2>
  <section class="path">
    ${TRACKS.map((t) => {
      const n = t.lessons.filter((l) => data.lessons[l.id]).length;
      const pct = Math.round((n / t.lessons.length) * 100);
      return `<a class="path-card" href="#/learn#${t.id}" style="--accent:${t.color}">
        <span class="level">${esc(t.level)}</span>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.goal)}</p>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <small>${n}/${t.lessons.length} lessons</small>
      </a>`;
    }).join('')}
  </section>

  <h2 class="section-title">Everything you need</h2>
  <section class="features">
    <a class="feature" href="#/play"><span>🧊</span><h4>Playground</h4><p>Drag layers, use the keyboard, scramble, undo and type in any algorithm.</p></a>
    <a class="feature" href="#/algs"><span>📚</span><h4>Algorithm library</h4><p>${totalAlgs} algorithms, each verified by tests, with diagrams and a 3D preview.</p></a>
    <a class="feature" href="#/trainer"><span>🧠</span><h4>Trainer</h4><p>Spaced-repetition flashcards for the cases you are learning.</p></a>
    <a class="feature" href="#/timer"><span>⏱️</span><h4>Timer</h4><p>WCA-style inspection, ao5 / ao12 / ao100 and session history.</p></a>
    <a class="feature" href="#/plans"><span>🗓️</span><h4>Study plans</h4><p>Week-by-week plans from "never solved" to sub-15.</p></a>
    <a class="feature" href="#/learn/f-notation"><span>✍️</span><h4>Notation</h4><p>Every move explained with a live cube you can press.</p></a>
  </section>`;

  const host = root.querySelector<HTMLElement>('#hero-cube')!;
  const view = track(new CubeView(host, { interactive: false, speed: 520 }));
  let alive = true;
  const loop = async () => {
    while (alive) {
      const s = randomScramble(8);
      await view.play(s);
      await wait(1600);
      if (!alive) break;
      await view.play(invertAlg(s));
      await wait(2600);
    }
  };
  loop();
  return () => {
    alive = false;
  };
}

/** Infinite ticker; the item list is doubled so the loop is seamless. */
export function marquee(items: string[], cls: string) {
  const row = items.map((t) => `<span>${esc(t)}</span>`).join('');
  return `<div class="marquee ${cls}" aria-hidden="true"><div class="marquee-track">${row}${row}${row}${row}</div></div>`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
