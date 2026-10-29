/* §5 — retrieval over a small clinical-guideline corpus: TF-IDF embeddings, cosine search,
   query decomposition, and HyDE (search with a hypothetical answer). */
'use strict';

const CORPUS = [
  ['Metformin first-line', 'Metformin is recommended as first-line pharmacological therapy for type 2 diabetes mellitus alongside lifestyle modification. Titrate slowly to limit gastrointestinal adverse effects.'],
  ['SGLT2 inhibitors', 'SGLT2 inhibitors such as empagliflozin lower glucose and reduce cardiovascular and renal events in type 2 diabetes with established cardiovascular disease.'],
  ['HbA1c targets', 'Glycaemic control: an HbA1c target of about 7% (53 mmol/mol) suits most adults with diabetes; individualise for frailty and hypoglycaemia risk.'],
  ['Insulin & hypoglycaemia', 'Insulin therapy carries a risk of hypoglycaemia; educate patients to recognise symptoms and carry fast-acting glucose.'],
  ['Warfarin + NSAIDs', 'Concomitant NSAID use such as ibuprofen in patients on warfarin anticoagulation markedly increases gastrointestinal bleeding risk and should be avoided.'],
  ['Analgesia on anticoagulants', 'Paracetamol is the preferred analgesic for patients receiving anticoagulants; regular high doses may raise the INR, so monitor.'],
  ['INR monitoring', 'Warfarin dosing is guided by the international normalised ratio (INR), targeting 2.0–3.0 for atrial fibrillation.'],
  ['ACE-inhibitor cough', 'ACE inhibitors such as lisinopril commonly cause a persistent dry cough; switching to an angiotensin receptor blocker is recommended.'],
  ['Hypertension lifestyle', 'First-line management of hypertension includes salt reduction, weight loss, regular aerobic exercise and limiting alcohol.'],
  ['Antihypertensive drugs', 'ACE inhibitors, angiotensin receptor blockers, calcium channel blockers or thiazide diuretics are first-line agents for elevated blood pressure.'],
  ['SSRIs for depression', 'Selective serotonin reuptake inhibitors such as sertraline are first-line pharmacotherapy for moderate to severe depressive disorder.'],
  ['Serotonin syndrome', 'Combining SSRIs with tramadol or triptans can precipitate serotonin syndrome: agitation, tremor, hyperthermia.'],
  ['Penicillin allergy', 'In patients with documented penicillin allergy avoid amoxicillin; macrolides or other non-beta-lactam antibiotics are alternatives.'],
  ['Strep pharyngitis', 'Streptococcal pharyngitis is treated with penicillin V or amoxicillin for 10 days; antibiotics are not indicated for viral sore throat.'],
  ['Statin interactions', 'Statin-associated myopathy risk increases with CYP3A4 inhibitors such as clarithromycin; suspend atorvastatin or simvastatin during the course.'],
  ['Metformin in CKD', 'Reduce metformin dose when eGFR falls below 45 mL/min and discontinue below 30 because of lactic acidosis risk.'],
  ['Migraine', 'Acute migraine attacks respond to triptans or NSAIDs; frequent attacks warrant prophylaxis such as propranolol or topiramate.'],
  ['Asthma control', 'Inhaled corticosteroids are the cornerstone of persistent asthma control; short-acting beta agonists relieve acute bronchospasm.'],
].map(([title, text], id) => ({ id, title, text }));

const RAG_QUERIES = [
  { q: 'what pills help with high sugar', rel: [0, 1] },
  { q: 'blood thinner and painkiller together', rel: [4, 5] },
  { q: 'feeling sad all the time, what medication', rel: [10] },
  { q: 'my pressure pill makes me cough', rel: [7] },
  { q: 'sore throat antibiotic but allergic to penicillin', rel: [12, 13] },
  { q: 'is a painkiller ok with my blood thinner, and what sugar level should I aim for', rel: [4, 5, 2] },
];

/* Stand-in for the LLM that writes the hypothetical passage: each lay concept (English or Russian)
   maps to sentences a model would plausibly write. Several paraphrases per concept play the role of
   sampling the LLM at temperature > 0. In lesson 13 a real LLM generates this text. */
