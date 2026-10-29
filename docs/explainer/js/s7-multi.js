/* §7 — multi-agent critic loop, LLM-as-judge vs human labels, and rubric weighting. */
'use strict';

const CRITERIA = ['accuracy', 'safety', 'completeness', 'clarity'];
const CRIT_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s7)'];

/* Simulated dynamics (stated on the page): the critic flags every criterion under the bar,
   the reviser addresses them all (the weakest most), and edits sometimes knock another criterion down. */
function criticRun({ seed, threshold, maxRounds, strength }) {
  const r = mulberry32(seed);
  let q = CRITERIA.map(() => 0.35 + 0.4 * r());
  const hist = [{ q: q.slice(), flagged: [], fixed: null, tokens: 450 }];
  for (let round = 1; round <= maxRounds; round++) {
    const flagged = CRITERIA.map((_, i) => i).filter(i => q[i] < threshold);
    if (!flagged.length) break;
    const w = flagged.reduce((a, b) => (q[b] < q[a] ? b : a));
    q = q.slice();
    for (const i of flagged) q[i] = clamp(q[i] + strength * (1 - q[i]) * (i === w ? 1 : 0.5) + 0.03 * r.normal(), 0, 1);
    if (r() < 0.3) { const o = (w + 1 + Math.floor(r() * 3)) % 4; q[o] = clamp(q[o] - 0.04 - 0.05 * r(), 0, 1); }
    hist.push({ q: q.slice(), flagged, fixed: w, tokens: 180 + 450 });
  }
  return hist;
}

