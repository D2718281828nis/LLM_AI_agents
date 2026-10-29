/* Boot: mount every registered figure, theme toggle, table-of-contents highlight. */
'use strict';

(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');
  const prefersDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
  const current = () => root.dataset.theme || (prefersDark() ? 'dark' : 'light');
  const label = () => { btn.textContent = current() === 'dark' ? '☀︎' : '☾'; btn.title = `Switch to ${current() === 'dark' ? 'light' : 'dark'} theme`; };
  try { const t = localStorage.getItem('explainer-theme'); if (t) root.dataset.theme = t; } catch (e) { /* storage blocked */ }
  btn.addEventListener('click', () => {
    root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('explainer-theme', root.dataset.theme); } catch (e) { /* storage blocked */ }
    label();
  });
  label();

  for (const [name, fn] of Figs) mount(name, fn);

  const links = [...document.querySelectorAll('.toc a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      const on = links.find(a => a.classList.contains('on'));
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(t => obs.observe(t));
})();
