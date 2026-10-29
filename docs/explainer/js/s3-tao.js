/* §3 — a Think → Act → Observe agent that really calls the tools from data.js.
   The "reasoning" is a small planner, so every step is inspectable and reproducible. */
'use strict';

const TAO_TASKS = [
  {
    goal: 'A patient on warfarin has a headache. Which is safer: ibuprofen or paracetamol?',
    plan: [['check_interaction', { drug_a: 'warfarin', drug_b: 'ibuprofen' }, 'how ibuprofen interacts with warfarin'],
      ['check_interaction', { drug_a: 'warfarin', drug_b: 'paracetamol' }, 'how paracetamol interacts with warfarin']],
    answer: obs => {
      const [a, b] = obs;
      return `Paracetamol is the safer choice (${b.severity} interaction) — ibuprofen has a ${a.severity} interaction: ${a.detail} Use the lowest effective paracetamol dose and keep INR monitoring.`;
    },
  },
  {
    goal: 'Patient is 95 kg and 180 cm with type 2 diabetes. What is the BMI, and is metformin a reasonable first drug?',
    plan: [['calculate_bmi', { weight_kg: 95, height_cm: 180 }, 'the BMI'],
      ['get_drug_info', { drug: 'metformin' }, 'whether metformin is first-line']],
    answer: obs => `BMI is ${obs[0].bmi} (${obs[0].category}). Metformin is the ${obs[1].used_for}; check kidney function first (${obs[1].safety}).`,
  },
  {
    goal: 'Book the earliest endocrinologist appointment, then tell me if atorvastatin is OK with clarithromycin.',
    plan: [['find_appointment', { specialty: 'endocrinologist' }, 'free endocrinologist slots'],
      ['check_interaction', { drug_a: 'atorvastatin', drug_b: 'clarithromycin' }, 'the statin–macrolide interaction']],
    answer: obs => {
      const s = obs[0].slots[0];
      return `Earliest endocrinologist: ${cap(s.day)} ${s.time} with ${s.doctor}. Atorvastatin + clarithromycin is a ${obs[1].severity} interaction — ${obs[1].detail}`;
    },
  },
];

function* taoAgent(task, { maxIter, failFirst }) {
  const obs = [];
  let pending = 0, failed = false, iter = 0, calls = 0;
  while (iter < maxIter) {
    iter++;
    if (pending >= task.plan.length) {
      yield { kind: 'think', iter, text: 'I have every observation the plan needs, so I can answer.' };
      yield { kind: 'ans', iter, text: task.answer(obs) };
      return;
    }
    const [tool, args, why] = task.plan[pending];
    yield { kind: 'think', iter, text: failed ? `The last call failed. I'll retry ${tool} once before giving up.` : `I still need ${why}. Best tool: ${tool}.` };
    yield { kind: 'act', iter, text: `${tool}(${JSON.stringify(args)})`, tool };
    calls++;
    if (failFirst && calls === 1) {
      failed = true;
      yield { kind: 'err', iter, text: '{"error":"upstream timeout after 5s"}' };
      continue;
    }
    failed = false;
    const res = TOOL[tool].run(args);
    obs.push(res);
    pending++;
    yield { kind: 'obs', iter, text: JSON.stringify(res) };
  }
  yield { kind: 'stop', iter, text: `Iteration limit (${maxIter}) reached before the goal was met. A real agent should report partial results here instead of looping forever.` };
}