figure('critic', host => {
  let seed = 5;
  const thr = slider({ label: 'critic threshold', min: 0.5, max: 0.95, step: 0.05, value: 0.8, format: v => v.toFixed(2), onInput: draw });
  const maxR = slider({ label: 'max revision rounds', min: 0, max: 10, value: 6, onInput: draw });
  const str = slider({ label: 'reviser strength', min: 0.1, max: 0.8, step: 0.05, value: 0.45, format: v => v.toFixed(2), onInput: draw });
  const archBox = el('div', { style: 'overflow-x:auto' }), lineBox = el('div'), log = el('div', { class: 'trace scroll', style: 'max-height:240px' });
  const sR = stat('rounds used'), sMin = stat('weakest criterion'), sTok = stat('tokens spent'), sOut = stat('outcome');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: a critic loop (simulated quality dynamics)' }),
    el('div', { class: 'controls' }, thr, maxR, str, button('New draft', () => { seed++; draw(); })),
    archBox,
    legend(CRITERIA.map((c, i) => [CRIT_COLORS[i], c])),
    el('div', { class: 'cols-3-2' }, lineBox, log),
    el('div', { class: 'stats' }, sR, sMin, sTok, sOut),
  );

  function drawArch(accepted) {
    const W = 900, H = 96;
    const svg = svgRoot(W, H, 'Coordinator, specialists, critic');
    const box = (x, y, w, label, col, on) => {
      svg.append(sv('rect', { x, y, width: w, height: 30, rx: 8, style: `fill:${on ? col : 'var(--surface-2)'};stroke:${col};stroke-width:1.5` }));
      svg.append(sv('text', { x: x + w / 2, y: y + 19, 'text-anchor': 'middle', style: `font-weight:600;fill:${on ? '#fff' : 'var(--ink)'}`, text: label }));
    };
    const arrow = (x1, y1, x2, y2) => svg.append(sv('line', { x1, y1, x2, y2, class: 'axis', style: 'stroke-width:1.5', 'marker-end': 'url(#crit-arr)' }));
    svg.append(sv('defs', {}, sv('marker', { id: 'crit-arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' },
      sv('path', { d: 'M0,0 L10,5 L0,10 z', style: 'fill:var(--axis)' }))));
    box(0, 33, 80, 'Patient', 'var(--axis)', false);
    box(120, 33, 120, 'Coordinator', 'var(--s1)', true);
    ['Pharmacist', 'Scheduler', 'Triage'].forEach((n, i) => { box(290, 2 + i * 32, 110, n, 'var(--s3)', false); arrow(240, 48, 290, 17 + i * 32); arrow(400, 17 + i * 32, 450, 48); });
    box(450, 33, 90, 'Draft', 'var(--s7)', false);
    box(600, 33, 90, 'Critic', 'var(--s2)', true);
    box(780, 33, 110, accepted ? 'Answer ✓' : 'Answer', 'var(--s1)', accepted);
    arrow(80, 48, 120, 48); arrow(540, 48, 600, 48); arrow(690, 48, 780, 48);
    svg.append(sv('path', { d: 'M645,63 C645,92 495,92 495,63', style: 'fill:none;stroke:var(--s2);stroke-width:1.5;stroke-dasharray:4 3', 'marker-end': 'url(#crit-arr)' }));
    svg.append(sv('text', { x: 570, y: 92, 'text-anchor': 'middle', class: 't-muted', style: 'font-size:11px', text: 'revise' }));
    svg.style.minWidth = '720px';
    archBox.replaceChildren(svg);
  }

  function draw() {
    const T = thr.get(), hist = criticRun({ seed, threshold: T, maxRounds: maxR.get(), strength: str.get() });
    const last = hist[hist.length - 1].q, accepted = last.every(v => v >= T);
    drawArch(accepted);

    const W = 520, H = 260, pl = 40, pr = 96, pb = 28;
    const n = Math.max(maxR.get(), 1);
    const x = lin(0, n, pl + 4, W - pr), y = lin(0.2, 1, H - pb, 10);
    const svg = svgRoot(W, H, 'Criterion scores per round');
    axisLeft(svg, y, [0.2, 0.4, 0.6, 0.8, 1], pl, W - pr, v => v.toFixed(1));
    axisBottom(svg, x, range(n + 1), H - pb);
    svg.append(sv('line', { x1: pl, x2: W - pr, y1: y(T), y2: y(T), style: 'stroke:var(--ink);stroke-dasharray:5 4' }));
    svg.append(sv('text', { x: pl + 4, y: y(T) - 5, class: 't-ink', style: 'font-size:11px', text: `accept bar ${T.toFixed(2)}` }));
    svg.append(sv('text', { x: W - pr, y: H - 2, 'text-anchor': 'end', class: 't-muted', text: 'round →' }));
    const ends = [];
    CRITERIA.forEach((c, k) => {
      svg.append(sv('path', { d: hist.map((h, i) => `${i ? 'L' : 'M'}${x(i)},${y(h.q[k])}`).join(''), style: `fill:none;stroke:${CRIT_COLORS[k]};stroke-width:2` }));
      hist.forEach((h, i) => {
        const dot = sv('circle', { cx: x(i), cy: y(h.q[k]), r: h.fixed === k ? 5 : 3, style: `fill:${CRIT_COLORS[k]};stroke:var(--surface);stroke-width:1.5` });
        Tip.bind(dot, () => `round ${i} · <b>${c}</b> ${h.q[k].toFixed(2)}${h.fixed === k ? '<br><span class="muted">main focus this round</span>' : ''}`);
        svg.append(dot);
      });
      ends.push([k, y(last[k])]);
    });
    ends.sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < ends.length; i++) if (ends[i][1] - ends[i - 1][1] < 13) ends[i][1] = ends[i - 1][1] + 13;
    ends.forEach(([k, yy]) => svg.append(sv('text', { x: x(hist.length - 1) + 8, y: yy + 4, class: 't-ink', style: 'font-size:11px', text: CRITERIA[k] })));
    lineBox.replaceChildren(svg);

    log.replaceChildren(...hist.map((h, i) => i === 0
      ? el('div', { class: 'row think' }, el('div', { class: 'who', text: 'DRAFT' }), el('div', { text: 'Specialists answer; coordinator merges a first draft.' }))
      : el('div', { class: 'row act' }, el('div', { class: 'who', text: `ROUND ${i}` }),
        el('div', { text: `Critic flags ${h.flagged.map(f => CRITERIA[f]).join(', ')}. Reviser addresses them, focusing on ${CRITERIA[h.fixed]}.` }))),
    el('div', { class: 'row ' + (accepted ? 'ans' : 'stop') }, el('div', { class: 'who', text: accepted ? 'ACCEPT' : 'CAP' }),
      el('div', { text: accepted ? 'All criteria clear the bar.' : 'Round cap reached — ship with a warning or escalate to a human.' })));

    const tokens = sum(hist.map(h => h.tokens));
    sR.set(`${hist.length - 1}`);
    sMin.set(`${Math.min(...last).toFixed(2)} <small>${CRITERIA[last.indexOf(Math.min(...last))]}</small>`);
    sTok.set(`${tokens} <small>${(tokens / 450).toFixed(1)}× a single draft</small>`);
    sOut.set(accepted ? '<span style="color:var(--good-ink)">✓ accepted</span>' : '<span style="color:var(--s2)">⚠ capped</span>');
  }
  draw();
});

