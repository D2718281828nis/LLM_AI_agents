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

/* Stand-in for the LLM that writes the hypothetical passage: each lay concept maps to the sentence
   a model would plausibly write. In lesson 13 a real LLM generates this text. */
const HYDE_CONCEPTS = [
  [/sugar|glucose/, 'Elevated blood glucose in type 2 diabetes mellitus is managed with metformin, and glycaemic control is tracked with HbA1c.'],
  [/pill|tablet|medication|medicine|drug/, 'First-line pharmacological therapy is recommended.'],
  [/thinner|anticoag/, 'Patients on anticoagulation with warfarin need INR monitoring.'],
  [/painkiller|pain|analges/, 'For analgesia, paracetamol is preferred over NSAIDs such as ibuprofen because of bleeding risk.'],
  [/pressure|hypertens/, 'Hypertension is treated with antihypertensive agents such as ACE inhibitors.'],
  [/cough/, 'A persistent dry cough is a known adverse effect of ACE inhibitors.'],
  [/sad|down|depress|low mood/, 'Depressive disorder is treated first-line with SSRIs such as sertraline.'],
  [/throat/, 'Streptococcal pharyngitis is treated with antibiotics.'],
  [/allerg/, 'With penicillin allergy, avoid amoxicillin and use alternatives such as macrolides.'],
  [/headache|migraine/, 'Migraine attacks respond to triptans.'],
  [/breath|wheez|asthma/, 'Asthma control relies on inhaled corticosteroids.'],
  [/kidney|renal/, 'Renal function (eGFR) guides metformin dosing.'],
  [/cholesterol|statin/, 'Statins lower LDL cholesterol; watch for interactions causing myopathy.'],
  [/level|target|aim/, 'Targets should be individualised.'],
];
function hydeDoc(query) {
  const q = query.toLowerCase();
  const parts = HYDE_CONCEPTS.filter(([re]) => re.test(q)).map(([, s]) => s);
  return parts.length ? parts.join(' ') : query;
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
