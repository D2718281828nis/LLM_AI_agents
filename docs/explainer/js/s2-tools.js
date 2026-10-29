/* §2 — tool selection and the MCP JSON-RPC exchange.
   The "model" here is a transparent scorer: keyword evidence + whether the required
   arguments can be filled. A real LLM does this implicitly; the shape of the decision is the same. */
'use strict';

function scoreTools(query) {
  const q = ' ' + query.toLowerCase() + ' ';
  const rows = TOOLS.map(t => {
    const hits = t.keywords.filter(k => q.includes(k));
    const args = t.extract(query);
    const req = t.schema.required;
    const filled = req.filter(r => args[r] != null).length;
    const score = 1.5 * hits.length + 2.0 * (filled / req.length) + (filled === req.length ? 1 : 0);
    return { tool: t, hits, args, missing: req.filter(r => args[r] == null), score };
  });
  rows.push({ tool: null, hits: [], args: {}, missing: [], score: 1.2 }); // answer directly, no tool
  const p = softmaxT(rows.map(r => r.score), 0.8);
  rows.forEach((r, i) => { r.p = p[i]; });
  return rows;
}

function finalAnswer(name, res) {
  if (res.error) return `I couldn't complete that: ${res.error}.`;
  switch (name) {
    case 'get_drug_info': return `${cap(res.drug)} is a ${res.class}, used for ${res.used_for}. Key safety note: ${res.safety}.`;
    case 'check_interaction': return res.severity === 'none known'
      ? `I found no known interaction between ${res.pair[0]} and ${res.pair[1]} in my database — still check with a pharmacist.`
      : `${cap(res.pair[0])} + ${res.pair[1]}: ${res.severity.toUpperCase()} interaction. ${res.detail}`;
    case 'calculate_bmi': return `Your BMI is ${res.bmi}, which is in the "${res.category}" range (${res.scale}).`;
    case 'find_appointment': return res.slots.length
      ? `Free ${res.specialty} slots: ` + res.slots.map(s => `${cap(s.day)} ${s.time} (${s.doctor})`).join(', ') + '.'
      : `No free ${res.specialty} slots${res.day !== 'any' ? ' on ' + cap(res.day) : ''}. Try another day.`;
  }
  return JSON.stringify(res);
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

figure('tools', host => {
  const EXAMPLES = [
    'Can I take ibuprofen while on warfarin?',
    "I weigh 82 kg and I'm 175 cm tall — what's my BMI?",
    'Book a cardiologist on Friday',
    'What is metformin used for?',
    'Is it safe to take aspirin together?',
    'Hello! How are you today?',
  ];
  const input = el('input', { type: 'text', class: 'txt', value: EXAMPLES[0], style: 'width:100%', 'aria-label': 'User message' });
  input.addEventListener('input', () => { exChips.clear(); run(); });
  const exChips = chips(EXAMPLES, t => { input.value = t; run(); }, 0);
  const barsBox = el('div'), decision = el('div', { class: 'panel' });
  host.append(
    el('div', { class: 'fig-title', text: 'Live: which tool would the model call?' }),
    el('label', { class: 'ctl wide', style: 'margin-bottom:8px' }, el('span', { class: 'lab', text: 'User message (type anything)' }), input),
    el('div', { style: 'margin-bottom:12px' }, exChips),
    el('div', { class: 'cols' }, barsBox, decision),
  );

  function run() {
    const rows = scoreTools(input.value);
    const best = rows.reduce((a, b) => (b.p > a.p ? b : a));
    const W = fitWidth(barsBox, 520), rowH = 34, pl = 150, H = rows.length * rowH + 8;
    const x = lin(0, 1, pl, W - 50);
    const svg = svgRoot(W, H, 'Tool selection probabilities');
    rows.forEach((r, i) => {
      const y = 4 + i * rowH, name = r.tool ? r.tool.name : '(answer directly)';
      svg.append(sv('text', { x: pl - 8, y: y + 15, 'text-anchor': 'end', class: r === best ? 't-ink t-mono' : 't-mono', text: name }));
      svg.append(sv('text', { x: pl - 8, y: y + 28, 'text-anchor': 'end', class: 't-muted', style: 'font-size:10px',
        text: r.tool ? (r.missing.length ? 'missing: ' + r.missing.join(', ') : 'args complete') : 'no tool needed' }));
      svg.append(sv('rect', { x: pl, y: y + 6, width: x(1) - pl, height: 16, rx: 4, style: 'fill:var(--surface-2)' }));
      svg.append(sv('rect', { x: pl, y: y + 6, width: Math.max(2, x(r.p) - pl), height: 16, rx: 4, style: `fill:${r === best ? 'var(--s1)' : 'var(--axis)'}` }));
      svg.append(sv('text', { x: x(1) + 6, y: y + 18, class: 't-mono', text: pct(r.p) }));
      const hit = sv('rect', { class: 'hit', x: 0, y, width: W, height: rowH });
      Tip.bind(hit, () => r.tool
        ? `<b>${r.tool.name}</b><br>${esc(r.tool.description)}<br><span class="muted">keyword hits:</span> ${r.hits.map(esc).join(', ') || 'none'}` +
          `<br><span class="muted">extracted:</span> ${esc(JSON.stringify(r.args))}<br><span class="muted">score ${r.score.toFixed(2)}</span>`
        : 'Baseline: reply in plain text without calling a tool.');
      svg.append(hit);
    });
    barsBox.replaceChildren(svg);

    decision.replaceChildren(el('h4', { text: 'Model decision' }));
    if (!best.tool) {
      decision.append(el('p', { text: 'No tool clearly matches, so the model answers in plain text. That is the right call for small talk — and a hallucination risk for factual medical questions.' }));
    } else if (best.missing.length) {
      decision.append(
        el('div', {}, el('span', { class: 'badge warn', text: '? clarify' }), ' ', el('code', { text: best.tool.name })),
        el('p', { style: 'margin-top:8px', text: `The required argument${best.missing.length > 1 ? 's' : ''} ${best.missing.join(', ')} could not be filled from the message. A well-behaved agent asks instead of guessing:` }),
        el('pre', { text: `"Which ${best.missing.includes('drug_b') ? 'other drug' : best.missing[0].replace('_', ' ')} do you mean?"` }));
    } else {
      const res = best.tool.run(best.args);
      decision.append(
        el('div', {}, el('span', { class: 'badge good', text: '✓ call' }), ' ', el('code', { text: best.tool.name })),
        el('pre', { style: 'margin-top:8px', text: JSON.stringify({ name: best.tool.name, arguments: best.args }, null, 2) }),
        el('h4', { style: 'margin-top:10px', text: 'Tool result → final answer' }),
        el('pre', { text: JSON.stringify(res, null, 2) }),
        el('p', { style: 'margin:8px 0 0', text: finalAnswer(best.tool.name, res) }));
    }
    mcpUpdate && mcpUpdate(input.value, best);
  }

  let mcpUpdate = null;
  host._setMcp = fn => { mcpUpdate = fn; run(); };
  onResize(run);
  run();
});

figure('mcp', host => {
  const LANES = ['LLM', 'MCP client (host app)', 'MCP server'];
  let steps = [], cur = -1, timer = null;
  const svgBox = el('div'), json = el('pre', { style: 'min-height:180px;font-size:12px' }), note = el('p', { style: 'font-size:14px;margin:8px 0 0' });
  const prev = button('◀ Back', () => go(cur - 1)), next = button('Next ▶', () => go(cur + 1), 'primary');
  const play = button('▶ Play all', () => {
    if (timer) return stop();
    play.textContent = '■ Stop';
    if (cur >= steps.length - 1) cur = -1;
    timer = setInterval(() => { if (cur >= steps.length - 1) return stop(); go(cur + 1); }, 1100);
  });
  const stop = () => { clearInterval(timer); timer = null; play.textContent = '▶ Play all'; };
  const qLine = el('div', { style: 'font-size:14px;color:var(--ink-2);margin-bottom:8px' });
  host.append(
    el('div', { class: 'fig-title', text: 'The protocol, message by message (driven by the message above)' }),
    qLine,
    el('div', { class: 'btn-row', style: 'margin-bottom:10px' }, prev, next, play),
    el('div', { class: 'cols-3-2' }, svgBox, el('div', {}, el('div', { class: 'panel' }, el('h4', { text: 'Selected message' }), json, note))),
  );

  function build(query, best) {
    const t = best && best.tool;
    const toolsList = TOOLS.map(x => ({ name: x.name, description: x.description, inputSchema: x.schema }));
    steps = [
      [1, 2, 'initialize', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'clinic-assistant', version: '1.0' } } }, 'Handshake: client and server agree on protocol version and capabilities.'],
      [2, 1, 'result', { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'med-tools', version: '0.3' } } }, 'The server says it offers tools.'],
      [1, 2, 'tools/list', { jsonrpc: '2.0', id: 2, method: 'tools/list' }, 'Discovery: the client asks which tools exist. No tool is hard-coded in the app.'],
      [2, 1, 'result', { jsonrpc: '2.0', id: 2, result: { tools: toolsList } }, 'Names, descriptions and JSON Schemas. The descriptions are what the LLM reads to decide.'],
      [1, 0, 'prompt + tools', { messages: [{ role: 'user', content: query }], tools: toolsList.map(x => ({ name: x.name, description: x.description, input_schema: x.inputSchema })) }, 'The host passes the user message plus the tool schemas to the model.'],
    ];
    if (t && !best.missing.length) {
      const res = t.run(best.args);
      steps.push(
        [0, 1, 'tool_use', { type: 'tool_use', name: t.name, input: best.args }, 'The model does not run code — it emits a structured request.'],
        [1, 2, 'tools/call', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: t.name, arguments: best.args } }, 'The client forwards the call to the server that owns the tool.'],
        [2, 1, 'result', { jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: JSON.stringify(res) }], isError: !!res.error } }, 'Results come back as content blocks.'],
        [1, 0, 'tool_result', { type: 'tool_result', content: JSON.stringify(res) }, 'The result is appended to the conversation and the model is called again.'],
        [0, 1, 'final answer', { role: 'assistant', content: finalAnswer(t.name, res) }, 'The model turns raw JSON into a grounded answer.'],
      );
    } else {
      steps.push([0, 1, 'text reply', { role: 'assistant', content: t ? 'Could you tell me which ' + best.missing.join(' and ') + '?' : 'Plain-text answer (no tool used).' }, t ? 'Arguments are missing, so no tools/call is sent.' : 'No tool needed: the exchange ends after discovery.']);
    }
    qLine.innerHTML = `User: <b>${esc(query)}</b>`;
    stop();
    cur = steps.length - 1;
    go(0, true);
  }

  function go(i, force) {
    i = clamp(i, 0, steps.length - 1);
    if (i === cur && !force) return;
    cur = i;
    prev.disabled = cur === 0; next.disabled = cur === steps.length - 1;
    const W = 460, top = 34, rowH = 30, H = top + steps.length * rowH + 10;
    const lx = [70, 230, 390];
    const svg = svgRoot(W, H, 'MCP sequence diagram');
    LANES.forEach((n, k) => {
      svg.append(sv('rect', { x: lx[k] - 62, y: 2, width: 124, height: 22, rx: 6, style: 'fill:var(--surface-2);stroke:var(--border)' }));
      svg.append(sv('text', { x: lx[k], y: 17, 'text-anchor': 'middle', class: 't-ink', style: 'font-size:11px;font-weight:600', text: n }));
      svg.append(sv('line', { x1: lx[k], x2: lx[k], y1: 24, y2: H, class: 'axis', 'stroke-dasharray': '2 4' }));
    });
    steps.forEach(([a, b, label], k) => {
      const y = top + k * rowH + 12, on = k === cur, done = k <= cur;
      const x1 = lx[a], x2 = lx[b], dir = Math.sign(x2 - x1);
      const col = !done ? 'var(--grid)' : on ? 'var(--s1)' : 'var(--axis)';
      svg.append(sv('line', { x1, x2: x2 - dir * 6, y1: y, y2: y, style: `stroke:${col};stroke-width:${on ? 2.5 : 1.5}` }));
      svg.append(sv('path', { d: `M${x2},${y} l${-dir * 8},-4 v8 z`, style: `fill:${col}` }));
      svg.append(sv('text', { x: (x1 + x2) / 2, y: y - 5, 'text-anchor': 'middle', class: on ? 't-ink t-mono' : done ? 't-mono' : 't-mono t-muted', style: on ? 'font-weight:700' : '', text: `${k + 1}. ${label}` }));
      const hit = sv('rect', { class: 'hit', x: Math.min(x1, x2), y: y - 16, width: Math.abs(x2 - x1), height: rowH });
      hit.addEventListener('click', () => { stop(); go(k); });
      svg.append(hit);
    });
    svgBox.replaceChildren(svg);
    json.textContent = JSON.stringify(steps[cur][3], null, 2);
    note.textContent = steps[cur][4];
  }

  const toolsHost = document.querySelector('[data-fig="tools"]');
  if (toolsHost && toolsHost._setMcp) toolsHost._setMcp(build);
  else build(EXAMPLE_FALLBACK, null);
});
const EXAMPLE_FALLBACK = 'Can I take ibuprofen while on warfarin?';
