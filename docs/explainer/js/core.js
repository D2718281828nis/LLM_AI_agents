/* Shared helpers for the explainer: DOM/SVG builders, tooltip, controls,
   a tiny TF-IDF vectoriser, PCA and a seeded RNG. No dependencies. */
'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LANG = (document.documentElement.lang || 'en').slice(0, 2);

function setAttrs(node, attrs) {
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
}
function appendKids(node, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    node.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  setAttrs(n, attrs); appendKids(n, kids);
  return n;
}
function sv(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(SVG_NS, tag);
  setAttrs(n, attrs); appendKids(n, kids);
  return n;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = (x, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '—';
const pct = (x, d = 0) => (100 * x).toFixed(d) + '%';
const sum = a => a.reduce((s, x) => s + x, 0);
const range = n => Array.from({ length: n }, (_, i) => i);

/* ---------- scales & axes ---------- */
function lin(d0, d1, r0, r1) {
  const f = x => r0 + (x - d0) / (d1 - d0 || 1) * (r1 - r0);
  f.inv = y => d0 + (y - r0) / (r1 - r0 || 1) * (d1 - d0);
  return f;
}
function niceTicks(min, max, n = 5) {
  const span = max - min || 1;
  const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0);
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
/* Charts draw in container pixels (so text stays legible on phones) and redraw when the width changes. */
function fitWidth(node, max, min = 300) { return Math.round(clamp(node.clientWidth || max, min, max)); }
const resizers = [];
function onResize(fn) { resizers.push(fn); }
let resizeTimer, lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return; // ignore mobile URL-bar height changes
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => resizers.forEach(f => f()), 150);
});
function svgRoot(w, h, label) {
  return sv('svg', { class: 'chart', viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label || '' });
}
function axisLeft(g, y, ticks, x0, x1, f = String) {
  for (const t of ticks) {
    g.append(sv('line', { class: 'grid', x1: x0, x2: x1, y1: y(t), y2: y(t) }));
    g.append(sv('text', { x: x0 - 6, y: y(t) + 4, 'text-anchor': 'end', class: 't-muted', text: f(t) }));
  }
}
function axisBottom(g, x, ticks, y0, f = String) {
  g.append(sv('line', { class: 'axis', x1: x(ticks[0]), x2: x(ticks[ticks.length - 1]), y1: y0, y2: y0 }));
  for (const t of ticks) g.append(sv('text', { x: x(t), y: y0 + 16, 'text-anchor': 'middle', class: 't-muted', text: f(t) }));
}

/* ---------- tooltip ---------- */
const Tip = (() => {
  let node;
  const ensure = () => node || (node = document.body.appendChild(el('div', { class: 'tip', role: 'tooltip' })));
  function show(html, ev) {
    const n = ensure();
    n.innerHTML = html;
    n.classList.add('show');
    move(ev);
  }
  function move(ev) {
    if (!node) return;
    const pad = 14, w = node.offsetWidth, h = node.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
    if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
    node.style.left = Math.max(8, x) + 'px';
    node.style.top = Math.max(8, y) + 'px';
  }
  function hide() { if (node) node.classList.remove('show'); }
  /* bind(node, () => htmlString) — the callback must escape any user text */
  function bind(target, htmlFn) {
    target.addEventListener('pointerenter', ev => {
      const fig = target.closest && target.closest('[data-fig]');
      ensure().dataset.fig = fig ? fig.dataset.fig : ''; // lets the translator use that figure's vocabulary
      show(htmlFn(), ev);
    });
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerleave', hide);
    return target;
  }
  return { show, move, hide, bind };
})();

/* ---------- controls ---------- */
function slider({ label, min, max, step = 1, value, format = v => v, onInput }) {
  const out = el('span', { class: 'val', text: format(value) });
  const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
  input.addEventListener('input', () => { out.textContent = format(+input.value); onInput && onInput(+input.value); });
  const wrap = el('label', { class: 'ctl' }, el('span', { class: 'lab' }, el('span', { text: label }), out), input);
  wrap.get = () => +input.value;
  wrap.set = v => { input.value = v; out.textContent = format(+v); };
  return wrap;
}
function select({ label, options, value, onChange }) {
  const s = el('select', { 'aria-label': label });
  for (const o of options) {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    s.append(el('option', { value: v, text: t, selected: v === value ? 'selected' : null }));
  }
  s.addEventListener('change', () => onChange && onChange(s.value));
  const wrap = el('label', { class: 'ctl' }, el('span', { class: 'lab', text: label }), s);
  wrap.get = () => s.value;
  wrap.set = v => { s.value = v; };
  return wrap;
}
function toggle({ label, checked = false, onChange }) {
  const i = el('input', { type: 'checkbox', checked: checked ? 'checked' : null });
  i.addEventListener('change', () => onChange && onChange(i.checked));
  const wrap = el('label', { class: 'toggle' }, i, el('span', { text: label }));
  wrap.get = () => i.checked;
  wrap.set = v => { i.checked = !!v; };
  return wrap;
}
function button(text, onClick, cls = '') {
  return el('button', { class: 'btn ' + cls, type: 'button', onclick: onClick, text });
}
function chips(items, onPick, activeIndex = -1) {
  const wrap = el('div', { class: 'chips' });
  items.forEach((it, i) => {
    const c = el('button', { class: 'chip' + (i === activeIndex ? ' on' : ''), type: 'button', text: it.label || it });
    c.addEventListener('click', () => {
      wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      onPick(it, i);
    });
    wrap.append(c);
  });
  wrap.clear = () => wrap.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
  return wrap;
}
function stat(k, v) {
  const vNode = el('div', { class: 'v' });
  const n = el('div', { class: 'stat' }, el('div', { class: 'k', text: k }), vNode);
  n.set = html => { vNode.innerHTML = html; };
  if (v != null) n.set(v);
  return n;
}
function legend(items) {
  return el('div', { class: 'legend' }, items.map(([c, t]) => el('span', {}, el('i', { style: `background:${c}` }), t)));
}

