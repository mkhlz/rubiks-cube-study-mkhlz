import { SETS, ALG_BY_ID, algKey } from '../data/algs';
import { algStatus, AlgStatus, setAlgStatus } from '../store';
import { algCard, esc, showAlgModal } from '../ui';

const NEXT: Record<AlgStatus, AlgStatus> = { new: 'learning', learning: 'learned', learned: 'new' };

/** Click handling shared by every page that shows alg cards. */
export function bindAlgCards(root: HTMLElement, onChange?: () => void) {
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    const card = t.closest<HTMLElement>('.alg-card');
    if (!act || !card) return;
    const key = card.dataset.key!;
    const a = ALG_BY_ID.get(key);
    if (!a) return;
    if (act === 'show') showAlgModal(a);
    if (act === 'status') {
      setAlgStatus(key, NEXT[algStatus(key)]);
      const tmp = document.createElement('div');
      tmp.innerHTML = algCard(a);
      card.replaceWith(tmp.firstElementChild!);
      onChange?.();
    }
  });
}

export function algsView(root: HTMLElement, setKey?: string) {
  const set = SETS.find((s) => s.key === setKey) ?? SETS[0];
  let filter = 'all';
  let query = '';

  root.innerHTML = `
    <header class="page-head"><h1>Algorithm library</h1>
      <p>Every algorithm is checked by automated tests against the cube engine, and every diagram is generated from its algorithm. Click a diagram to watch it on a 3D cube; click the status to track your learning.</p></header>
    <nav class="tabs">${SETS.map((s) => `<a href="#/algs/${s.key}" class="${s.key === set.key ? 'active' : ''}">${esc(s.title)} <small>${s.algs.length}</small></a>`).join('')}</nav>
    <div class="set-head">
      <p>${esc(set.blurb)}</p>
      <div class="filters">
        <input type="search" id="q" placeholder="Search name, group or moves" />
        <select id="f"><option value="all">All</option><option value="new">New</option><option value="learning">Learning</option><option value="learned">Learned</option></select>
      </div>
      <div class="progress-line" id="progress"></div>
    </div>
    <div id="groups"></div>`;

  const render = () => {
    const algs = set.algs.filter((a) => {
      if (filter !== 'all' && algStatus(algKey(a)) !== filter) return false;
      if (query && !`${a.name} ${a.group} ${a.alg} ${a.id}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const groups = [...new Set(algs.map((a) => a.group))];
    root.querySelector('#groups')!.innerHTML =
      groups
        .map((g) => `<section class="alg-group"><h3>${esc(g)}</h3><div class="alg-grid">${algs.filter((a) => a.group === g).map(algCard).join('')}</div></section>`)
        .join('') || '<p class="empty">No algorithms match.</p>';
    const learned = set.algs.filter((a) => algStatus(algKey(a)) === 'learned').length;
    const learning = set.algs.filter((a) => algStatus(algKey(a)) === 'learning').length;
    root.querySelector('#progress')!.innerHTML = `<div class="bar"><i style="width:${(learned / set.algs.length) * 100}%"></i><i class="l2" style="width:${(learning / set.algs.length) * 100}%"></i></div><small>${learned} learned · ${learning} learning · ${set.algs.length - learned - learning} new</small>`;
  };
  render();
  root.querySelector('#q')!.addEventListener('input', (e) => {
    query = (e.target as HTMLInputElement).value.toLowerCase().trim();
    render();
  });
  root.querySelector('#f')!.addEventListener('change', (e) => {
    filter = (e.target as HTMLSelectElement).value;
    render();
  });
  bindAlgCards(root, render);
}
