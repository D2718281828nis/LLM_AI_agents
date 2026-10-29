/* Boot: mount every registered figure, theme toggle, table-of-contents highlight. */
'use strict';

(function () {
  // Light / dark: explicit choice wins, else the OS setting. Shared with the course home page via the 'theme' key.
  const root = document.documentElement;
  const btns = [...document.querySelectorAll('[data-theme-set]')];
  const os = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (os.matches ? 'dark' : 'light');
  const mark = () => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === current())));
  try { const t = localStorage.getItem('theme') || localStorage.getItem('explainer-theme'); if (t) root.dataset.theme = t; } catch (e) { /* storage blocked */ }
  btns.forEach(b => b.addEventListener('click', () => {
    root.dataset.theme = b.dataset.themeSet;
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* storage blocked */ }
    mark();
  }));
  os.addEventListener('change', mark);
  mark();

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