/* ---------- RNG ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.normal = () => {
    const u = r() || 1e-12, v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  return r;
}

/* ---------- text → vectors ---------- */
const STOP = new Set(('a an the and or of to for in on with is are was were be been being it its my i me im you your ' +
  'can do does did should what which how when who whom this that these those at by from as about if not no any ' +
  'have has had will would could may might than then so very please there their they them we our us he she his her ' +
  'just also into over under more most some such only own same too s t get got take taking').split(' '));

function stem(w) {
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 6 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 5 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}
function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => !STOP.has(w) && w.length > 1).map(stem);
}

/* Fit on a corpus; vec() maps any text into the corpus vocabulary (OOV words are ignored,
   exactly like a real embedding index that never saw a word). Vectors are L2-normalised. */
class TfIdf {
  constructor(texts) {
    this.vocab = new Map();
    const df = [];
    for (const t of texts) {
      for (const w of new Set(tokenize(t))) {
        if (!this.vocab.has(w)) { this.vocab.set(w, this.vocab.size); df.push(0); }
        df[this.vocab.get(w)]++;
      }
    }
    const N = texts.length;
    this.idf = df.map(d => Math.log((1 + N) / (1 + d)) + 1);
    this.dim = this.vocab.size;
  }
  vec(text) {
    const v = new Float64Array(this.dim);
    for (const w of tokenize(text)) {
      const i = this.vocab.get(w);
      if (i != null) v[i] += 1;
    }
    for (let i = 0; i < v.length; i++) if (v[i]) v[i] = (1 + Math.log(v[i])) * this.idf[i];
    return normalize(v);
  }
  known(text) { return tokenize(text).filter(w => this.vocab.has(w)); }
}
function normalize(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  if (n > 0) for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function mix(a, b, t) {
  const v = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) v[i] = (1 - t) * a[i] + t * b[i];
  return normalize(v);
}

/* Two leading principal components by power iteration with deflation. */
function pca2(rows, seed = 7) {
  const n = rows.length, d = rows[0].length;
  const mean = new Float64Array(d);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / n;
  let X = rows.map(r => r.map((x, j) => x - mean[j]));
  const rnd = mulberry32(seed);
  const comps = [], vars = [];
  let total = 0;
  for (const r of X) for (const x of r) total += x * x;
  for (let c = 0; c < 2; c++) {
    let v = normalize(Float64Array.from({ length: d }, () => rnd() - 0.5));
    for (let it = 0; it < 200; it++) {
      const Xv = X.map(r => dot(r, v));
      const nv = new Float64Array(d);
      X.forEach((r, i) => { for (let j = 0; j < d; j++) nv[j] += r[j] * Xv[i]; });
      v = normalize(nv);
    }
    const proj = X.map(r => dot(r, v));
    vars.push(sum(proj.map(p => p * p)));
    comps.push(v);
    X = X.map((r, i) => r.map((x, j) => x - proj[i] * v[j]));
  }
  return {
    explained: vars.map(x => x / (total || 1)),
    project(vec) { return comps.map(c => { let s = 0; for (let j = 0; j < d; j++) s += (vec[j] - mean[j]) * c[j]; return s; }); },
  };
}

/* ---------- misc ---------- */
const approxTokens = text => Math.max(1, Math.round(String(text).split(/\s+/).filter(Boolean).length * 1.33));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function mount(name, fn) {
  const host = document.querySelector(`[data-fig="${name}"]`);
  if (!host) return;
  try { fn(host); }
  catch (e) {
    console.error(`figure ${name} failed`, e);
    host.append(el('p', { class: 'fig-caption', text: `This figure failed to load (${e.message}).` }));
  }
}
const Figs = [];
function figure(name, fn) { Figs.push([name, fn]); }
