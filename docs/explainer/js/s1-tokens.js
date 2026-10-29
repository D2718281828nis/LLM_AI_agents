/* §1 — next-token sampling (temperature, top-k, top-p) and weight quantization */
'use strict';

const PROMPTS = [
  {
    text: 'A patient with newly diagnosed type 2 diabetes is usually started on',
    toks: [['metformin', 4.3, 1], ['lifestyle', 2.9, 1], ['diet', 2.4, 1], ['insulin', 2.0, 1], ['an', 1.6, 1],
      ['sitagliptin', 1.0, 1], ['empagliflozin', 0.8, 1], ['aspirin', 0.1, 0], ['antibiotics', -0.6, 0],
      ['warfarin', -1.1, 0], ['chemotherapy', -1.8, 0], ['homeopathy', -2.4, 0]],
  },
  {
    text: 'The normal adult body temperature is about',
    toks: [['37', 5.0, 1], ['36.6', 3.6, 1], ['98.6', 3.4, 1], ['36', 1.6, 1], ['37.5', 0.9, 1],
      ['38', 0.4, 0], ['35', -0.3, 0], ['39', -0.9, 0], ['40', -1.5, 0], ['42', -2.2, 0], ['25', -2.8, 0]],
  },
  {
    text: "Warfarin's most important side effect is",
    toks: [['bleeding', 5.1, 1], ['bruising', 3.0, 1], ['haemorrhage', 2.6, 1], ['nausea', 0.9, 1],
      ['headache', 0.4, 0], ['hair', -0.1, 1], ['hypoglycaemia', -0.8, 0], ['cough', -1.2, 0],
      ['insomnia', -1.6, 0], ['weight', -2.0, 0]],
  },
];

function softmaxT(logits, T) {
  const m = Math.max(...logits);
  const e = logits.map(z => Math.exp((z - m) / T));
  const s = sum(e);
  return e.map(x => x / s);
}
/* returns the filtered + renormalised distribution and the kept mask */
function filterDist(p, k, topP) {
  const order = range(p.length).sort((a, b) => p[b] - p[a]);
  const keep = new Array(p.length).fill(false);
  let cum = 0;
  order.forEach((i, rank) => {
    if (rank < k && (cum < topP || rank === 0)) { keep[i] = true; cum += p[i]; }
  });
  const z = sum(p.filter((_, i) => keep[i]));
  return { q: p.map((x, i) => keep[i] ? x / z : 0), keep };
}
const entropyBits = q => -sum(q.filter(x => x > 0).map(x => x * Math.log2(x)));

