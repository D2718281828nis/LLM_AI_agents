/* §4 — memory strategies under a context budget, and input guardrails (PII redaction). */
'use strict';

const CHAT = [
  ['U', "Hi, I'd like some help managing my medications.", null],
  ['A', "Of course. Could you tell me about any allergies first?", null],
  ['U', "Yes — I'm allergic to penicillin, I got a bad rash and swelling as a kid.", 'penicillin allergy'],
  ['A', "Thanks, I've noted a penicillin allergy. What do you take regularly?", null],
  ['U', "I take warfarin for atrial fibrillation, 5 mg each evening.", 'takes warfarin'],
  ['A', "Understood. Warfarin needs regular INR checks. When was your last one?", null],
  ['U', "Two weeks ago, my INR was 2.6 according to the clinic.", null],
  ['A', "That's within the usual 2–3 target range for atrial fibrillation.", null],
  ['U', "Also my blood pressure at the pharmacy yesterday was 148 over 92.", 'BP 148/92'],
  ['A', "That's above target. It's worth discussing with your GP; recheck at home for a week.", null],
  ['U', "Okay. I'm also trying to walk more, about 30 minutes most days now.", null],
  ['A', "Great — regular walking helps both blood pressure and heart health.", null],
  ['U', "My daughter says I should cut salt too. Is that true?", null],
  ['A', "Yes, reducing salt to under 5 g a day lowers blood pressure for most people.", null],
].map(([role, text, fact], i) => ({ i, role, text, fact, tok: approxTokens(text) + 4 }));

const FINAL_QS = [
  { q: 'I have a sore throat — can you prescribe amoxicillin?', need: 'penicillin allergy',
    good: 'No — amoxicillin is a penicillin and you reported a penicillin allergy. Ask your doctor about a non-penicillin option.',
    bad: 'Sure, amoxicillin is a common first choice for strep throat.' },
  { q: 'My back hurts. Is ibuprofen okay?', need: 'takes warfarin',
    good: 'Better avoid ibuprofen: with warfarin it markedly raises bleeding risk. Paracetamol is usually preferred — check with your pharmacist.',
    bad: 'Ibuprofen is generally fine for back pain at standard doses.' },
  { q: 'What was my blood pressure reading again?', need: 'BP 148/92',
    good: 'You said 148/92 at the pharmacy yesterday — above target.',
    bad: "I don't have a record of your blood pressure." },
];
const SYS_TOK = 40;

function applyMemory(strategy, limit, windowN) {
  const kept = new Set(); let summary = null, overflow = false;
  const budget = limit - SYS_TOK - 30; // 30 tokens reserved for the new question
  if (strategy === 'full') {
    CHAT.forEach(m => kept.add(m.i));
    overflow = sum(CHAT.map(m => m.tok)) > budget;
  } else if (strategy === 'window') {
    CHAT.slice(-windowN).forEach(m => kept.add(m.i));
    let used = sum(CHAT.filter(m => kept.has(m.i)).map(m => m.tok));
    for (const m of CHAT) if (used > budget && kept.has(m.i)) { kept.delete(m.i); used -= m.tok; }
  } else if (strategy === 'budget') {
    let used = 0;
    for (const m of [...CHAT].reverse()) { if (used + m.tok > budget) break; kept.add(m.i); used += m.tok; }
  } else if (strategy === 'summary') {
    const recent = CHAT.slice(-windowN);
    const old = CHAT.slice(0, CHAT.length - windowN);
    const facts = old.filter(m => m.fact).map(m => m.fact);
    if (old.length) summary = { facts, tok: 14 + 6 * facts.length, covers: old.length };
    let used = summary ? summary.tok : 0;
    for (const m of [...recent].reverse()) { if (used + m.tok > budget) break; kept.add(m.i); used += m.tok; }
  }
  const used = SYS_TOK + 30 + sum(CHAT.filter(m => kept.has(m.i)).map(m => m.tok)) + (summary ? summary.tok : 0);
  const facts = new Set([...CHAT.filter(m => kept.has(m.i) && m.fact).map(m => m.fact), ...(summary ? summary.facts : [])]);
  return { kept, summary, used, overflow, facts };
}

