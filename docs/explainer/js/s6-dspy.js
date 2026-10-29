/* §6 — DSPy-style compilation: search over few-shot demo sets, scored on a dev set.
   The "LM" is a nearest-demo classifier so the whole optimisation runs in the browser;
   what transfers to real DSPy is the loop: program + metric + devset → optimizer picks demos. */
'use strict';

const INTENTS = { book: 'book', cancel: 'cancel', refill: 'refill', symptom: 'symptom', results: 'results' };
const INTENT_DATA = {
  book: ['Book an appointment with a cardiologist', 'Can I see Dr. Orlova next week?', 'I need a slot with the endocrinologist',
    'Schedule a checkup visit please', 'Is there a free slot on Friday?', 'Make an appointment for my son',
    'I want to see a dermatologist about a mole', 'Any available slot with a neurologist?', 'Can I get a GP visit tomorrow morning?',
    'Please book me in for a blood pressure review', "I'd like to schedule a visit with the therapist", 'When can I see a doctor this week?'],
  cancel: ['Please cancel my appointment on Tuesday', "I can't come tomorrow, cancel the visit", 'Cancel my booking with Dr. Kim',
    'Call off my Friday appointment', "I won't make it, please cancel", 'Cancel the dermatology appointment',
    "I can't come to the checkup I booked", "I won't be coming on Monday, cancel it", "Can you cancel my son's visit",
    'Call off the neurologist appointment', "Something came up and I can't come", "I won't make Thursday, please call it off"],
  refill: ["I'm running out of metformin pills", 'Can you renew my warfarin prescription?', 'Repeat prescription for my inhaler please',
    'My lisinopril tablets are almost finished', 'I need more blood pressure tablets', 'Send a new prescription for sertraline to the pharmacy',
    'Refill my atorvastatin please', "Only two insulin pens left, I'm running out", 'Could the doctor renew my prescription',
    'My monthly pills need renewing at the pharmacy', 'I ran out of my tablets yesterday', 'The pharmacy needs a new prescription for my pills'],
  symptom: ["I've had a headache for three days", 'My chest hurts when I climb stairs', 'There is an itchy rash on my arm since Monday',
    'I feel dizzy after standing up', 'My blood sugar feels very high this week', 'I keep coughing at night for days',
    'My ankles are swollen and hurt', "I've been feeling very tired and low", 'Sharp pain in my lower back',
    'I have a fever and my throat hurts', 'My stomach pain started two days ago', 'I feel short of breath since yesterday'],
  results: ['Are my blood test results ready?', 'What did my cholesterol test show?', 'Send me my lab report',
    'Did the x-ray results come back?', 'What was my HbA1c test result', 'I want to see my ECG report',
    'Have my urine test results come back?', 'Is my INR test result ready?', 'When will the biopsy results be ready',
    'Explain my kidney function test report', 'Did the lab send my results?', 'Are the scan results back yet?'],
};

function splitIntents(seed) {
  const r = mulberry32(seed), pool = [], dev = [], test = [];
  for (const [label, xs] of Object.entries(INTENT_DATA)) {
    const s = r.shuffle(xs).map(text => ({ text, label }));
    pool.push(...s.slice(0, 5)); dev.push(...s.slice(5, 9)); test.push(...s.slice(9));
  }
  return { pool, dev, test };
}

function makeProgram(index) {
  const descVec = Object.fromEntries(Object.entries(INTENTS).map(([k, d]) => [k, index.vec(d)]));
  const cache = new Map();
  const v = t => { if (!cache.has(t)) cache.set(t, index.vec(t)); return cache.get(t); };
  // each label is a prototype: its description plus the demos shown for it in the prompt
  return function predict(text, demos) {
    const q = v(text);
    let best = null, bestS = -Infinity;
    for (const label of Object.keys(INTENTS)) {
      const proto = Float64Array.from(descVec[label]);
      for (const d of demos) if (d.label === label) { const dv = v(d.text); for (let i = 0; i < proto.length; i++) proto[i] += dv[i]; }
      const s = dot(q, normalize(proto));
      if (s > bestS) { bestS = s; best = label; }
    }
    return bestS > 1e-9 ? best : '(no idea)'; // nothing in common with any label: a miss, not a lucky default
  };
}
const accuracy = (predict, demos, set) => set.filter(x => predict(x.text, demos) === x.label).length / set.length;

