import { ALL_LESSONS, lessonById, Section, TRACKS } from '../data/curriculum';
import { ALG_BY_ID } from '../data/algs';
import { completeLesson, data, save } from '../store';
import { algCard, cubePlayer, el, esc } from '../ui';
import { CubeView } from '../cube/renderer';
import { track } from '../ui';
import { bindAlgCards } from './algs';

export function learnIndexView(root: HTMLElement) {
  root.innerHTML = `
    <header class="page-head"><h1>Course</h1><p>Five tracks, ${ALL_LESSONS.length} lessons. Work top to bottom; every lesson has a live cube.</p></header>
    ${TRACKS.map(
      (t) => `<section class="track" id="${t.id}" style="--accent:${t.color}">
        <div class="track-head"><span class="level">${esc(t.level)}</span><h2>${esc(t.title)}</h2><p>${esc(t.goal)}</p></div>
        <ol class="lesson-list">
          ${t.lessons
            .map(
              (l) => `<li class="${data.lessons[l.id] ? 'done' : ''}"><a href="#/learn/${l.id}">
                <span class="check">${data.lessons[l.id] ? '✓' : ''}</span>
                <span class="l-title">${esc(l.title)}</span>
                <span class="l-sum">${esc(l.summary)}</span>
                <span class="l-min">${l.minutes} min</span></a></li>`,
            )
            .join('')}
        </ol></section>`,
    ).join('')}`;
  const hash = location.hash.split('#')[2];
  if (hash) root.querySelector(`#${CSS.escape(hash)}`)?.scrollIntoView();
}