figure('memory', host => {
  const strategy = select({ label: 'memory strategy', value: 'budget', onChange: draw, options: [
    ['full', 'Full buffer (send everything)'], ['window', 'Sliding window (last N messages)'],
    ['budget', 'Token budget (drop oldest)'], ['summary', 'Summary + recent messages']] });
  const limit = slider({ label: 'context window (tokens)', min: 120, max: 400, step: 10, value: 220, onInput: draw });
  const win = slider({ label: 'N recent messages', min: 2, max: 14, value: 6, onInput: draw });
  let qi = 0;
  const qChips = chips(FINAL_QS.map(f => f.q), (_, i) => { qi = i; draw(); }, 0);
  const meter = el('div'), list = el('div', { class: 'msgs' }), answer = el('div', { class: 'panel' });
  host.append(
    el('div', { class: 'fig-title', text: 'Live: what does the model still remember at turn 15?' }),
    el('div', { class: 'controls' }, strategy, limit, win),
    el('div', { style: 'margin-bottom:6px;font-size:13px;color:var(--ink-2)', text: 'Final question from the patient:' }),
    el('div', { style: 'margin-bottom:12px' }, qChips),
    meter,
    el('div', { class: 'cols-3-2' }, list, answer),
  );

  function draw() {
    const s = strategy.get(), L = limit.get(), N = win.get();
    win.style.display = s === 'window' || s === 'summary' ? '' : 'none';
    const r = applyMemory(s, L, N);

    // budget meter
    const W = fitWidth(meter, 1040), H = 40;
    const x = lin(0, Math.max(L, r.used) * 1.05, 0, W);
    const svg = svgRoot(W, H, 'Context usage');
    svg.append(sv('rect', { x: 0, y: 8, width: W, height: 14, rx: 4, style: 'fill:var(--surface-2)' }));
    const segs = [['system', SYS_TOK, 'var(--axis)'], ['summary', r.summary ? r.summary.tok : 0, 'var(--s7)'],
      ['history', r.used - SYS_TOK - 30 - (r.summary ? r.summary.tok : 0), 'var(--s1)'], ['question', 30, 'var(--s3)']];
    let x0 = 0;
    for (const [name, t, c] of segs) {
      if (!t) continue;
      const rect = sv('rect', { x: x(x0) + 1, y: 8, width: Math.max(1, x(t) - 2), height: 14, rx: 3, style: `fill:${c}` });
      Tip.bind(rect, () => `${name}: <b>${t}</b> tokens`);
      svg.append(rect);
      x0 += t;
    }
    svg.append(sv('line', { x1: x(L), x2: x(L), y1: 2, y2: 28, style: `stroke:${r.overflow ? 'var(--crit)' : 'var(--ink)'};stroke-width:2` }));
    svg.append(sv('text', { x: Math.min(x(L), W - 4), y: 38, 'text-anchor': 'end', class: 't-ink', text: `limit ${L}` }));
    svg.append(sv('text', { x: 0, y: 38, class: 't-muted', text: `${r.used} tokens sent` }));
    meter.replaceChildren(legend([['var(--axis)', 'system prompt'], ['var(--s7)', 'summary'], ['var(--s1)', 'kept history'], ['var(--s3)', 'new question']]), svg);

    // message list
    const maxTok = Math.max(...CHAT.map(m => m.tok));
    list.replaceChildren();
    if (r.summary) list.append(el('div', { class: 'msg summary' },
      el('span', { class: 'role', text: 'Σ' }),
      el('span', { class: 'txt-line', text: `Summary of ${r.summary.covers} msgs: ` + (r.summary.facts.join('; ') || 'small talk') }),
      el('span', {}, el('div', { class: 'bar', style: `width:${100 * r.summary.tok / maxTok}%` }))));
    for (const m of CHAT) {
      const keep = r.kept.has(m.i);
      const row = el('div', { class: 'msg' + (keep ? '' : ' dropped') },
        el('span', { class: 'role', text: m.role === 'U' ? 'You' : 'AI' }),
        el('span', { class: 'txt-line' }, m.fact ? el('span', { class: 'star', text: '★ ' }) : null, m.text),
        el('span', {}, el('div', { class: 'bar', style: `width:${100 * m.tok / maxTok}%` })));
      Tip.bind(row, () => `${esc(m.text)}<br><span class="muted">${m.tok} tokens · ${keep ? 'in context' : 'dropped'}${m.fact ? ' · key fact: ' + esc(m.fact) : ''}</span>`);
      list.append(row);
    }

    // answer
    const f = FINAL_QS[qi];
    answer.replaceChildren(el('h4', { text: 'Agent reply' }), el('p', { style: 'margin:0 0 8px;font-weight:600', text: '“' + f.q + '”' }));
    if (r.overflow) {
      answer.append(el('div', {}, el('span', { class: 'badge crit', text: '✗ request rejected' })),
        el('p', { style: 'margin-top:8px', text: `The full history (${r.used} tokens) exceeds the ${L}-token window. The API refuses the call — "send everything" doesn't scale.` }));
      return;
    }
    const ok = r.facts.has(f.need);
    answer.append(
      el('div', {}, el('span', { class: 'badge ' + (ok ? 'good' : 'crit'), text: ok ? '✓ remembers: ' + f.need : '✗ forgot: ' + f.need })),
      el('p', { style: 'margin-top:8px', text: ok ? f.good : f.bad }),
      el('p', { style: 'font-size:13px;color:var(--muted);margin:0', text: ok ? 'The fact is still in the prompt.' :
        'The fact was in the conversation but is no longer in the prompt. The model has no other memory — it answers confidently anyway.' }));
  }
  onResize(draw);
  draw();
});

