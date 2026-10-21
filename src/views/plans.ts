import { PLANS } from '../data/plans';
import { data, save } from '../store';
import { esc } from '../ui';

export function plansView(root: HTMLElement, planId?: string) {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const checks = (data.plans[plan.id] ??= {});
  const total = plan.weeks.reduce((n, w) => n + w.tasks.length, 0);

  const render = () => {
    const done = plan.weeks.reduce((n, w) => n + w.tasks.filter((t) => checks[t.id]).length, 0);
    root.innerHTML = `
    <header class="page-head"><h1>Study plans</h1><p>Pick the plan that matches your current level. Tick tasks off as you go; progress is saved in this browser.</p></header>
    <nav class="plan-picker">${PLANS.map((p) => {
      const c = data.plans[p.id] ?? {};
      const n = p.weeks.reduce((k, w) => k + w.tasks.filter((t) => c[t.id]).length, 0);
      const tot = p.weeks.reduce((k, w) => k + w.tasks.length, 0);
      return `<a href="#/plans/${p.id}" class="plan-tab ${p.id === plan.id ? 'active' : ''}">
        <b>${esc(p.title)}</b><small>${esc(p.from)} → ${esc(p.to)}</small><div class="bar"><i style="width:${(n / tot) * 100}%"></i></div></a>`;
    }).join('')}</nav>
    <section class="plan">
      <div class="plan-head">
        <h2>${esc(plan.title)}</h2>
        <p>${esc(plan.from)} → <b>${esc(plan.to)}</b> · about ${plan.minutesPerDay} min/day · ${plan.weeks.length} stage${plan.weeks.length > 1 ? 's' : ''}</p>
        <div class="bar big"><i style="width:${(done / total) * 100}%"></i></div><small>${done}/${total} tasks</small>
      </div>
      ${plan.weeks
        .map(
          (w) => `<div class="week">
          <div class="week-head"><h3>${esc(w.title)}</h3><p>${esc(w.focus)}</p></div>
          <div class="week-cols">
            <div><h4>Daily routine</h4><ul class="content-list">${w.daily.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>
            <div><h4>Tasks</h4><ul class="tasks">${w.tasks
              .map(
                (t) => `<li><label><input type="checkbox" data-t="${t.id}" ${checks[t.id] ? 'checked' : ''}/> <span>${esc(t.text)}</span></label>${t.link ? ` <a href="${t.link}" class="go">open →</a>` : ''}</li>`,
              )
              .join('')}</ul></div>
          </div>
          <p class="checkpoint">🏁 Checkpoint: ${esc(w.checkpoint)}</p>
        </div>`,
        )
        .join('')}
    </section>`;
  };
  render();
  root.addEventListener('change', (e) => {
    const id = (e.target as HTMLInputElement).dataset.t;
    if (!id) return;
    checks[id] = (e.target as HTMLInputElement).checked;
    save();
    render();
  });
}
