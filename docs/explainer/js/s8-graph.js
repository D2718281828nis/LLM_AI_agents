/* §8 — fact-checking a claim against a small medical knowledge graph,
   plus GNN-style message passing (what lesson 11's graph network learns weights for). */
'use strict';

const KG_NODES = [
  ...['metformin', 'insulin', 'warfarin', 'aspirin', 'ibuprofen', 'paracetamol', 'tramadol', 'sertraline', 'lisinopril', 'amoxicillin'].map(n => [n, 'drug']),
  ...['type 2 diabetes', 'atrial fibrillation', 'pain', 'depression', 'hypertension', 'bacterial infection', 'penicillin allergy'].map(n => [n, 'condition']),
  ...['hypoglycaemia', 'lactic acidosis', 'bleeding', 'serotonin syndrome', 'dry cough'].map(n => [n, 'effect']),
].map(([id, kind]) => ({ id, kind }));
const KG_EDGES = [
  ['metformin', 'treats', 'type 2 diabetes'], ['insulin', 'treats', 'type 2 diabetes'],
  ['insulin', 'causes', 'hypoglycaemia'], ['metformin', 'causes', 'lactic acidosis'],
  ['warfarin', 'treats', 'atrial fibrillation'], ['warfarin', 'causes', 'bleeding'],
  ['aspirin', 'causes', 'bleeding'], ['ibuprofen', 'causes', 'bleeding'],
  ['ibuprofen', 'treats', 'pain'], ['paracetamol', 'treats', 'pain'], ['tramadol', 'treats', 'pain'],
  ['sertraline', 'treats', 'depression'], ['lisinopril', 'treats', 'hypertension'], ['lisinopril', 'causes', 'dry cough'],
  ['amoxicillin', 'treats', 'bacterial infection'], ['amoxicillin', 'contraindicated_in', 'penicillin allergy'],
  ['warfarin', 'interacts_with', 'ibuprofen'], ['warfarin', 'interacts_with', 'aspirin'], ['sertraline', 'interacts_with', 'tramadol'],
  ['tramadol', 'causes', 'serotonin syndrome'], ['sertraline', 'causes', 'serotonin syndrome'],
];
const REL_COLOR = { treats: 'var(--s1)', causes: 'var(--s2)', interacts_with: 'var(--s7)', contraindicated_in: 'var(--s8)' };
const CONTRADICTS = { treats: 'causes', causes: 'treats', safe_in: 'contraindicated_in', contraindicated_in: 'safe_in' };
const SYMMETRIC = new Set(['interacts_with']);
const CLAIMS = [
  ['metformin', 'treats', 'type 2 diabetes'],
  ['lisinopril', 'treats', 'dry cough'],
  ['warfarin', 'interacts_with', 'ibuprofen'],
  ['amoxicillin', 'safe_in', 'penicillin allergy'],
  ['metformin', 'causes', 'hypoglycaemia'],
  ['paracetamol', 'causes', 'bleeding'],
];

function verify([s, r, o]) {
  const match = (e, rel) => e[1] === rel && ((e[0] === s && e[2] === o) || (SYMMETRIC.has(rel) && e[0] === o && e[2] === s));
  const direct = KG_EDGES.find(e => match(e, r));
  if (direct) return { verdict: 'SUPPORTED', cls: 'sup', edges: [direct], why: 'An edge with exactly this relation exists.' };
  const contra = CONTRADICTS[r] && KG_EDGES.find(e => match(e, CONTRADICTS[r]));
  if (contra) return { verdict: 'REFUTED', cls: 'ref', edges: [contra], why: `The graph says "${contra[0]} ${contra[1]} ${contra[2]}", which contradicts the claim.` };
  // shortest undirected path, up to 3 hops
  const adj = new Map(KG_NODES.map(n => [n.id, []]));
  KG_EDGES.forEach(e => { adj.get(e[0]).push([e[2], e]); adj.get(e[2]).push([e[0], e]); });
  const prev = new Map([[s, null]]), q = [s];
  while (q.length) {
    const u = q.shift();
    if (u === o) break;
    for (const [v, e] of adj.get(u)) if (!prev.has(v)) { prev.set(v, [u, e]); q.push(v); }
  }
  if (prev.has(o) && s !== o) {
    const path = [];
    for (let v = o; prev.get(v); v = prev.get(v)[0]) path.unshift(prev.get(v)[1]);
    if (path.length <= 3) return { verdict: 'NOT ENOUGH INFO', cls: 'ind', edges: path,
      why: `Only an indirect ${path.length}-hop association exists. A path is not evidence — sharing a neighbour does not make the claim true.` };
  }
  return { verdict: 'NOT ENOUGH INFO', cls: 'nei', edges: [], why: 'Nothing in the graph links these. Absence of an edge is not proof the claim is false.' };
}