/* ---------- LLM-as-judge vs human labels ---------- */
function judgeData(bias) {
  const r = mulberry32(21), items = [];
  for (let i = 0; i < 80; i++) {
    const pass = r() < 0.55, long = r() < 0.4;
    let s = (pass ? 7.0 : 4.6) + (pass ? 1.4 : 1.7) * r.normal();
    if (bias && long) s += 1.8;
    items.push({ i, pass, long, score: clamp(Math.round(s * 2) / 2, 0, 10), jitter: r() });
  }
  return items;
}
function kappa(tp, fp, fn, tn) {
  const n = tp + fp + fn + tn, po = (tp + tn) / n;
  const pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (n * n);
  return (po - pe) / (1 - pe || 1);
}

figure('judge', host => {
  const thr = slider({ label: 'judge pass threshold (score ≥)', min: 1, max: 10, step: 0.5, value: 6, format: v => v.toFixed(1), onInput: draw });
  const bias = toggle({ label: 'judge has verbosity bias (+1.8 for long answers)', onChange: draw });
  const strip = el('div'), cm = el('div');
  const sAcc = stat('agreement'), sK = stat("Cohen's κ"), sP = stat('precision'), sR = stat('recall');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: calibrate an LLM judge against 80 human labels' }),
    el('div', { class: 'controls' }, thr, bias),
    legend([['var(--s1)', 'human: pass'], ['var(--s2)', 'human: fail'], ['transparent;box-shadow:inset 0 0 0 2px var(--ink-2)', 'hollow = judge disagrees'], ['var(--ink)', 'ring = long answer']]),
    el('div', { class: 'cols-3-2' }, strip, cm),
    el('div', { class: 'stats' }, sAcc, sK, sP, sR),
  );

  function draw() {
    const data = judgeData(bias.get()), T = thr.get();
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const d of data) {
      const j = d.score >= T;
      if (j && d.pass) tp++; else if (j) fp++; else if (d.pass) fn++; else tn++;
    }
    const W = fitWidth(strip, 600, 320), H = 220, pl = 80, pb = 28;
    const x = lin(0, 10, pl, W - 10);
    const svg = svgRoot(W, H, 'Judge score by human label');
    axisBottom(svg, x, range(11), H - pb);
    svg.append(sv('text', { x: W - 10, y: H - 2, 'text-anchor': 'end', class: 't-muted', text: 'judge score →' }));
    [['human pass', true, 50], ['human fail', false, 135]].forEach(([lab, p, cy]) => {
      svg.append(sv('text', { x: pl - 10, y: cy + 4, 'text-anchor': 'end', class: 't-ink', text: lab }));
      data.filter(d => d.pass === p).forEach(d => {
        const agree = (d.score >= T) === d.pass, col = p ? 'var(--s1)' : 'var(--s2)';
        const c = sv('circle', { cx: x(d.score) + (d.jitter - 0.5) * 14, cy: cy + (d.jitter * 2 - 1) * 28 * ((d.i % 3) / 2 + 0.3), r: 5,
          style: `fill:${agree ? col : 'var(--surface)'};stroke:${d.long ? 'var(--ink)' : col};stroke-width:${d.long ? 2 : 1.5}` });
        Tip.bind(c, () => `answer #${d.i + 1}<br>human: <b>${d.pass ? 'pass' : 'fail'}</b> · judge: <b>${d.score}</b><br><span class="muted">${d.long ? 'long, verbose answer' : 'concise answer'}</span>`);
        svg.append(c);
      });
    });
    svg.append(sv('rect', { x: x(T), y: 6, width: x(10) - x(T), height: H - pb - 10, style: 'fill:var(--s1-wash)' }));
    svg.append(sv('line', { x1: x(T), x2: x(T), y1: 6, y2: H - pb, style: 'stroke:var(--ink);stroke-width:2' }));
    svg.append(sv('text', { x: x(T) + 4, y: 16, class: 't-ink', style: 'font-size:11px', text: 'judge says pass →' }));
    strip.replaceChildren(svg);

    const n = data.length, max = Math.max(tp, fp, fn, tn);
    const cell = (v, good) => el('div', { class: 'c', style: `background:${good ? 'var(--s1-wash)' : 'var(--s2-wash)'};opacity:${0.45 + 0.55 * v / max}`, text: v });
    cm.replaceChildren(el('div', { class: 'panel' }, el('h4', { text: 'Confusion matrix' }),
      el('div', { class: 'cm' },
        el('div', { class: 'h' }), el('div', { class: 'h', text: 'human pass' }), el('div', { class: 'h', text: 'human fail' }),
        el('div', { class: 'h', text: 'judge pass' }), cell(tp, true), cell(fp, false),
        el('div', { class: 'h', text: 'judge fail' }), cell(fn, false), cell(tn, true)),
      el('p', { style: 'font-size:13px;color:var(--muted);margin:8px 0 0', text: 'κ corrects raw agreement for chance: 0 = coin-flip judge, 1 = perfect. Aim for κ ≥ 0.6 before trusting a judge.' })));
    sAcc.set(pct((tp + tn) / n));
    const k = kappa(tp, fp, fn, tn);
    sK.set(`${k.toFixed(2)} <small>${k >= 0.8 ? 'strong' : k >= 0.6 ? 'substantial' : k >= 0.4 ? 'moderate' : 'weak'}</small>`);
    sP.set(tp + fp ? pct(tp / (tp + fp)) : '—');
    sR.set(tp + fn ? pct(tp / (tp + fn)) : '—');
  }
  onResize(draw);
  draw();
});