export function renderSection(host: HTMLElement, s: Section, lessonId: string, i: number) {
  switch (s.t) {
    case 'figure':
      host.appendChild(el('figure', 'figure', `${s.html}<figcaption>${s.caption}</figcaption>`));
      break;
    case 'photo': {
      const p = s.photo;
      host.appendChild(
        el(
          'figure',
          `photo${s.float ? ` float-${s.float}` : ''}${s.wide ? ' wide' : ''}`,
          `<img src="${import.meta.env.BASE_URL}photos/${p.file}" width="${p.w}" height="${p.h}" alt="${esc(p.alt)}" loading="lazy" decoding="async">
          <figcaption>${s.caption} <small class="credit">Photo: ${esc(p.author)} · <a href="${p.source}" target="_blank" rel="noopener">${esc(p.license)}</a>, via Wikimedia Commons</small></figcaption>`,
        ),
      );
      break;
    }
    case 'table':
      host.appendChild(
        el(
          'div',
          'table-wrap',
          `<table class="data-table">${s.caption ? `<caption>${s.caption}</caption>` : ''}<thead><tr>${s.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${s.rows
            .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
        ),
      );
      break;
    case 'timeline':
      host.appendChild(el('ol', 'timeline', s.items.map(([when, what]) => `<li><span class="when">${when}</span><div>${what}</div></li>`).join('')));
      break;
    case 'facts':
      host.appendChild(el('div', 'facts', s.items.map(([big, label]) => `<div class="fact"><b>${big}</b><span>${label}</span></div>`).join('')));
      break;
    case 'p':
      host.appendChild(el('p', '', s.html));
      break;
    case 'h':
      host.appendChild(el('h2', '', esc(s.text)));
      break;
    case 'list': {
      const list = el(s.ordered ? 'ol' : 'ul', 'content-list');
      list.innerHTML = s.items.map((x) => `<li>${x}</li>`).join('');
      host.appendChild(list);
      break;
    }
    case 'tip': {
      const label = s.kind === 'warn' ? 'Watch out' : s.kind === 'pro' ? 'Going further' : 'Tip';
      host.appendChild(el('aside', `callout ${s.kind ?? 'tip'}`, `<b>${label}</b><div>${s.html}</div>`));
      break;
    }
    case 'cube':
      cubePlayer(host, { setup: s.setup, caseOf: s.caseOf, play: s.play, mask: s.mask, caption: s.caption });
      break;
    case 'notation': {
      const wrap = el('div', 'player notation');
      const stage = el('div', 'stage');
      stage.style.height = '280px';
      const buttons = el('div', 'move-grid');
      buttons.innerHTML = s.moves.map((m) => `<button class="move-btn" data-m="${esc(m)}">${esc(m)}</button>`).join('') + '<button class="move-btn reset" data-m="reset">Reset</button>';
      wrap.append(stage, buttons, el('p', 'caption', 'Press a move to see it. Drag the background to look around.'));
      host.appendChild(wrap);
      const view = track(new CubeView(stage, { interactive: true, speed: 320 }));
      buttons.addEventListener('click', (e) => {
        const m = (e.target as HTMLElement).closest('button')?.dataset.m;
        if (!m) return;
        if (m === 'reset') view.settle().then(() => view.rewind());
        else if (!view.busy) view.turnMove(m);
      });
      break;
    }
    case 'algs': {
      const grid = el('div', 'alg-grid');
      grid.innerHTML = s.keys.map((k) => ALG_BY_ID.get(k)).filter(Boolean).map((a) => algCard(a!)).join('');
      host.appendChild(grid);
      break;
    }
    case 'quiz': {
      const qid = `${lessonId}:${i}`;
      const box = el('div', 'quiz');
      box.innerHTML = `<p class="q"><b>Quick check.</b> ${s.q}</p><div class="opts">${s.options
        .map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`)
        .join('')}</div><p class="explain" hidden></p>`;
      const explain = box.querySelector<HTMLElement>('.explain')!;
      const show = (j: number) => {
        box.querySelectorAll<HTMLButtonElement>('.opt').forEach((b, k) => {
          b.classList.toggle('right', k === s.answer);
          b.classList.toggle('wrong', k === j && j !== s.answer);
        });
        explain.hidden = false;
        explain.innerHTML = `${j === s.answer ? '✅ Correct.' : '❌ Not quite.'} ${s.explain}`;
      };
      if (data.quiz[qid]) show(s.answer);
      box.addEventListener('click', (e) => {
        const j = (e.target as HTMLElement).closest<HTMLElement>('.opt')?.dataset.j;
        if (j === undefined) return;
        show(+j);
        if (+j === s.answer) {
          data.quiz[qid] = true;
          save();
        }
      });
      host.appendChild(box);
      break;
    }
  }
}

export function lessonView(root: HTMLElement, id: string) {
  const lesson = lessonById(id);
  if (!lesson) {
    root.innerHTML = `<p>Lesson not found. <a href="#/learn">Back to the course</a></p>`;
    return;
  }
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  const prev = ALL_LESSONS[idx - 1];
  const next = ALL_LESSONS[idx + 1];
  const done = !!data.lessons[id];
  root.innerHTML = `
    <nav class="crumbs"><a href="#/learn">Course</a> › <a href="#/learn#${lesson.track.id}">${esc(lesson.track.title)}</a></nav>
    <article class="lesson" style="--accent:${lesson.track.color}">
      <header class="lesson-head">
        <span class="level">${esc(lesson.track.level)} · ${lesson.minutes} min</span>
        <h1>${esc(lesson.title)}</h1>
        <p class="lead">${esc(lesson.summary)}</p>
      </header>
      <div class="lesson-body"></div>
      <footer class="lesson-foot">
        <button class="btn lg ${done ? 'ghost' : ''}" data-complete>${done ? '✓ Completed (undo)' : 'Mark lesson complete'}</button>
        <div class="pager">
          ${prev ? `<a class="btn ghost" href="#/learn/${prev.id}">← ${esc(prev.title)}</a>` : ''}
          ${next ? `<a class="btn ghost" href="#/learn/${next.id}">${esc(next.title)} →</a>` : ''}
        </div>
      </footer>
    </article>`;
  const body = root.querySelector<HTMLElement>('.lesson-body')!;
  lesson.sections.forEach((s, i) => renderSection(body, s, id, i));
  bindAlgCards(body);
  const btn = root.querySelector<HTMLButtonElement>('[data-complete]')!;
  btn.addEventListener('click', () => {
    completeLesson(id, !data.lessons[id]);
    if (data.lessons[id] && next) {
      location.hash = `#/learn/${next.id}`;
      return;
    }
    btn.textContent = data.lessons[id] ? '✓ Completed (undo)' : 'Mark lesson complete';
    btn.classList.toggle('ghost', !!data.lessons[id]);
  });
}