figure('sampling', host => {
  const rnd = mulberry32(42);
  let P = PROMPTS[0], samples = [];

  const T = slider({ label: 'temperature T', min: 0.05, max: 2.5, step: 0.05, value: 1, format: v => v.toFixed(2), onInput: draw });
  const K = slider({ label: 'top-k', min: 1, max: 12, step: 1, value: 12, onInput: draw });
  const TP = slider({ label: 'top-p (nucleus)', min: 0.05, max: 1, step: 0.01, value: 1, format: v => v.toFixed(2), onInput: draw });
  const promptChips = chips(PROMPTS.map(p => ({ label: p.text.split(' ').slice(0, 4).join(' ') + '…', p })), it => {
    P = it.p; samples = []; draw();
  }, 0);

  const promptLine = el('div', { class: 'panel', style: 'margin-bottom:10px;font-size:15px' });
  const svgBox = el('div');
  const sEnt = stat('entropy'), sKept = stat('tokens kept'), sWrong = stat('P(clinically wrong)');
  const gridBox = el('div', { style: 'margin-top:10px' });
  const btns = el('div', { class: 'btn-row', style: 'margin-top:10px' },
    button('Sample 1 token', () => sample(1), 'primary'),
    button('Sample 100', () => sample(100)),
    button('Clear', () => { samples = []; draw(); }));

  host.append(
    el('div', { class: 'fig-title', text: 'Live: shape the next-token distribution' }),
    el('div', { style: 'margin-bottom:10px' }, promptChips),
    el('div', { class: 'controls' }, T, K, TP),
    promptLine,
    legend([['var(--s1)', 'clinically plausible'], ['var(--s2)', 'clinically wrong'], ['var(--grid)', 'removed by top-k / top-p (ghost = before filtering)']]),
    svgBox,
    el('div', { class: 'stats' }, sEnt, sKept, sWrong),
    btns, gridBox,
  );

  function dist() {
    const p = softmaxT(P.toks.map(t => t[1]), T.get());
    return { p, ...filterDist(p, K.get(), TP.get()) };
  }
  function sample(n) {
    const { q } = dist();
    for (let s = 0; s < n; s++) {
      let r = rnd(), i = 0;
      while (i < q.length - 1 && (r -= q[i]) > 0) i++;
      samples.push(i);
    }
    samples = samples.slice(-200);
    draw();
  }

  function draw() {
    const { p, q, keep } = dist();
    const last = samples.length ? P.toks[samples[samples.length - 1]] : null;
    promptLine.innerHTML = `<span style="color:var(--ink-2)">${esc(P.text)}</span> ` +
      (last ? `<b style="color:${last[2] ? 'var(--s1)' : 'var(--s2)'}">${esc(last[0])}</b>` : '<span style="color:var(--muted)">▁</span>');

    const W = fitWidth(svgBox, 720), rowH = 24, padL = 120, padR = 70, H = P.toks.length * rowH + 28;
    const x = lin(0, Math.max(...p, ...q), padL, W - padR);
    const svg = svgRoot(W, H, 'Next-token probabilities');
    const g = sv('g');
    svg.append(g);
    P.toks.forEach(([tok, z, ok], i) => {
      const y = 6 + i * rowH;
      const color = ok ? 'var(--s1)' : 'var(--s2)';
      g.append(sv('text', { x: padL - 10, y: y + 14, 'text-anchor': 'end', class: keep[i] ? 't-ink' : 't-muted', text: tok + (ok ? '' : ' ✗') }));
      g.append(sv('rect', { x: padL, y: y + 3, width: Math.max(1, x(p[i]) - padL), height: rowH - 8, rx: 3, style: 'fill:var(--grid)' }));
      if (keep[i]) g.append(sv('rect', { x: padL, y: y + 3, width: Math.max(2, x(q[i]) - padL), height: rowH - 8, rx: 3, style: `fill:${color}` }));
      g.append(sv('text', { x: Math.max(x(q[i]), x(p[i])) + 6, y: y + 14, class: 't-mono', text: keep[i] ? pct(q[i], 1) : 'cut' }));
      const hit = sv('rect', { class: 'hit', x: 0, y, width: W, height: rowH });
      Tip.bind(hit, () => `<b>${esc(tok)}</b> <span class="muted">logit ${z.toFixed(1)}</span><br>` +
        `softmax at T=${T.get().toFixed(2)}: ${pct(p[i], 2)}<br>after top-k/top-p: ${keep[i] ? pct(q[i], 2) : 'removed'}<br>` +
        `<span class="muted">${ok ? 'plausible continuation' : 'factually wrong in this context'}</span>`);
      g.append(hit);
    });
    svg.append(sv('line', { class: 'axis', x1: padL, x2: padL, y1: 4, y2: H - 20 }));
    svg.append(sv('text', { x: padL, y: H - 4, class: 't-muted', text: 'probability →' }));
    svgBox.replaceChildren(svg);

    const H2 = entropyBits(q);
    sEnt.set(`${H2.toFixed(2)} <small>bits ≈ ${Math.pow(2, H2).toFixed(1)} choices</small>`);
    sKept.set(`${keep.filter(Boolean).length} <small>of ${keep.length}</small>`);
    const wrong = sum(q.filter((_, i) => !P.toks[i][2]));
    sWrong.set(`${pct(wrong, 1)}`);

    gridBox.replaceChildren();
    if (samples.length) {
      const nWrong = samples.filter(i => !P.toks[i][2]).length;
      const cells = el('div', { style: 'display:flex;flex-wrap:wrap;gap:2px;margin-top:6px' },
        samples.map(i => Tip.bind(el('span', {
          style: `width:12px;height:12px;border-radius:2px;background:${P.toks[i][2] ? 'var(--s1)' : 'var(--s2)'}`,
        }), () => esc(P.toks[i][0]))));
      gridBox.append(el('div', { style: 'font-size:13px;color:var(--ink-2)' },
        `Last ${samples.length} samples — ${nWrong} wrong (${pct(nWrong / samples.length, 1)}). Hover a square to see the token.`), cells);
    }
  }
  onResize(draw);
  draw();
});