/* ---------- rubric weights decide the "best" architecture ---------- */
const ARCHS = [
  ['Single agent', [0.62, 0.55, 0.50, 0.95]],
  ['ReAct (TAO) agent', [0.74, 0.66, 0.68, 0.75]],
  ['Multi-agent', [0.80, 0.72, 0.82, 0.55]],
  ['Multi-agent + critic', [0.86, 0.90, 0.85, 0.35]],
];
const RUBRIC = ['accuracy', 'safety', 'completeness', 'cost & latency'];

figure('rubric', host => {
  const sl = RUBRIC.map((c, i) => slider({ label: `weight: ${c}`, min: 0, max: 5, value: [3, 3, 2, 1][i], onInput: draw }));
  const presets = chips([
    { label: 'Clinical safety first', w: [3, 5, 2, 0] },
    { label: 'Cheap chatbot', w: [1, 1, 1, 5] },
    { label: 'Balanced', w: [2, 2, 2, 2] },
  ], it => { it.w.forEach((v, i) => sl[i].set(v)); draw(); });
  const box = el('div'), tbl = el('div');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: the "best" agent depends on what you weigh' }),
    el('div', { style: 'margin-bottom:10px' }, presets),
    el('div', { class: 'controls' }, ...sl),
    el('div', { class: 'cols-3-2' }, box, tbl),
  );
  function draw() {
    const w = sl.map(s => s.get()), wsum = sum(w) || 1;
    const scores = ARCHS.map(([, s]) => sum(s.map((v, i) => v * w[i])) / wsum);
    const best = scores.indexOf(Math.max(...scores));
    const W = fitWidth(box, 600), rowH = 44, pl = 150, H = ARCHS.length * rowH + 10;
    const x = lin(0, 1, pl, W - 60);
    const svg = svgRoot(W, H, 'Weighted score per architecture');
    ARCHS.forEach(([name], i) => {
      const yy = 6 + i * rowH;
      svg.append(sv('text', { x: pl - 10, y: yy + 22, 'text-anchor': 'end', class: 't-ink', style: i === best ? 'font-weight:700' : '', text: name }));
      svg.append(sv('rect', { x: pl, y: yy + 8, width: x(1) - pl, height: 22, rx: 4, style: 'fill:var(--surface-2)' }));
      const bar = sv('rect', { x: pl, y: yy + 8, width: Math.max(2, x(scores[i]) - pl), height: 22, rx: 4, style: `fill:${i === best ? 'var(--s1)' : 'var(--axis)'}` });
      Tip.bind(bar, () => `<b>${esc(name)}</b><br>` + RUBRIC.map((c, k) => `${c}: ${ARCHS[i][1][k].toFixed(2)} × w${w[k]}`).join('<br>'));
      svg.append(bar);
      svg.append(sv('text', { x: x(scores[i]) + 6, y: yy + 24, class: 't-mono t-ink', text: scores[i].toFixed(3) + (i === best ? '  ★' : '') }));
    });
    box.replaceChildren(svg);
    tbl.replaceChildren(el('div', { style: 'overflow-x:auto' }, el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, el('th', { text: 'agent' }), RUBRIC.map(c => el('th', { text: c.split(' ')[0] })))),
      el('tbody', {}, ARCHS.map(([n, s]) => el('tr', {}, el('td', { text: n }), s.map(v => el('td', { class: 'num', text: v.toFixed(2) }))))))));
  }
  onResize(draw);
  draw();
});