/* H = (½I + ½·D⁻¹A)^k : row n is node n's representation after k rounds of mean-aggregation */
function propagate(k) {
  const n = KG_NODES.length, idx = new Map(KG_NODES.map((x, i) => [x.id, i]));
  const A = range(n).map(() => new Float64Array(n));
  KG_EDGES.forEach(([a, , b]) => { A[idx.get(a)][idx.get(b)] = 1; A[idx.get(b)][idx.get(a)] = 1; });
  const M = A.map((row, i) => { const d = sum(row) || 1; return row.map((v, j) => 0.5 * v / d + (i === j ? 0.5 : 0)); });
  let H = range(n).map(i => Float64Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let t = 0; t < k; t++) H = H.map(row => Float64Array.from({ length: n }, (_, j) => sum(range(n).map(m => row[m] * M[m][j]))));
  return { H, idx };
}
const cosine = (a, b) => dot(a, b) / (Math.sqrt(dot(a, a) * dot(b, b)) || 1);

figure('graph', host => {
  const ids = KG_NODES.map(n => n.id);
  let claim = CLAIMS[0].slice();
  const subj = select({ label: 'subject', options: ids, value: claim[0], onChange: v => { claim[0] = v; cChips.clear(); draw(); } });
  const rel = select({ label: 'relation', options: ['treats', 'causes', 'interacts_with', 'contraindicated_in', 'safe_in'], value: claim[1], onChange: v => { claim[1] = v; cChips.clear(); draw(); } });
  const obj = select({ label: 'object', options: ids, value: claim[2], onChange: v => { claim[2] = v; cChips.clear(); draw(); } });
  const hops = slider({ label: 'message-passing rounds k', min: 0, max: 4, value: 2, onInput: draw });
  const cChips = chips(CLAIMS.map(c => ({ label: `${c[0]} ${c[1].replace('_', ' ')} ${c[2]}`, c })), it => {
    claim = it.c.slice(); subj.set(claim[0]); rel.set(claim[1]); obj.set(claim[2]); draw();
  }, 0);
  const gBox = el('div', { style: 'overflow-x:auto' }), vBox = el('div', { class: 'panel' }), spark = el('div');
  host.append(
    el('div', { class: 'fig-title', text: 'Live: check a claim against the knowledge graph' }),
    el('div', { style: 'margin-bottom:10px' }, cChips),
    el('div', { class: 'controls' }, subj, rel, obj, hops),
    legend([...Object.entries(REL_COLOR).map(([r, c]) => [c, r.replace('_', ' ')]),
      ['var(--s1);opacity:.5', 'fill = subject after k rounds'], ['transparent;box-shadow:inset 0 0 0 2px var(--s2)', 'ring = object after k rounds']]),
    gBox,
    el('div', { class: 'cols' }, vBox, spark),
  );

  const COLX = { drug: 150, condition: 450, effect: 720 };
  const pos = {};
  ['drug', 'condition', 'effect'].forEach(kind => {
    const ns = KG_NODES.filter(n => n.kind === kind);
    ns.forEach((n, i) => { pos[n.id] = [COLX[kind], 40 + (i + 0.5) * (320 / ns.length)]; });
  });

  function draw() {
    const res = verify(claim), k = hops.get();
    const { H, idx } = propagate(k);
    const hs = H[idx.get(claim[0])], ho = H[idx.get(claim[2])];
    const maxS = Math.max(...hs), maxO = Math.max(...ho);
    const W = 900, Hh = 380;
    const svg = svgRoot(W, Hh, 'Medical knowledge graph');
    [['drugs', 'drug'], ['conditions', 'condition'], ['effects', 'effect']].forEach(([t, kd]) =>
      svg.append(sv('text', { x: COLX[kd], y: 16, 'text-anchor': 'middle', class: 't-muted', style: 'font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:11px', text: t })));
    const hl = new Set(res.edges);
    KG_EDGES.forEach(e => {
      const [x1, y1] = pos[e[0]], [x2, y2] = pos[e[2]], on = hl.has(e);
      const d = x1 === x2
        ? `M${x1},${y1} C${x1 + 60},${y1} ${x2 + 60},${y2} ${x2},${y2}`
        : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
      const p = sv('path', { d, style: `fill:none;stroke:${REL_COLOR[e[1]]};stroke-width:${on ? 4 : 1.5};stroke-opacity:${hl.size && !on ? 0.25 : 0.85};${on && res.cls !== 'sup' && res.cls !== 'ref' ? 'stroke-dasharray:7 4' : ''}` });
      const hit = sv('path', { d, style: 'fill:none;stroke:transparent;stroke-width:10;cursor:pointer' });
      Tip.bind(hit, () => `<b>${esc(e[0])}</b> ${e[1].replace('_', ' ')} <b>${esc(e[2])}</b>`);
      svg.append(p, hit);
    });
    KG_NODES.forEach(n => {
      const [x, y] = pos[n.id], i = idx.get(n.id);
      const fs = maxS ? hs[i] / maxS : 0, fo = maxO ? ho[i] / maxO : 0;
      const isEnd = n.id === claim[0] || n.id === claim[2];
      const c = sv('circle', { cx: x, cy: y, r: isEnd ? 10 : 8,
        style: `fill:color-mix(in srgb, var(--s1) ${Math.round(100 * fs)}%, var(--surface-2));stroke:${fo > 0.02 ? 'var(--s2)' : 'var(--axis)'};stroke-width:${fo > 0.02 ? 1 + 3 * fo : 1}` });
      Tip.bind(c, () => `<b>${esc(n.id)}</b> <span class="muted">${n.kind}</span><br>after ${k} rounds:<br>` +
        `subject signal ${hs[i].toFixed(3)} · object signal ${ho[i].toFixed(3)}`);
      svg.append(c);
      const left = n.kind === 'drug';
      svg.append(sv('text', { x: left ? x - 14 : x + 14, y: y + 4, 'text-anchor': left ? 'end' : 'start', class: isEnd ? 't-ink' : '', style: isEnd ? 'font-weight:700' : '', text: n.id }));
    });
    svg.style.minWidth = '760px';
    gBox.replaceChildren(svg);

    const icon = { sup: '✓', ref: '✗', ind: '≈', nei: '?' }[res.cls];
    vBox.replaceChildren(el('h4', { text: 'Verdict' }),
      el('div', { class: 'verdict ' + res.cls }, icon + ' ' + res.verdict),
      el('p', { style: 'margin:6px 0 0', text: `Claim: ${claim[0]} ${claim[1].replace('_', ' ')} ${claim[2]}.` }),
      el('p', { style: 'margin:6px 0 0;color:var(--ink-2)', text: res.why }),
      res.edges.length ? el('pre', { style: 'margin-top:8px;font-size:12px', text: res.edges.map(e => `(${e[0]}) -[${e[1]}]-> (${e[2]})`).join('\n') }) : null);

    // representation similarity vs rounds
    const sims = range(5).map(t => { const P = propagate(t); return cosine(P.H[P.idx.get(claim[0])], P.H[P.idx.get(claim[2])]); });
    const W2 = 420, H2 = 170, pl = 36, pb = 26;
    const x = lin(0, 4, pl + 6, W2 - 16), y = lin(0, 1, H2 - pb, 22);
    const s2 = svgRoot(W2, H2, 'Similarity of subject and object representations');
    s2.append(sv('text', { x: 0, y: 10, class: 't-muted', text: 'cosine(subject, object) after k rounds' }));
    axisLeft(s2, y, [0, 0.5, 1], pl, W2 - 16, v => v.toFixed(1));
    axisBottom(s2, x, [0, 1, 2, 3, 4], H2 - pb);
    s2.append(sv('path', { d: sims.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(''), style: 'fill:none;stroke:var(--s1);stroke-width:2' }));
    sims.forEach((v, i) => {
      const c = sv('circle', { cx: x(i), cy: y(v), r: i === k ? 6 : 3.5, style: 'fill:var(--s1);stroke:var(--surface);stroke-width:2' });
      Tip.bind(c, () => `k = ${i}: cosine <b>${v.toFixed(3)}</b>`);
      s2.append(c);
    });
    spark.replaceChildren(el('div', { class: 'panel' }, s2,
      el('p', { style: 'font-size:13px;color:var(--muted);margin:4px 0 0', text: 'Nodes within k hops start sharing signal. A GNN learns weights on top of this mixing, so it can tell "treats" from "causes" — plain proximity cannot.' })));
  }
  draw();
});