const HYDE_CONCEPTS = [
  [/sugar|glucose|сахар|глюкоз/, ['Elevated blood glucose in type 2 diabetes mellitus is managed with metformin, and glycaemic control is tracked with HbA1c.',
    'Type 2 diabetes is treated first with metformin; SGLT2 inhibitors such as empagliflozin lower glucose further.',
    'Hyperglycaemia in type 2 diabetes responds to metformin and lifestyle modification.']],
  [/pill|tablet|medication|medicine|drug|таблет|лекарств|препарат/, ['First-line pharmacological therapy is recommended.',
    'Oral pharmacotherapy is the first-line option.']],
  [/thinner|anticoag|разжиж|антикоагул/, ['Patients on anticoagulation with warfarin need INR monitoring.',
    'Warfarin anticoagulation increases bleeding risk.']],
  [/painkiller|pain|analges|обезбол|боль/, ['For analgesia, paracetamol is preferred over NSAIDs such as ibuprofen because of bleeding risk.',
    'NSAIDs like ibuprofen should be avoided with anticoagulants; paracetamol is the preferred analgesic.']],
  [/pressure|hypertens|давлен/, ['Hypertension is treated with antihypertensive agents such as ACE inhibitors.',
    'Elevated blood pressure is managed with ACE inhibitors or calcium channel blockers.']],
  [/cough|кашл/, ['A persistent dry cough is a known adverse effect of ACE inhibitors.', 'ACE inhibitors such as lisinopril can cause a dry cough.']],
  [/sad|down|depress|low mood|грус|депресс|тоск/, ['Depressive disorder is treated first-line with SSRIs such as sertraline.',
    'Selective serotonin reuptake inhibitors are first-line pharmacotherapy for depression.']],
  [/throat|горл/, ['Streptococcal pharyngitis is treated with antibiotics.', 'Sore throat from streptococcal pharyngitis is treated with amoxicillin.']],
  [/allerg|аллерг/, ['With penicillin allergy, avoid amoxicillin and use alternatives such as macrolides.', 'A penicillin allergy rules out amoxicillin.']],
  [/headache|migraine|голов|мигрен/, ['Migraine attacks respond to triptans.', 'Acute migraine is treated with triptans or NSAIDs.']],
  [/breath|wheez|asthma|дыш|астм/, ['Asthma control relies on inhaled corticosteroids.', 'Inhaled corticosteroids control persistent asthma.']],
  [/kidney|renal|почк/, ['Renal function (eGFR) guides metformin dosing.', 'Reduce the metformin dose when eGFR falls.']],
  [/cholesterol|statin|холестер/, ['Statins lower LDL cholesterol; watch for interactions causing myopathy.', 'Statin therapy lowers LDL cholesterol.']],
  [/level|target|aim|уровен|цел/, ['Targets should be individualised.', 'Treatment targets are set individually.']],
];
/* Confident, fluent, off-topic sentences: what a hypothesis looks like when the LLM misreads the question */
const HYDE_DISTRACTORS = [
  'Statin myopathy risk rises with clarithromycin.', 'Inhaled corticosteroids are the cornerstone of asthma control.',
  'Triptans relieve acute migraine attacks.', 'Streptococcal pharyngitis is treated with penicillin V.',
  'Hypertension management includes salt reduction and aerobic exercise.', 'Insulin therapy carries a risk of hypoglycaemia.',
  'Thiazide diuretics are first-line antihypertensive agents.', 'Serotonin syndrome can follow combining SSRIs with tramadol.',
];
function hydeDoc(query) {
  const q = query.toLowerCase();
  const parts = HYDE_CONCEPTS.filter(([re]) => re.test(q)).map(([, v]) => v[0]);
  return parts.length ? parts.join(' ') : query;
}
/* One sampled hypothesis. With probability `halluc` the "LLM" misreads the question and writes about
   something else; otherwise it paraphrases the right concepts, occasionally adding one stray sentence. */
function sampleHypothesis(query, rnd, halluc) {
  const q = query.toLowerCase();
  const concepts = HYDE_CONCEPTS.filter(([re]) => re.test(q));
  if (!concepts.length) return { text: query, wrong: [] };
  if (rnd() < halluc) {
    const wrong = rnd.shuffle(HYDE_DISTRACTORS).slice(0, 2);
    return { text: wrong.join(' '), wrong, misread: true };
  }
  const parts = concepts.map(([, v]) => rnd.pick(v)), wrong = [];
  if (rnd() < halluc / 2) { const w = rnd.pick(HYDE_DISTRACTORS); parts.push(w); wrong.push(w); }
  return { text: parts.join(' '), wrong };
}
function decompose(query) {
  return query.split(/\s*(?:,\s*and\s+|\band\b|[?;,])\s*/i).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);
}