figure('dspy', host => {
  const all = Object.values(INTENT_DATA).flat().concat(Object.values(INTENTS));
  const index = new TfIdf(all);
  const predict = makeProgram(index);
  let seed = 11, split = splitIntents(seed), trials = [], running = false;

  const K = slider({ label: 'k demos in the prompt', min: 1, max: 20, value: 5, onInput: () => compile(false) });
  const N = slider({ label: 'candidate programs to try', min: 5, max: 80, step: 5, value: 40 });
  const compileBtn = button('Compile (random search)', () => compile(true), 'primary');
  const reseed = button('New data split', () => { seed++; split = splitIntents(seed); compile(false); });
  const chart = el('div'), bars = el('div'), promptBox = el('pre', { style: 'font-size:12px;max-height:260px' });
  const tryIn = el('input', { type: 'text', class: 'txt', value: 'my pills are nearly gone', style: 'width:100%', 'aria-label': 'Try a message' });
  const tryOut = el('div', { style: 'font-size:14px;margin-top:6px' });
  tryIn.addEventListener('input', drawTry);
  host.append(
    el('div', { class: 'fig-title', text: 'Live: compile a few-shot program on a dev set' }),
    el('div', { class: 'controls' }, K, N, el('div', { class: 'btn-row' }, compileBtn, reseed)),
    el('div', { class: 'cols-3-2' }, chart, bars),
    el('div', { class: 'cols', style: 'margin-top:12px' },
      el('div', {}, el('div', { class: 'kicker', text: 'Compiled prompt (best program)' }), promptBox),
      el('div', { class: 'panel' }, el('h4', { text: 'Try the compiled program' }), tryIn, tryOut)),
  );

  async function compile(animate = true) {
    if (running) return;
    running = true; compileBtn.disabled = true;
    const r = mulberry32(seed * 1000 + K.get());
    trials = [];
    for (let t = 0; t < N.get(); t++) {
      const demos = r.shuffle(split.pool).slice(0, K.get());
      trials.push({ demos, dev: accuracy(predict, demos, split.dev), test: accuracy(predict, demos, split.test) });
      if (animate) { draw(); await sleep(trials.length < 10 ? 120 : 30); }
    }
    running = false; compileBtn.disabled = false;
    draw();
  }
  const bestTrial = () => trials.reduce((a, b) => (b.dev > a.dev ? b : a), trials[0]);

  function draw() {
    const W = 470, H = 240, pl = 40, pb = 28, n = Math.max(N.get(), trials.length);
    const x = lin(0, n - 1, pl + 6, W - 10), y = lin(0, 1, H - pb, 24);
    const svg = svgRoot(W, H, 'Dev accuracy per candidate');
    axisLeft(svg, y, [0, 0.25, 0.5, 0.75, 1], pl, W - 10, v => pct(v));
    svg.append(sv('text', { x: 0, y: 8, class: 't-muted', text: 'dev accuracy per candidate · line = best so far' }));
    svg.append(sv('text', { x: W - 10, y: H - 6, 'text-anchor': 'end', class: 't-muted', text: 'candidate # →' }));
    const zs = accuracy(predict, [], split.dev);
    svg.append(sv('line', { x1: pl, x2: W - 10, y1: y(zs), y2: y(zs), style: 'stroke:var(--s2);stroke-dasharray:4 3' }));
    svg.append(sv('text', { x: W - 10, y: y(zs) - 4, 'text-anchor': 'end', style: 'fill:var(--ink-2)', text: `zero-shot ${pct(zs)}` }));
    let run = -1, d = '';
    trials.forEach((t, i) => {
      run = Math.max(run, t.dev);
      d += `${i ? 'L' : 'M'}${x(i)},${y(run)}`;
      const c = sv('circle', { cx: x(i), cy: y(t.dev), r: 4, style: 'fill:var(--axis);stroke:var(--surface);stroke-width:1.5' });
      Tip.bind(c, () => `candidate ${i + 1}<br>dev <b>${pct(t.dev)}</b> · test ${pct(t.test)}<br><span class="muted">${t.demos.map(d => esc(d.label)).join(', ')}</span>`);
      svg.append(c);
    });
    if (trials.length) svg.append(sv('path', { d, style: 'fill:none;stroke:var(--s1);stroke-width:2' }));
    chart.replaceChildren(svg);

    // test-set comparison
    const best = trials.length ? bestTrial() : null;
    const rows = [['zero-shot (no demos)', accuracy(predict, [], split.test), null],
      ['random demos (mean)', trials.length ? sum(trials.map(t => t.test)) / trials.length : null, null],
      ['compiled: best on dev', best ? best.test : null, best ? best.dev : null]];
    const W2 = 300, H2 = 240;
    const s2 = svgRoot(W2, H2, 'Test accuracy');
    s2.append(sv('text', { x: 0, y: 12, class: 't-muted', text: 'held-out TEST accuracy' }));
    const x2 = lin(0, 1, 0, W2 - 50);
    rows.forEach(([label, v, dev], i) => {
      const yy = 30 + i * 66;
      s2.append(sv('text', { x: 0, y: yy + 12, class: 't-ink', text: label }));
      s2.append(sv('rect', { x: 0, y: yy + 20, width: x2(1), height: 18, rx: 4, style: 'fill:var(--surface-2)' }));
      if (v != null) {
        s2.append(sv('rect', { x: 0, y: yy + 20, width: Math.max(2, x2(v)), height: 18, rx: 4, style: `fill:${i === 2 ? 'var(--s1)' : i === 0 ? 'var(--s2)' : 'var(--axis)'}` }));
        s2.append(sv('text', { x: x2(v) + 6, y: yy + 34, class: 't-mono t-ink', text: pct(v) }));
      }
      if (dev != null) {
        s2.append(sv('line', { x1: x2(dev), x2: x2(dev), y1: yy + 16, y2: yy + 42, style: 'stroke:var(--ink);stroke-width:2' }));
        s2.append(sv('text', { x: x2(dev), y: yy + 54, 'text-anchor': 'middle', class: 't-muted', style: 'font-size:10px', text: `dev ${pct(dev)}` }));
      }
    });
    bars.replaceChildren(s2);

    const demos = best ? best.demos : [];
    promptBox.textContent =
      `Signature: patient_message -> intent\nInstructions: classify the message as one of\n  ${Object.keys(INTENTS).join(' | ')}\n` +
      (demos.length ? '\n' + demos.map(d => `Message: ${d.text}\nIntent: ${d.label}\n`).join('\n') : '\n(no demos yet — press Compile)\n') +
      '\nMessage: {patient_message}\nIntent:';
    drawTry();
  }
  function drawTry() {
    const best = trials.length ? bestTrial() : null;
    const t = tryIn.value;
    const zs = predict(t, []), opt = best ? predict(t, best.demos) : null;
    tryOut.replaceChildren(
      el('div', {}, 'zero-shot → ', el('b', { text: zs })),
      el('div', {}, 'compiled → ', el('b', { text: opt || '(compile first)' })),
      el('div', { style: 'color:var(--muted);font-size:13px;margin-top:6px', text: 'Words outside the training vocabulary are invisible to this toy "LM". A real LM generalises far better — but the optimiser loop is identical.' }));
  }
  compile(false);
});
