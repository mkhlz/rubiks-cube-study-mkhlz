import { CHAPTERS } from '../data/theory';
import { el, esc } from '../ui';
import { renderSection } from './learn';
import { bindAlgCards } from './algs';

/** Long-form theory guide with a sticky, grouped table of contents. */
export function theoryView(root: HTMLElement) {
  const tocItems = CHAPTERS.map(
    (c) => `${c.part ? `<li class="toc-part">${esc(c.part)}</li>` : ''}<li><a href="#/theory#${c.id}" data-ch="${c.id}">${esc(c.title)}</a></li>`,
  ).join('');
  root.innerHTML = `
    <header class="page-head"><h1>Theory</h1>
      <p>A one-stop guide to the Rubik's Cube: where it came from, how it works inside, the maths, how algorithms and methods work, how computers and robots solve it, the competitions, the records and the people behind them. The maths is checked by the app's test suite; history and records cite their sources in the last chapter.</p></header>
    <div class="theory-layout">
      <details class="toc" open><summary>Contents · ${CHAPTERS.length} chapters</summary><nav aria-label="Chapters"><ol>${tocItems}</ol></nav></details>
      <div class="theory-body"></div>
    </div>`;
  const toc = root.querySelector<HTMLDetailsElement>('.toc')!;
  if (window.matchMedia('(max-width: 900px)').matches) toc.open = false;
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
  let currentId = '';
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.35;
    let current = chapters[0];
    for (const c of chapters) if (c.getBoundingClientRect().top <= line) current = c;
    if (current.id === currentId) return;
    currentId = current.id;
    links.forEach((a, id) => a.classList.toggle('on', id === current.id));
    // Keep the active entry visible in a scrolling table of contents.
    const a = links.get(current.id);
    const nav = toc.querySelector('nav')!;
    if (a && nav.scrollHeight > nav.clientHeight) {
      const top = a.offsetTop - nav.offsetTop;
      if (top < nav.scrollTop || top > nav.scrollTop + nav.clientHeight - 40) nav.scrollTop = top - nav.clientHeight / 2;
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  toc.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-ch]');
    if (!a) return;
    e.preventDefault();
    history.replaceState(null, '', `#/theory#${a.dataset.ch}`);
    document.getElementById(a.dataset.ch!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.matchMedia('(max-width: 900px)').matches) toc.open = false;
  });
  const hash = location.hash.split('#')[2];
  if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  return () => window.removeEventListener('scroll', onScroll);
}