/* ---------- quantization ---------- */
function makeWeights(n, seed) {
  const r = mulberry32(seed);
  return Float64Array.from({ length: n }, () => (r() < 0.02 ? 0.09 : 0.02) * r.normal());
}
function quantize(w, bits, block) {
  const out = new Float64Array(w.length), levels = Math.pow(2, bits - 1) - 1, scales = [];
  for (let s = 0; s < w.length; s += block) {
    let amax = 0;
    for (let i = s; i < Math.min(s + block, w.length); i++) amax = Math.max(amax, Math.abs(w[i]));
    const scale = amax / levels || 1;
    scales.push(scale);
    for (let i = s; i < Math.min(s + block, w.length); i++) out[i] = Math.round(w[i] / scale) * scale;
  }
  return { out, scales, levels };
}
function snrDb(w, q) {
  let sig = 0, err = 0;
  for (let i = 0; i < w.length; i++) { sig += w[i] * w[i]; err += (w[i] - q[i]) ** 2; }
  return { snr: 10 * Math.log10(sig / (err || 1e-30)), rmse: Math.sqrt(err / w.length) };
}

figure('quant', host => {
  const w = makeWeights(8192, 3);
  const BLOCKS = [[32, '32 (llama.cpp Q4_0 style)'], [256, '256'], [8192, 'whole tensor']];
  const bits = slider({ label: 'bits per weight', min: 2, max: 8, value: 4, onInput: draw });
  const block = select({ label: 'block size (one fp16 scale each)', options: BLOCKS.map(([v, t]) => [String(v), t]), value: '32', onChange: draw });
  const left = el('div'), right = el('div');
  const sSnr = stat('signal-to-noise'), sBpw = stat('effective bits/weight'), sSize = stat('7B model size');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: round real-looking weights to fewer bits' }),
    el('div', { class: 'controls' }, bits, block),
    el('div', { class: 'cols-3-2' }, left, right),
    el('div', { class: 'stats' }, sSnr, sBpw, sSize),
  );

  function draw() {
    const b = bits.get(), B = +block.get();
    const { out, scales, levels } = quantize(w, b, B);
    // left: 64 weights, original dots vs quantized ticks, with the per-block level grid
    const N = 64, W = 460, H = 240, pl = 44, pr = 10, pt = 10, pb = 26;
    const ymax = Math.max(...Array.from(w.slice(0, N)).map(Math.abs)) * 1.1;
    const x = lin(0, N - 1, pl + 6, W - pr - 6), y = lin(-ymax, ymax, H - pb, pt);
    const svg = svgRoot(W, H, 'Original vs quantized weights');
    axisLeft(svg, y, niceTicks(-ymax, ymax, 4), pl, W - pr, v => v.toFixed(2));
    for (let s = 0; s < N; s += Math.min(B, N)) {
      const sc = scales[Math.floor(s / B)], x0 = x(s) - 3, x1 = x(Math.min(s + B, N) - 1) + 3;
      const step = Math.max(1, Math.ceil(levels / 12));
      for (let l = -levels; l <= levels; l += step) {
        const yy = y(l * sc);
        if (yy > pt && yy < H - pb) svg.append(sv('line', { x1: x0, x2: x1, y1: yy, y2: yy, style: 'stroke:var(--s7);stroke-opacity:.25' }));
      }
      if (B < N) svg.append(sv('line', { x1: x1 + 1, x2: x1 + 1, y1: pt, y2: H - pb, class: 'axis', 'stroke-dasharray': '3 3' }));
    }
    for (let i = 0; i < N; i++) {
      svg.append(sv('line', { x1: x(i), x2: x(i), y1: y(w[i]), y2: y(out[i]), style: 'stroke:var(--s2);stroke-width:1.5' }));
      svg.append(sv('circle', { cx: x(i), cy: y(w[i]), r: 3, style: 'fill:var(--s1)' }));
      svg.append(sv('rect', { x: x(i) - 3.5, y: y(out[i]) - 1, width: 7, height: 2, style: 'fill:var(--ink)' }));
      const hit = sv('rect', { class: 'hit', x: x(i) - 4, y: pt, width: 8, height: H - pt - pb });
      Tip.bind(hit, () => `weight #${i}<br>original <b>${w[i].toFixed(5)}</b><br>quantized <b>${out[i].toFixed(5)}</b><br>` +
        `<span class="muted">int ${Math.round(out[i] / scales[Math.floor(i / B)])} × scale ${scales[Math.floor(i / B)].toExponential(2)}</span>`);
      svg.append(hit);
    }
    svg.append(sv('text', { x: pl, y: H - 4, class: 't-muted', text: 'first 64 weights →  (dot = fp16, bar = quantized, orange = rounding error)' }));
    left.replaceChildren(svg);

    // right: SNR vs bits for each block size
    const W2 = 300, H2 = 250, pl2 = 36, pb2 = 36;
    const curves = BLOCKS.map(([bs]) => range(7).map(i => snrDb(w, quantize(w, i + 2, bs).out).snr));
    const ymx = Math.max(...curves.flat()) + 4;
    const x2 = lin(2, 8, pl2 + 4, W2 - 70), y2 = lin(0, ymx, H2 - pb2, 10);
    const s2 = svgRoot(W2, H2, 'SNR vs bits');
    axisLeft(s2, y2, niceTicks(0, ymx, 4), pl2, W2 - 70, v => v + '');
    axisBottom(s2, x2, [2, 3, 4, 5, 6, 7, 8], H2 - pb2);
    const cols = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
    curves.forEach((c, k) => {
      s2.append(sv('path', { d: c.map((v, i) => `${i ? 'L' : 'M'}${x2(i + 2)},${y2(v)}`).join(''), style: `fill:none;stroke:${cols[k]};stroke-width:2` }));
      s2.append(sv('text', { x: x2(8) + 6, y: y2(c[6]) + 4 + (k === 2 ? 8 : k === 1 ? 0 : -6), text: ['block 32', 'block 256', 'tensor'][k] }));
      c.forEach((v, i) => {
        const on = +B === BLOCKS[k][0] && i + 2 === b;
        const dot = sv('circle', { cx: x2(i + 2), cy: y2(v), r: on ? 6 : 3, style: `fill:${cols[k]};stroke:var(--surface);stroke-width:2` });
        Tip.bind(dot, () => `${BLOCKS[k][1]}, ${i + 2} bits<br>SNR <b>${v.toFixed(1)} dB</b>`);
        s2.append(dot);
      });
    });
    s2.append(sv('text', { x: 2, y: 8, class: 't-muted', text: 'SNR, dB' }));
    s2.append(sv('text', { x: W2 - 70, y: H2 - 2, 'text-anchor': 'end', class: 't-muted', text: 'bits →' }));
    right.replaceChildren(s2);

    const { snr, rmse } = snrDb(w, out);
    const bpw = b + 16 / B;
    sSnr.set(`${snr.toFixed(1)} <small>dB · RMSE ${rmse.toExponential(1)}</small>`);
    sBpw.set(`${bpw.toFixed(2)} <small>(${b} + 16/${B} for scales)</small>`);
    sSize.set(`${(7e9 * bpw / 8 / 1e9).toFixed(1)} GB <small>vs 14 GB fp16</small>`);
  }
  draw();
});