/* ---------- guardrails ---------- */
function luhn(digits) {
  let s = 0;
  [...digits].reverse().forEach((c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; });
  return s % 10 === 0;
}
function snilsValid(digits) {
  const n = digits.slice(0, 9), c = +digits.slice(9);
  let s = 0;
  for (let i = 0; i < 9; i++) s += +n[i] * (9 - i);
  let chk = s < 100 ? s : s <= 101 ? 0 : s % 101;
  if (chk === 100) chk = 0;
  return chk === c;
}
const PII_RULES = [
  { type: 'email', label: 'Email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { type: 'snils', label: 'SNILS (checksum)', re: /\b\d{3}-\d{3}-\d{3}[ -]\d{2}\b/g, check: m => snilsValid(m.replace(/\D/g, '')) },
  { type: 'card', label: 'Card number (Luhn)', re: /\b(?:\d[ -]?){13,19}\b/g, check: m => luhn(m.replace(/\D/g, '')) },
  { type: 'phone', label: 'Phone', re: /(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g },
  { type: 'date', label: 'Date (e.g. birth date)', re: /\b\d{1,2}[./-]\d{1,2}[./-](?:19|20)\d{2}\b/g },
];
const RED_FLAGS = ['chest pain', "can't breathe", 'cannot breathe', 'suicid', 'overdose', 'unconscious', 'stroke', 'severe bleeding'];

function findPII(text) {
  const spans = [];
  for (const r of PII_RULES) {
    for (const m of text.matchAll(r.re)) {
      const s = m.index, e = s + m[0].length;
      if (spans.some(x => s < x.e && e > x.s)) continue; // earlier rules win overlaps
      const valid = r.check ? r.check(m[0]) : true;
      spans.push({ s, e, type: r.type, text: m[0], valid });
    }
  }
  return spans.sort((a, b) => a.s - b.s);
}

figure('guard', host => {
  const DEFAULT = "Hi, I'm Anna Petrova, born 12.03.1985. My SNILS is 112-233-445 95 and my phone is +7 916 123-45-67, " +
    'email anna.p@example.com. Card for the copay: 4111 1111 1111 1111. Since this morning I have chest pain, what should I take?';
  const ta = el('textarea', { class: 'txt', 'aria-label': 'Patient message' }, DEFAULT);
  ta.addEventListener('input', draw);
  const hl = el('div', { class: 'redact-view panel' }), red = el('div', { class: 'redact-view panel' }), rules = el('div', { class: 'rules' }), route = el('div');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: an input guardrail (edit the message)' }),
    ta,
    el('div', { class: 'cols', style: 'margin-top:12px' },
      el('div', {}, el('div', { class: 'kicker', text: 'Detected' }), hl),
      el('div', {}, el('div', { class: 'kicker', text: 'What the LLM and the logs receive' }), red)),
    el('div', { class: 'cols', style: 'margin-top:12px' }, el('div', { class: 'panel' }, el('h4', { text: 'Rules' }), rules), route),
  );

  function draw() {
    const t = ta.value, spans = findPII(t).filter(s => s.valid);
    const invalid = findPII(t).filter(s => !s.valid);
    let a = '', b = '', p = 0;
    for (const s of spans) {
      a += esc(t.slice(p, s.s)) + `<span class="pii ${s.type}" title="${s.type}">${esc(s.text)}</span>`;
      b += esc(t.slice(p, s.s)) + `<span class="redacted">[${s.type.toUpperCase()}]</span>`;
      p = s.e;
    }
    a += esc(t.slice(p)); b += esc(t.slice(p));
    hl.innerHTML = a; red.innerHTML = b;

    rules.replaceChildren(...PII_RULES.map(r => {
      const n = spans.filter(s => s.type === r.type).length;
      const bad = invalid.filter(s => s.type === r.type).length;
      return el('div', { class: 'rule' }, el('span', { text: r.label }),
        el('span', {}, bad ? el('span', { class: 'badge muted', text: `${bad} failed checksum`, style: 'margin-right:4px' }) : null,
          el('span', { class: 'badge ' + (n ? 'warn' : 'muted'), text: n ? `${n} redacted` : 'none' })));
    }), el('div', { class: 'rule' }, el('span', { text: 'Person names' }), el('span', { class: 'badge crit', text: 'not detectable by regex' })));

    const flag = RED_FLAGS.find(f => t.toLowerCase().includes(f));
    route.replaceChildren(el('div', { class: 'panel' }, el('h4', { text: 'Routing decision' }),
      flag ? el('div', {}, el('span', { class: 'badge crit', text: '⚠ escalate' }),
        el('p', { style: 'margin:8px 0 0', text: `Red-flag phrase "${flag}" detected. Skip the LLM: show emergency guidance (call 112 / 911) and alert a clinician.` }))
        : el('div', {}, el('span', { class: 'badge good', text: '✓ forward to LLM' }),
          el('p', { style: 'margin:8px 0 0', text: 'No red flags. The redacted text is sent to the model.' }))));
  }
  draw();
});
