import { CHAPTERS } from '../data/theory';
import { el, esc } from '../ui';
import { renderSection } from './learn';
import { bindAlgCards } from './algs';

/** Long-form theory page with a sticky table of contents. */
export function theoryView(root: HTMLElement) {
  root.innerHTML = `
    <header class="page-head"><h1>Theory</h1>
      <p>The "why" behind the cube: pieces and invariants, how algorithms really work, why methods differ, and how computers solve it in 20 moves. Opinionated, illustrated, and every number checked by the app's test suite.</p></header>
    <div class="theory-layout">
      <nav class="toc" aria-label="Chapters"><ol>${CHAPTERS.map((c) => `<li><a href="#/theory#${c.id}" data-ch="${c.id}">${esc(c.title)}</a></li>`).join('')}</ol></nav>
      <div class="theory-body"></div>
    </div>`;
  const body = root.querySelector<HTMLElement>('.theory-body')!;
  for (const ch of CHAPTERS) {
    const sec = el('section', 'chapter');
    sec.id = ch.id;
    sec.innerHTML = `<span class="level">${esc(ch.kicker)}</span><h2 class="chapter-title">${esc(ch.title)}</h2>`;
    ch.sections.forEach((s, i) => renderSection(sec, s, `theory-${ch.id}`, i));
    body.appendChild(sec);
  }
  bindAlgCards(body);

  // Highlight the chapter being read: the last one whose top has passed 35% of the viewport.
  const links = new Map([...root.querySelectorAll<HTMLAnchorElement>('[data-ch]')].map((a) => [a.dataset.ch!, a]));
  const chapters = [...body.querySelectorAll<HTMLElement>('.chapter')];
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.35;
    let current = chapters[0];
    for (const c of chapters) if (c.getBoundingClientRect().top <= line) current = c;
    links.forEach((a, id) => a.classList.toggle('on', id === current.id));
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  root.querySelector('.toc')!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-ch]');
    if (!a) return;
    e.preventDefault();
    history.replaceState(null, '', `#/theory#${a.dataset.ch}`);
    document.getElementById(a.dataset.ch!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const hash = location.hash.split('#')[2];
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  return () => window.removeEventListener('scroll', onScroll);
}