figure('tao', host => {
  let task = TAO_TASKS[0], gen = null, events = [], timer = null;
  const maxIter = slider({ label: 'max iterations', min: 1, max: 6, value: 4, onInput: reset });
  const fail = toggle({ label: 'first tool call fails (timeout)', onChange: reset });
  const taskChips = chips(TAO_TASKS.map((t, i) => ({ label: ['Warfarin + headache', 'BMI + metformin', 'Booking + statin'][i], t })), it => { task = it.t; reset(); }, 0);
  const goal = el('div', { class: 'panel', style: 'margin-bottom:10px' });
  const loopBox = el('div'), costBox = el('div'), trace = el('div', { class: 'trace scroll' });
  const stepBtn = button('Step', step, 'primary');
  const runBtn = button('▶ Run', () => {
    if (timer) { clearInterval(timer); timer = null; runBtn.textContent = '▶ Run'; return; }
    runBtn.textContent = '■ Pause';
    timer = setInterval(() => { if (!step()) { clearInterval(timer); timer = null; runBtn.textContent = '▶ Run'; } }, 750);
  });
  host.append(
    el('div', { class: 'fig-title', text: 'Live: step an agent through its loop' }),
    el('div', { style: 'margin-bottom:10px' }, taskChips),
    goal,
    el('div', { class: 'controls' }, maxIter, fail, el('div', { class: 'btn-row' }, stepBtn, runBtn, button('Reset', reset))),
    el('div', { class: 'cols-3-2' }, trace, el('div', {}, loopBox, costBox)),
  );

  function reset() {
    if (timer) { clearInterval(timer); timer = null; runBtn.textContent = '▶ Run'; }
    gen = taoAgent(task, { maxIter: maxIter.get(), failFirst: fail.get() });
    events = [];
    goal.innerHTML = `<b>Goal:</b> ${esc(task.goal)}`;
    trace.replaceChildren(el('div', { style: 'color:var(--muted);font-size:14px', text: 'Press Step or Run. Each iteration is one LLM call: think, pick an action, read the observation.' }));
    stepBtn.disabled = false;
    drawLoop(null); drawCost();
  }
  function step() {
    if (!gen) return false;
    const { value, done } = gen.next();
    if (done || !value) { stepBtn.disabled = true; return false; }
    if (!events.length) trace.replaceChildren();
    events.push(value);
    const label = { think: 'THINK', act: 'ACT', obs: 'OBSERVE', err: 'ERROR', ans: 'ANSWER', stop: 'STOPPED' }[value.kind];
    trace.append(el('div', { class: 'row ' + value.kind },
      el('div', { class: 'who', text: `${label} ${value.iter}` }),
      value.kind === 'act' || value.kind === 'obs' || value.kind === 'err' ? el('code', { text: value.text }) : el('div', { text: value.text })));
    trace.scrollTop = trace.scrollHeight;
    drawLoop(value); drawCost();
    if (value.kind === 'ans' || value.kind === 'stop') { stepBtn.disabled = true; return false; }
    return true;
  }

  function drawLoop(ev) {
    const W = 300, H = 210, cx = 150, cy = 100, R = 66;
    const nodes = [['think', 'Think', -90, 'var(--s7)'], ['act', 'Act', 30, 'var(--s1)'], ['obs', 'Observe', 150, 'var(--s3)']];
    const active = ev ? (ev.kind === 'err' ? 'obs' : ev.kind) : null;
    const svg = svgRoot(W, H, 'Think-Act-Observe loop');
    const pos = a => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)];
    nodes.forEach(([, , a], i) => {
      const [x1, y1] = pos(a + 22), [x2, y2] = pos(nodes[(i + 1) % 3][2] - 22);
      svg.append(sv('path', { d: `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`, style: 'fill:none;stroke:var(--axis);stroke-width:1.5', 'marker-end': 'url(#tao-arr)' }));
    });
    svg.append(sv('defs', {}, sv('marker', { id: 'tao-arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
      sv('path', { d: 'M0,0 L10,5 L0,10 z', style: 'fill:var(--axis)' }))));
    nodes.forEach(([k, label, a, col]) => {
      const [x, y] = pos(a), on = active === k;
      svg.append(sv('circle', { cx: x, cy: y, r: on ? 33 : 30, style: `fill:${on ? col : 'var(--surface-2)'};stroke:${col};stroke-width:2;transition:r .2s` }));
      svg.append(sv('text', { x, y: y + 4, 'text-anchor': 'middle', style: `font-weight:650;font-size:12px;fill:${on ? '#fff' : 'var(--ink)'}`, text: label }));
    });
    const it = ev ? ev.iter : 0;
    svg.append(sv('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 't-ink', style: 'font-size:22px;font-weight:700', text: it }));
    svg.append(sv('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 't-muted', style: 'font-size:10px', text: `of ${maxIter.get()} iterations` }));
    const fin = ev && (ev.kind === 'ans' || ev.kind === 'stop');
    svg.append(sv('rect', { x: 210, y: 175, width: 84, height: 28, rx: 8, style: `fill:${fin ? (ev.kind === 'ans' ? 'var(--s1)' : 'var(--s2)') : 'var(--surface-2)'};stroke:var(--border)` }));
    svg.append(sv('text', { x: 252, y: 193, 'text-anchor': 'middle', style: `font-weight:650;font-size:12px;fill:${fin ? '#fff' : 'var(--muted)'}`, text: fin && ev.kind === 'stop' ? 'Stopped' : 'Answer' }));
    loopBox.replaceChildren(svg);
  }

  /* context grows every iteration, and every LLM call re-reads all of it */
  function drawCost() {
    const SYS = 220;
    const perIter = [];
    let ctx = SYS + approxTokens(task.goal);
    for (const e of events) {
      if (e.kind === 'think') perIter.push(ctx);
      ctx += approxTokens(e.text) + 6;
    }
    const W = 300, H = 150, pl = 40, pb = 22;
    const ymax = Math.max(800, ...perIter) * 1.1;
    const n = Math.max(maxIter.get(), perIter.length);
    const x = lin(0, n, pl, W - 8), y = lin(0, ymax, H - pb, 18);
    const svg = svgRoot(W, H, 'Prompt tokens per LLM call');
    axisLeft(svg, y, niceTicks(0, ymax, 3), pl, W - 8, v => v >= 1000 ? (v / 1000) + 'k' : v);
    perIter.forEach((v, i) => {
      const bw = (x(1) - x(0)) - 4;
      const r = sv('rect', { x: x(i) + 2, y: y(v), width: bw, height: y(0) - y(v), rx: 3, style: 'fill:var(--s1)' });
      Tip.bind(r, () => `LLM call ${i + 1}<br>prompt ≈ <b>${v}</b> tokens`);
      svg.append(r);
      svg.append(sv('text', { x: x(i) + 2 + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 't-muted', text: i + 1 }));
    });
    svg.append(sv('text', { x: 0, y: 10, class: 't-muted', text: `prompt tokens per call — total processed ≈ ${sum(perIter)}` }));
    costBox.replaceChildren(svg);
  }
  reset();
});
