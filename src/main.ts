import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/martian-mono/standard.css';
import './style.css';
import { closeModal, disposeCubes, esc } from './ui';
import { homeView } from './views/home';
import { puzzlesView } from './views/puzzles';
import { ALL_LESSONS } from './data/curriculum';
import { SETS, algKey } from './data/algs';
import { PUZZLES } from './data/puzzles';
import { best, formatTime } from './stats';
import { learnIndexView, lessonView } from './views/learn';
import { playView } from './views/play';
import { algsView } from './views/algs';
import { trainerView } from './views/trainer';
import { timerView } from './views/timer';
import { plansView } from './views/plans';
import { theoryView } from './views/theory';
import { data, exportData, importData, onChange, resetAll, save } from './store';

type View = (root: HTMLElement, arg?: string) => void | (() => void);

const ROUTES: Record<string, View> = {
  '': homeView,
  learn: (r, id) => (id ? lessonView(r, id) : learnIndexView(r)),
  play: playView,
  algs: algsView,
  trainer: trainerView,
  puzzles: puzzlesView,
  timer: timerView,
  plans: plansView,
  theory: theoryView,
  settings: settingsView,
};

const NAV = [
  ['learn', 'Course'],
  ['theory', 'Theory'],
  ['play', 'Playground'],
  ['algs', 'Algorithms'],
  ['trainer', 'Trainer'],
  ['puzzles', 'Puzzles'],
  ['timer', 'Timer'],
  ['plans', 'Plans'],
];

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#/"><span class="logo" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>CubeCraft <b>Academy</b></a>
    <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="mainnav">${NAV.map(([k, v]) => `<a href="#/${k}" data-r="${k}">${v}</a>`).join('')}<a href="#/settings" data-r="settings" aria-label="Settings">⚙</a></nav>
  </header>
  <main id="view"></main>
  <footer class="site-foot"></footer>`;

const FOOT_COLS: [string, [string, string][]][] = [
  ['Learn', [['learn', 'Course'], ['theory', 'Theory'], ['algs', 'Algorithms'], ['plans', 'Study plans']]],
  ['Practise', [['play', 'Playground'], ['trainer', 'Trainer'], ['puzzles', 'Puzzles'], ['timer', 'Timer']]],
];

/** Footer with live progress; re-rendered on every route so the numbers stay current. */
function renderFooter() {
  const lessons = ALL_LESSONS.filter((l) => data.lessons[l.id]).length;
  const algs = SETS.flatMap((s) => s.algs);
  const learned = algs.filter((a) => data.algs[algKey(a)] === 'learned').length;
  const solved = PUZZLES.filter((p) => data.puzzles[p.id]).length;
  const pb = best(data.solves);
  const stat = (v: string, label: string, href: string) => `<a class="foot-stat" href="#/${href}"><b>${v}</b><span>${label}</span></a>`;
  app.querySelector('.site-foot')!.innerHTML = `
    <div class="foot-stickers" aria-hidden="true">${'<i></i>'.repeat(6)}</div>
    <div class="foot-inner">
      <div class="foot-brand">
        <a class="brand" href="#/"><span class="logo" aria-hidden="true">${'<i></i>'.repeat(9)}</span>CubeCraft <b>Academy</b></a>
        <p class="foot-tag">Forty-three quintillion positions. <em>One of them is solved.</em></p>
        <p class="foot-note">A free, open-source study app. No accounts, no tracking: your progress lives only in this browser.</p>
      </div>
      ${FOOT_COLS.map(([h, links]) => `<nav class="foot-col" aria-label="${h}"><h4>${h}</h4><ul>${links.map(([k, v]) => `<li><a href="#/${k}">${v}</a></li>`).join('')}</ul></nav>`).join('')}
      <div class="foot-col foot-progress"><h4>Your progress</h4>
        <div class="foot-stats">
          ${stat(`${lessons}<small>/${ALL_LESSONS.length}</small>`, 'lessons', 'learn')}
          ${stat(`${learned}<small>/${algs.length}</small>`, 'algorithms', 'algs')}
          ${stat(`${solved}<small>/${PUZZLES.length}</small>`, 'puzzles', 'puzzles')}
          ${stat(pb === null ? '—' : formatTime(pb), 'best single', 'timer')}
        </div>
      </div>
    </div>
    <div class="foot-bar">
      <span>MIT licence · photos from Wikimedia Commons, <a href="#/theory#sources">credited in Theory</a></span>
      <span class="foot-links"><a href="#/settings">Settings &amp; backup</a><a href="https://github.com/mkhlz/rubiks-cube-study-mkhlz" target="_blank" rel="noopener">GitHub ↗</a><button class="foot-top" type="button">Back to top ↑</button></span>
    </div>`;
}
onChange(renderFooter);
app.querySelector('.site-foot')!.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('.foot-top')) window.scrollTo({ top: 0, behavior: 'smooth' });
});

const menuBtn = app.querySelector<HTMLButtonElement>('.menu-btn')!;
menuBtn.addEventListener('click', () => {
  const open = app.classList.toggle('nav-open');
  menuBtn.setAttribute('aria-expanded', String(open));
});

let cleanup: void | (() => void);

function route() {
  const hash = location.hash.replace(/^#\/?/, '').split('#')[0];
  const [name, arg] = hash.split('/');
  const view = ROUTES[name] ?? homeView;
  if (typeof cleanup === 'function') cleanup();
  closeModal();
  disposeCubes();
  const fresh = document.createElement('div');
  fresh.className = `page page-${name || 'home'}`;
  document.getElementById('view')!.replaceChildren(fresh);
  cleanup = view(fresh, arg ? decodeURIComponent(arg) : undefined);
  app.classList.remove('nav-open');
  renderFooter();
  app.querySelectorAll<HTMLAnchorElement>('.mainnav a').forEach((a) => a.classList.toggle('active', a.dataset.r === name));
  const title = NAV.find(([k]) => k === name)?.[1];
  document.title = title ? `${title} · CubeCraft Academy` : 'CubeCraft Academy';
  if (!location.hash.split('#')[2]) window.scrollTo(0, 0);
}

function applyTheme() {
  const t = data.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

function settingsView(root: HTMLElement) {
  root.innerHTML = `
    <header class="page-head"><h1>Settings & progress</h1><p>Your progress lives in this browser only. Export it to move it to another device.</p></header>
    <div class="panel">
      <h3>Theme</h3>
      <div class="row-btns">${(['auto', 'light', 'dark'] as const).map((t) => `<button class="btn ${data.settings.theme === t ? '' : 'ghost'} sm" data-theme="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    </div>
    <div class="panel">
      <h3>Backup</h3>
      <div class="row-btns">
        <button class="btn sm" data-a="export">Download progress (.json)</button>
        <label class="btn ghost sm file-btn">Import progress<input type="file" accept="application/json" hidden></label>
        <button class="btn danger sm" data-a="reset">Reset everything</button>
      </div>
      <p class="hint" id="msg"></p>
    </div>
    <div class="panel">
      <h3>About</h3>
      <p>Algorithms are standard community algorithms, each verified by automated tests against this app's cube engine. F2L solutions are generated by a search over &lt;R, U, F&gt;. Scrambles are random-move (not WCA random-state).</p>
    </div>`;
  const msg = (t: string) => (root.querySelector('#msg')!.textContent = t);
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.dataset.theme) {
      data.settings.theme = b.dataset.theme as 'auto';
      save();
      applyTheme();
      root.querySelectorAll<HTMLElement>('[data-theme]').forEach((x) => x.classList.toggle('ghost', x !== b));
    }
    if (b.dataset.a === 'export') {
      const blob = new Blob([exportData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cubecraft-progress.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (b.dataset.a === 'reset' && confirm('Delete all lessons, algorithm progress, solves and plan ticks?')) {
      resetAll();
      msg('Progress reset.');
    }
  });
  root.querySelector<HTMLInputElement>('input[type=file]')!.addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      importData(await f.text());
      applyTheme();
      msg(`Imported ${esc(f.name)}.`);
    } catch {
      msg('That file is not a valid progress export.');
    }
  });
}

applyTheme();
window.addEventListener('hashchange', route);
route();