figure('rag', host => {
  const index = new TfIdf(CORPUS.map(d => d.title + ' ' + d.text));
  const docVecs = CORPUS.map(d => index.vec(d.title + ' ' + d.text));
  const P = pca2(docVecs.map(v => Array.from(v)));
  const docXY = docVecs.map(v => P.project(v));

  let qi = 0;
  const input = el('input', { type: 'text', class: 'txt', value: RAG_QUERIES[0].q, style: 'width:100%', 'aria-label': 'Query' });
  input.addEventListener('input', () => { qi = -1; qChips.clear(); draw(); });
  const qChips = chips(RAG_QUERIES.map(r => r.q), (r, i) => { qi = i; input.value = r; draw(); }, 0);
  const topK = slider({ label: 'top-k retrieved', min: 1, max: 6, value: 3, onInput: draw });
  const alpha = slider({ label: 'HyDE weight α', min: 0, max: 1, step: 0.05, value: 0.6, format: v => v.toFixed(2), onInput: draw });
  const decomp = toggle({ label: 'decompose multi-part questions', onChange: draw });
  const mapBox = el('div'), simBox = el('div'), listQ = el('div', { class: 'rank' }), listH = el('div', { class: 'rank' });
  const hydeBox = el('div', { class: 'panel hyde-doc' }), subBox = el('div', { style: 'font-size:13px;color:var(--ink-2);margin:6px 0' });
  const sQ = stat('recall@k — plain query'), sH = stat('recall@k — HyDE'), sM = stat('MRR plain → HyDE');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: retrieve from 18 guideline snippets' }),
    el('label', { class: 'ctl wide', style: 'margin-bottom:8px' }, el('span', { class: 'lab', text: 'Patient question (lay language)' }), input),
    el('div', { style: 'margin-bottom:10px' }, qChips),
    el('div', { class: 'controls' }, topK, alpha, decomp),
    subBox,
    el('div', { class: 'kicker', text: 'Hypothetical document written for this question' }), hydeBox,
    legend([['var(--s1)', 'plain query & its top-k'], ['var(--s2)', 'HyDE vector & its top-k'], ['var(--axis)', 'other documents'], ['transparent;box-shadow:inset 0 0 0 2px var(--good-ink)', 'labelled relevant']]),
    el('div', { class: 'cols' }, mapBox, simBox),
    el('div', { class: 'cols', style: 'margin-top:10px' },
      el('div', { class: 'panel' }, el('h4', { text: 'Ranking — plain query' }), listQ),
      el('div', { class: 'panel' }, el('h4', { text: 'Ranking — HyDE' }), listH)),
    el('div', { class: 'stats' }, sQ, sH, sM),
  );

  function scoreAll(texts, useHyde) {
    // a doc's score is its best match over sub-queries
    const best = new Array(CORPUS.length).fill(-1);
    let lastVec = null;
    for (const t of texts) {
      const qv = index.vec(t);
      const v = useHyde ? mix(qv, index.vec(hydeDoc(t)), alpha.get()) : qv;
      lastVec = v;
      docVecs.forEach((d, i) => { best[i] = Math.max(best[i], dot(v, d)); });
    }
    return { scores: best, vec: lastVec };
  }

  function draw() {
    const q = input.value.trim() || ' ';
    const rel = qi >= 0 ? RAG_QUERIES[qi].rel : null;
    const subs = decomp.get() ? decompose(q) : [q];
    const texts = subs.length ? subs : [q];
    subBox.textContent = decomp.get() ? `Sub-queries: ${texts.map(t => '“' + t + '”').join('  ·  ')}` : '';

    const hText = texts.map(hydeDoc).join(' ');
    const known = new Set(index.known(hText));
    hydeBox.innerHTML = hText.split(/(\s+)/).map(w => {
      const t = tokenize(w)[0];
      return t && known.has(t) && !tokenize(q).includes(t) ? `<mark>${esc(w)}</mark>` : esc(w);
    }).join('') + '<div style="font-size:12px;color:var(--muted);margin-top:4px">Highlighted: index vocabulary the patient never typed.</div>';

    const A = scoreAll(texts, false), B = scoreAll(texts, true);
    const k = topK.get();
    const rank = s => range(CORPUS.length).sort((a, b) => s[b] - s[a]);
    const rA = rank(A.scores), rB = rank(B.scores);
    // a zero-similarity document shares no term with the query: never count it as retrieved
    const topA = new Set(rA.slice(0, k).filter(i => A.scores[i] > 1e-9));
    const topB = new Set(rB.slice(0, k).filter(i => B.scores[i] > 1e-9));
    const isRel = i => rel ? rel.includes(i) : null;

    // --- map (PCA) ---
    const W = 440, H = 320, pad = 24;
    const pts = [...docXY, P.project(A.vec), P.project(B.vec)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = lin(Math.min(...xs), Math.max(...xs), pad, W - pad), y = lin(Math.min(...ys), Math.max(...ys), H - pad, pad + 10);
    const svg = svgRoot(W, H, 'Embedding map');
    svg.append(sv('text', { x: 0, y: 12, class: 't-muted', text: `PCA of TF-IDF vectors (${pct(P.explained[0] + P.explained[1])} of variance shown)` }));
    const [qx, qy] = P.project(A.vec), [hx, hy] = P.project(B.vec);
    for (const i of topA) svg.append(sv('line', { x1: x(qx), y1: y(qy), x2: x(docXY[i][0]), y2: y(docXY[i][1]), style: 'stroke:var(--s1);stroke-width:1.5;stroke-opacity:.7' }));
    for (const i of topB) svg.append(sv('line', { x1: x(hx), y1: y(hy), x2: x(docXY[i][0]), y2: y(docXY[i][1]), style: 'stroke:var(--s2);stroke-width:1.5;stroke-dasharray:4 3;stroke-opacity:.8' }));
    CORPUS.forEach((d, i) => {
      const [px, py] = docXY[i];
      const fill = topA.has(i) && topB.has(i) ? 'var(--s7)' : topA.has(i) ? 'var(--s1)' : topB.has(i) ? 'var(--s2)' : 'var(--axis)';
      const c = sv('circle', { cx: x(px), cy: y(py), r: 7, style: `fill:${fill};stroke:${isRel(i) ? 'var(--good-ink)' : 'var(--surface)'};stroke-width:${isRel(i) ? 2.5 : 2}` });
      Tip.bind(c, () => docTip(i, A.scores[i], B.scores[i]));
      svg.append(c);
      if (topA.has(i) || topB.has(i) || isRel(i)) svg.append(sv('text', { x: x(px) + 9, y: y(py) + 4, style: 'font-size:10px', class: 't-ink', text: d.title }));
    });
    const diamond = (cx, cy, col, label) => {
      svg.append(sv('path', { d: `M${cx},${cy - 8} l8,8 l-8,8 l-8,-8 z`, style: `fill:${col};stroke:var(--surface);stroke-width:2` }));
      svg.append(sv('text', { x: cx, y: cy - 12, 'text-anchor': 'middle', class: 't-ink', style: 'font-size:11px;font-weight:700', text: label }));
    };
    diamond(x(qx), y(qy), 'var(--s1)', 'query');
    diamond(x(hx), y(hy), 'var(--s2)', 'HyDE');
    mapBox.replaceChildren(svg);

    // --- similarity vs similarity ---
    const W2 = 440, H2 = 320, pl = 40, pb = 34;
    const mx = Math.max(0.3, ...A.scores, ...B.scores) * 1.08;
    const x2 = lin(0, mx, pl, W2 - 10), y2 = lin(0, mx, H2 - pb, 16);
    const s2 = svgRoot(W2, H2, 'Similarity to query vs to HyDE');
    axisLeft(s2, y2, niceTicks(0, mx, 4), pl, W2 - 10, v => v.toFixed(1));
    axisBottom(s2, x2, niceTicks(0, mx, 4), H2 - pb, v => v.toFixed(1));
    s2.append(sv('line', { x1: x2(0), y1: y2(0), x2: x2(mx), y2: y2(mx), class: 'axis', 'stroke-dasharray': '4 4' }));
    const thA = Math.max(1e-9, A.scores[rA[k - 1]]), thB = Math.max(1e-9, B.scores[rB[k - 1]]);
    s2.append(sv('line', { x1: x2(thA), x2: x2(thA), y1: y2(0), y2: y2(mx), style: 'stroke:var(--s1);stroke-dasharray:2 3' }));
    s2.append(sv('line', { x1: x2(0), x2: x2(mx), y1: y2(thB), y2: y2(thB), style: 'stroke:var(--s2);stroke-dasharray:2 3' }));
    s2.append(sv('text', { x: x2(mx) - 4, y: y2(mx) + 14, 'text-anchor': 'end', class: 't-muted', text: 'above the diagonal: HyDE likes it more' }));
    s2.append(sv('text', { x: 0, y: 10, class: 't-muted', text: 'cosine to HyDE vector ↑' }));
    s2.append(sv('text', { x: W2 - 10, y: H2 - 4, 'text-anchor': 'end', class: 't-muted', text: 'cosine to plain query →' }));
    CORPUS.forEach((d, i) => {
      const fill = topA.has(i) && topB.has(i) ? 'var(--s7)' : topA.has(i) ? 'var(--s1)' : topB.has(i) ? 'var(--s2)' : 'var(--axis)';
      const c = sv('circle', { cx: x2(A.scores[i]), cy: y2(B.scores[i]), r: 7, style: `fill:${fill};stroke:${isRel(i) ? 'var(--good-ink)' : 'var(--surface)'};stroke-width:${isRel(i) ? 2.5 : 2}` });
      Tip.bind(c, () => docTip(i, A.scores[i], B.scores[i]));
      s2.append(c);
    });
    simBox.replaceChildren(s2);

    const fillList = (box, order, scores, top) => {
      box.replaceChildren(...order.slice(0, 6).map((i, r) => {
        const row = el('div', { class: 'rank-row' + (top.has(i) ? '' : ' cut') },
          el('span', { class: 'rel ' + (isRel(i) ? 'yes' : 'no'), text: rel ? (isRel(i) ? '✓' : '·') : r + 1 }),
          el('span', { class: 't', text: CORPUS[i].title }),
          el('span', { class: 's', text: scores[i].toFixed(3) }));
        Tip.bind(row, () => docTip(i, A.scores[i], B.scores[i]));
        return row;
      }));
    };
    fillList(listQ, rA, A.scores, topA);
    fillList(listH, rB, B.scores, topB);

    if (rel) {
      const recall = top => rel.filter(i => top.has(i)).length / rel.length;
      const mrr = (order, scores) => {
        const r = order.findIndex(i => rel.includes(i) && scores[i] > 1e-9);
        return r < 0 ? 0 : 1 / (r + 1);
      };
      sQ.set(pct(recall(topA))); sH.set(pct(recall(topB)));
      sM.set(`${mrr(rA, A.scores).toFixed(2)} → ${mrr(rB, B.scores).toFixed(2)}`);
    } else {
      [sQ, sH, sM].forEach(s => s.set('<small>pick a preset query to score against labels</small>'));
    }
  }
  function docTip(i, a, b) {
    return `<b>${esc(CORPUS[i].title)}</b><br>${esc(CORPUS[i].text)}<br><span class="muted">cos(query) ${a.toFixed(3)} · cos(HyDE) ${b.toFixed(3)}</span>`;
  }
  draw();
});

/* ---------- HyDE in depth: N hypotheses, hallucinations, cross-lingual queries ---------- */
const HYDE_QUERIES = [
  { q: 'what pills help with high sugar', rel: [0, 1] },
  { q: 'blood thinner and painkiller together', rel: [4, 5] },
  { q: 'feeling sad all the time, what medication', rel: [10] },
  { q: 'какие таблетки помогают от высокого сахара', rel: [0, 1] },
  { q: 'можно ли обезболивающее с препаратом, разжижающим кровь', rel: [4, 5] },
  { q: 'постоянно грустно, какое лекарство принять', rel: [10] },
];
const HYDE_STAGES = ['Question', 'LLM writes N hypotheses', 'Encode each', 'Average vectors', 'Search the real corpus', 'Answer from real documents'];

figure('hyde-deep', host => {
  const index = new TfIdf(CORPUS.map(d => d.title + ' ' + d.text));
  const docVecs = CORPUS.map(d => index.vec(d.title + ' ' + d.text));
  const vcache = new Map();
  const vec = t => { if (!vcache.has(t)) vcache.set(t, index.vec(t)); return vcache.get(t); };
  const terms = [...index.vocab.keys()];
  const K = 3;
  let qi = LANG === 'ru' ? 3 : 0, seed = 1, stage = 1;

  const qChips = chips(HYDE_QUERIES.map(x => x.q), (_, i) => { qi = i; recompute(); }, qi);
  const N = slider({ label: 'N hypotheses', min: 1, max: 8, value: 4, onInput: () => recompute(false) });
  const H = slider({ label: 'hallucination rate', min: 0, max: 0.6, step: 0.05, value: 0.25, format: v => pct(v), onInput: recompute });
  const useQ = toggle({ label: 'also average in the query vector (as in the paper)', checked: true, onChange: recompute });
  const pipeBox = el('div'), stageBox = el('div', { class: 'panel', style: 'min-height:150px' });
  const curveBox = el('div'), curveNote = el('p', { style: 'font-size:13px;color:var(--muted);margin:6px 0 0' });
  const prevB = button('◀', () => go(stage - 1)), nextB = button('▶', () => go(stage + 1), 'primary');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: the HyDE algorithm, stage by stage' }),
    el('div', { style: 'margin-bottom:10px' }, qChips),
    el('div', { class: 'controls' }, N, H, useQ, button('Resample hypotheses', () => { seed++; recompute(false); })),
    pipeBox,
    el('div', { class: 'btn-row', style: 'margin:8px 0' }, prevB, nextB),
    stageBox,
    el('div', { class: 'kicker', style: 'margin-top:14px', text: 'Does averaging help? 300 simulated runs per point' }),
    curveBox, curveNote,
  );

  const rankOf = v => range(CORPUS.length).map(i => [i, dot(v, docVecs[i])]).sort((a, b) => b[1] - a[1]);
  const recallAt = (v, rel) => rankOf(v).slice(0, K).filter(([i, s]) => s > 1e-9 && rel.includes(i)).length / rel.length;
  function meanVec(qv, hyps, withQ) {
    const v = new Float64Array(index.dim);
    for (const h of hyps) { const hv = vec(h.text); for (let j = 0; j < v.length; j++) v[j] += hv[j]; }
    if (withQ) for (let j = 0; j < v.length; j++) v[j] += qv[j];
    return normalize(v);
  }

  let run = null, curve = null;
  function recompute(redoCurve = true) {
    const Q = HYDE_QUERIES[qi], qv = index.vec(Q.q), rnd = mulberry32(seed * 7919 + qi);
    const hyps = range(N.get()).map(() => sampleHypothesis(Q.q, rnd, H.get()));
    const v = meanVec(qv, hyps, useQ.get());
    run = { Q, qv, hyps, v, rank: rankOf(v), plainRank: rankOf(qv) };
    if (redoCurve || !curve) curve = monteCarlo(Q, qv);
    go(stage, true);
    drawCurve();
  }
  function monteCarlo(Q, qv) {
    const r = mulberry32(2024 + qi), T = 300, withQ = Array(8).fill(0), noQ = Array(8).fill(0);
    for (let t = 0; t < T; t++) {
      const hs = range(8).map(() => sampleHypothesis(Q.q, r, H.get()));
      for (let n = 1; n <= 8; n++) {
        withQ[n - 1] += recallAt(meanVec(qv, hs.slice(0, n), true), Q.rel) / T;
        noQ[n - 1] += recallAt(meanVec(qv, hs.slice(0, n), false), Q.rel) / T;
      }
    }
    return { withQ, noQ, plain: recallAt(qv, Q.rel) };
  }

  // HTML rather than SVG so stage names wrap in any language
  function drawPipe() {
    pipeBox.replaceChildren(el('div', { class: 'pipe' }, HYDE_STAGES.map((name, i) => [
      i ? el('span', { class: 'pipe-arrow', 'aria-hidden': 'true', text: '→' }) : null,
      el('button', { type: 'button', class: 'pipe-step' + (i === stage ? ' on' : '') + (i >= 1 && i <= 3 ? ' fake' : ''), onclick: () => go(i) },
        el('span', { class: 'n', text: i + 1 }), el('span', { text: name })),
    ])), el('div', { class: 'pipe-note', text: 'dashed = synthetic text, thrown away after retrieval' }));
  }

  const relMark = i => run.Q.rel.includes(i) ? el('b', { style: 'color:var(--good-ink)', text: '✓ ' }) : el('span', { style: 'color:var(--muted)', text: '· ' });
  const rankList = (rank, n = 5) => el('div', { class: 'rank' }, rank.slice(0, n).map(([i, s], r) =>
    el('div', { class: 'rank-row' + (r < K && s > 1e-9 ? '' : ' cut') }, el('span', { class: 'rel' }, relMark(i)),
      el('span', { class: 't', text: CORPUS[i].title }), el('span', { class: 's', text: s.toFixed(3) }))));
  const markWrong = h => {
    const box = el('div', { class: 'hyde-doc', style: 'padding:6px 8px;border-radius:6px;background:var(--surface-2);margin-bottom:4px' });
    let html = esc(h.text);
    for (const w of h.wrong) html = html.replace(esc(w), `<mark>${esc(w)}</mark>`);
    box.innerHTML = (h.misread ? '<b style="color:var(--s2)">⚠ misread </b>' : h.wrong.length ? '<b style="color:var(--s4)">⚠ stray </b>' : '<b style="color:var(--good-ink)">✓ </b>') + html;
    return box;
  };
  function topTerms(v, n) {
    return range(v.length).filter(j => v[j] > 0).sort((a, b) => v[b] - v[a]).slice(0, n).map(j => [terms[j], v[j]]);
  }
  const relTerms = () => new Set(run.Q.rel.flatMap(i => tokenize(CORPUS[i].title + ' ' + CORPUS[i].text)));

  function go(i, force) {
    i = clamp(i, 0, HYDE_STAGES.length - 1);
    if (i === stage && !force) return;
    stage = i;
    prevB.disabled = stage === 0; nextB.disabled = stage === HYDE_STAGES.length - 1;
    drawPipe();
    const { Q, qv, hyps, v } = run, known = index.known(Q.q);
    const body = [el('h4', { text: `${stage + 1}. ${HYDE_STAGES[stage]}` })];
    if (stage === 0) {
      body.push(el('p', { style: 'margin:0 0 6px;font-size:15px', text: '“' + Q.q + '”' }),
        el('p', { style: 'margin:0', text: known.length
          ? `Words the index knows: ${[...new Set(known)].join(', ')}. Searching with these alone finds:`
          : 'The index has never seen a single one of these words (different vocabulary — or a different language). Plain search has nothing to match on:' }),
        rankList(run.plainRank, 3));
    } else if (stage === 1) {
      body.push(el('p', { style: 'margin:0 0 6px', text: `Prompt: "Write a short clinical-guideline passage that answers the question." Sampled ${N.get()}× at temperature > 0. Orange = hallucinated content.` }),
        ...hyps.map(markWrong));
    } else if (stage === 2) {
      const rt = relTerms();
      body.push(el('p', { style: 'margin:0 0 6px', text: 'Each hypothesis is embedded with the same encoder as the documents. Its strongest dimensions, and the document it alone would retrieve:' }),
        el('table', { class: 'tbl' }, el('tbody', {}, hyps.map((h, k) => {
          const top = rankOf(vec(h.text))[0];
          return el('tr', {}, el('td', { text: `h${k + 1}` }),
            el('td', { class: 'mono', style: 'font-size:12px' }, topTerms(vec(h.text), 4).map(([t, w]) =>
              el('span', { style: `margin-right:8px;color:${rt.has(t) ? 'var(--good-ink)' : 'var(--s2)'}`, text: `${t} ${w.toFixed(2)}` }))),
            el('td', {}, relMark(top[0]), CORPUS[top[0]].title));
        }))),
        el('p', { style: 'font-size:13px;color:var(--muted);margin:6px 0 0', text: 'Green terms occur in a relevant guideline; orange ones do not.' }));
    } else if (stage === 3) {
      const rt = relTerms(), tt = topTerms(v, 10), max = tt.length ? tt[0][1] : 1;
      const W = 520, rowH = 20, svg = svgRoot(W, tt.length * rowH + 6, 'Top dimensions of the averaged vector');
      tt.forEach(([t, w], r) => {
        svg.append(sv('text', { x: 110, y: r * rowH + 15, 'text-anchor': 'end', class: 't-mono', text: t }));
        svg.append(sv('rect', { x: 118, y: r * rowH + 4, width: Math.max(2, (W - 180) * w / max), height: 13, rx: 3, style: `fill:${rt.has(t) ? 'var(--s1)' : 'var(--s2)'}` }));
        svg.append(sv('text', { x: 124 + (W - 180) * w / max, y: r * rowH + 15, class: 't-mono', text: w.toFixed(3) }));
      });
      body.push(el('div', { class: 'math', style: 'font-size:17px;margin:4px 0 8px', html:
        `<var>v</var> = normalise( ${useQ.get() ? '<var>f</var>(<var>q</var>) + ' : ''}Σ<sub><var>k</var>=1..${N.get()}</sub> <var>f</var>(<var>h</var><sub><var>k</var></sub>) )` }),
        el('p', { style: 'margin:0 0 6px', text: 'Content the hypotheses agree on adds up; a one-off hallucination is diluted by 1/N. Top dimensions of the average:' }),
        legend([['var(--s1)', 'term in a relevant guideline'], ['var(--s2)', 'term from elsewhere']]), svg);
    } else if (stage === 4) {
      const single = rankOf(vec(hyps[0].text));
      body.push(el('div', { class: 'cols' },
        el('div', {}, el('div', { class: 'kicker', text: `HyDE (N = ${N.get()})` }), rankList(run.rank)),
        el('div', {}, el('div', { class: 'kicker', text: 'one hypothesis only (h1)' }), rankList(single))),
        el('p', { style: 'font-size:13px;color:var(--muted);margin:6px 0 0', text: `Top ${K} are retrieved. The search runs over real documents only — the hypotheses are not in the index.` }));
    } else {
      const got = run.rank.slice(0, K).filter(([, s]) => s > 1e-9).map(([i]) => i);
      body.push(el('p', { style: 'margin:0 0 6px', text: 'The hypotheses are discarded. Only real, citable guideline text reaches the answering prompt:' }),
        el('pre', { style: 'font-size:12px;white-space:pre-wrap', text:
          'Answer using ONLY the sources below. Cite them.\n\n' + got.map((i, r) => `[${r + 1}] ${CORPUS[i].title}: ${CORPUS[i].text}`).join('\n') + `\n\nQuestion: ${Q.q}` }),
        el('p', { style: 'font-size:13px;color:var(--muted);margin:6px 0 0', text: 'So a hallucinated detail in a hypothesis can steer the search, but it is never shown to the patient as fact.' }));
    }
    stageBox.replaceChildren(...body);
  }

  function drawCurve() {
    const W = fitWidth(curveBox, 720), Hc = 220, pl = 44, pr = 150, pb = 28;
    const x = lin(1, 8, pl + 6, W - pr), y = lin(0, 1, Hc - pb, 24);
    const svg = svgRoot(W, Hc, 'Recall at 3 versus number of hypotheses');
    axisLeft(svg, y, [0, 0.25, 0.5, 0.75, 1], pl, W - pr, v => pct(v));
    axisBottom(svg, x, range(8).map(i => i + 1), Hc - pb);
    svg.append(sv('text', { x: W - pr, y: Hc - 2, 'text-anchor': 'end', class: 't-muted', text: 'N hypotheses →' }));
    svg.append(sv('text', { x: 0, y: 8, class: 't-muted', text: `recall@${K}` }));
    svg.append(sv('line', { x1: pl, x2: W - pr, y1: y(curve.plain), y2: y(curve.plain), style: 'stroke:var(--s2);stroke-width:2;stroke-dasharray:6 4' }));
    const series = [['withQ', 'var(--s1)', 'HyDE + query vector', ''], ['noQ', 'var(--s3)', 'HyDE, hypotheses only', 'stroke-dasharray:6 4;']];
    const labels = [[y(curve.plain), 'plain query', 'var(--s2)']];
    series.forEach(([k, col, name, dash]) => {
      const c = curve[k];
      svg.append(sv('path', { d: c.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1)},${y(v)}`).join(''), style: `fill:none;stroke:${col};stroke-width:2;${dash}` }));
      c.forEach((v, i) => {
        const dot = sv('circle', { cx: x(i + 1), cy: y(v), r: i + 1 === N.get() ? 6 : 3.5, style: `fill:${col};stroke:var(--surface);stroke-width:2` });
        Tip.bind(dot, () => `${name}<br>N = ${i + 1}: recall@${K} <b>${pct(v, 1)}</b>`);
        svg.append(dot);
      });
      labels.push([y(c[7]), name, col]);
    });
    labels.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < labels.length; i++) if (labels[i][0] - labels[i - 1][0] < 14) labels[i][0] = labels[i - 1][0] + 14;
    labels.forEach(([yy, t]) => svg.append(sv('text', { x: W - pr + 8, y: yy + 4, class: 't-ink', style: 'font-size:11px', text: t })));
    curveBox.replaceChildren(svg);
    curveNote.textContent = `Hallucination rate ${pct(H.get())}: with one hypothesis, a misread question sends retrieval to the wrong guideline. ` +
      'Averaging several hypotheses votes the error out — the same reason the paper samples 8 of them.';
  }

  onResize(drawCurve);
  recompute();
});
