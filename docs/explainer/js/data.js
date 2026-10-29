/* A tiny medical knowledge base shared by the tool, TAO and graph figures.
   Simplified for teaching — not clinical advice. */
'use strict';

const DRUGS = {
  metformin:      { cls: 'biguanide', use: 'first-line oral therapy for type 2 diabetes', note: 'reduce dose if eGFR < 45, stop if eGFR < 30' },
  insulin:        { cls: 'hormone', use: 'type 1 and advanced type 2 diabetes', note: 'main risk is hypoglycaemia' },
  warfarin:       { cls: 'vitamin K antagonist', use: 'anticoagulation in atrial fibrillation and venous thrombosis', note: 'monitor INR; many interactions' },
  aspirin:        { cls: 'antiplatelet / NSAID', use: 'secondary cardiovascular prevention', note: 'gastrointestinal bleeding risk' },
  ibuprofen:      { cls: 'NSAID', use: 'pain, fever and inflammation', note: 'GI bleeding; can raise blood pressure and harm kidneys' },
  paracetamol:    { cls: 'analgesic / antipyretic', use: 'pain and fever', note: 'max 4 g/day in adults; liver toxicity in overdose' },
  lisinopril:     { cls: 'ACE inhibitor', use: 'hypertension and heart failure', note: 'dry cough is a common side effect; monitor potassium' },
  amoxicillin:    { cls: 'penicillin antibiotic', use: 'bacterial infections such as strep throat', note: 'contraindicated in penicillin allergy' },
  sertraline:     { cls: 'SSRI antidepressant', use: 'depression and anxiety disorders', note: 'serotonin syndrome risk with tramadol' },
  tramadol:       { cls: 'opioid analgesic', use: 'moderate to severe pain', note: 'serotonergic; lowers seizure threshold' },
  atorvastatin:   { cls: 'statin', use: 'high LDL cholesterol and cardiovascular prevention', note: 'myopathy risk raised by clarithromycin' },
  clarithromycin: { cls: 'macrolide antibiotic', use: 'respiratory bacterial infections', note: 'strong CYP3A4 inhibitor' },
  spironolactone: { cls: 'potassium-sparing diuretic', use: 'heart failure and resistant hypertension', note: 'hyperkalaemia with ACE inhibitors' },
};
const DRUG_ALIASES = {
  acetaminophen: 'paracetamol', tylenol: 'paracetamol', panadol: 'paracetamol',
  advil: 'ibuprofen', nurofen: 'ibuprofen', motrin: 'ibuprofen',
  coumadin: 'warfarin', zoloft: 'sertraline', lipitor: 'atorvastatin', glucophage: 'metformin',
};

const INTERACTIONS = [
  ['warfarin', 'ibuprofen', 'major', 'NSAID + anticoagulant: markedly raised bleeding risk. Avoid if possible.'],
  ['warfarin', 'aspirin', 'major', 'Raised bleeding risk. Combine only on specialist advice.'],
  ['warfarin', 'paracetamol', 'minor', 'Regular high doses can raise INR; occasional use is generally preferred over NSAIDs.'],
  ['warfarin', 'clarithromycin', 'major', 'Clarithromycin can raise INR substantially.'],
  ['sertraline', 'tramadol', 'major', 'Serotonin syndrome risk.'],
  ['atorvastatin', 'clarithromycin', 'major', 'Raised statin levels: myopathy / rhabdomyolysis risk.'],
  ['lisinopril', 'spironolactone', 'moderate', 'Hyperkalaemia risk: monitor potassium.'],
  ['lisinopril', 'ibuprofen', 'moderate', 'NSAIDs blunt blood-pressure control and can harm kidney function.'],
  ['aspirin', 'ibuprofen', 'moderate', "Ibuprofen can reduce aspirin's antiplatelet effect; additive GI bleeding risk."],
];

const SPECIALTIES = {
  cardiologist: ['heart', 'cardio', 'cardiologist', 'chest', 'palpitation', 'blood pressure', 'hypertension'],
  endocrinologist: ['diabetes', 'endocrin', 'thyroid', 'sugar', 'insulin', 'hba1c'],
  neurologist: ['neuro', 'headache', 'migraine', 'seizure', 'numbness'],
  dermatologist: ['skin', 'rash', 'derma', 'mole', 'acne'],
  therapist: ['gp', 'general', 'therapist', 'checkup', 'check-up', 'family doctor'],
};
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const SLOTS = [
  { specialty: 'cardiologist', day: 'tuesday', time: '10:30', doctor: 'Dr. Orlova' },
  { specialty: 'cardiologist', day: 'friday', time: '09:00', doctor: 'Dr. Orlova' },
  { specialty: 'cardiologist', day: 'friday', time: '15:40', doctor: 'Dr. Kim' },
  { specialty: 'endocrinologist', day: 'monday', time: '14:00', doctor: 'Dr. Sato' },
  { specialty: 'endocrinologist', day: 'thursday', time: '11:20', doctor: 'Dr. Sato' },
  { specialty: 'neurologist', day: 'wednesday', time: '13:10', doctor: 'Dr. Haddad' },
  { specialty: 'dermatologist', day: 'monday', time: '09:30', doctor: 'Dr. Novak' },
  { specialty: 'therapist', day: 'monday', time: '08:15', doctor: 'Dr. Petrov' },
  { specialty: 'therapist', day: 'wednesday', time: '17:00', doctor: 'Dr. Petrov' },
];

function canonDrug(word) {
  const w = word.toLowerCase();
  return DRUGS[w] ? w : DRUG_ALIASES[w] || null;
}
function findDrugs(text) {
  const out = [];
  for (const w of String(text).toLowerCase().match(/[a-z]+/g) || []) {
    const d = canonDrug(w);
    if (d && !out.includes(d)) out.push(d);
  }
  return out;
}

/* ---------- the tools (what an MCP server would expose) ---------- */
const TOOLS = [
  {
    name: 'get_drug_info',
    description: 'Look up what a drug is used for and its key safety notes.',
    keywords: ['what is', 'used for', 'info', 'about', 'side effect', 'tell me', 'explain', 'drug', 'medicine', 'pill'],
    schema: { type: 'object', properties: { drug: { type: 'string', description: 'generic drug name' } }, required: ['drug'] },
    extract: q => { const d = findDrugs(q); return d.length ? { drug: d[0] } : {}; },
    run: ({ drug }) => {
      const d = DRUGS[canonDrug(drug) || ''];
      if (!d) return { error: `unknown drug "${drug}"` };
      return { drug: canonDrug(drug), class: d.cls, used_for: d.use, safety: d.note };
    },
  },
  {
    name: 'check_interaction',
    description: 'Check whether two drugs interact and how severe the interaction is.',
    keywords: ['interact', 'together', 'with', 'combine', 'mix', 'safe', 'and', 'same time', 'while on', 'while taking'],
    schema: {
      type: 'object',
      properties: { drug_a: { type: 'string' }, drug_b: { type: 'string' } },
      required: ['drug_a', 'drug_b'],
    },
    extract: q => { const d = findDrugs(q); const a = {}; if (d[0]) a.drug_a = d[0]; if (d[1]) a.drug_b = d[1]; return a; },
    run: ({ drug_a, drug_b }) => {
      const a = canonDrug(drug_a || ''), b = canonDrug(drug_b || '');
      if (!a || !b) return { error: 'both drugs must be known generic names' };
      const hit = INTERACTIONS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
      return hit ? { pair: [a, b], severity: hit[2], detail: hit[3] }
                 : { pair: [a, b], severity: 'none known', detail: 'No interaction in this (small) database.' };
    },
  },
  {
    name: 'calculate_bmi',
    description: 'Compute body-mass index from weight in kg and height in cm.',
    keywords: ['bmi', 'body mass', 'weigh', 'weight', 'tall', 'height', 'kg', 'cm', 'overweight', 'obese'],
    schema: {
      type: 'object',
      properties: { weight_kg: { type: 'number' }, height_cm: { type: 'number' } },
      required: ['weight_kg', 'height_cm'],
    },
    extract: q => {
      const a = {};
      const w = q.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/i);
      const h = q.match(/(\d+(?:[.,]\d+)?)\s*cm/i) || q.match(/(\d[.,]\d{1,2})\s*m\b/i);
      if (w) a.weight_kg = parseFloat(w[1].replace(',', '.'));
      if (h) { let v = parseFloat(h[1].replace(',', '.')); if (v < 3) v *= 100; a.height_cm = v; }
      return a;
    },
    run: ({ weight_kg, height_cm }) => {
      if (!(weight_kg > 0 && height_cm > 0)) return { error: 'weight_kg and height_cm must be positive numbers' };
      const bmi = weight_kg / Math.pow(height_cm / 100, 2);
      const category = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese';
      return { bmi: +bmi.toFixed(1), category, scale: 'WHO adult categories' };
    },
  },
  {
    name: 'find_appointment',
    description: 'Find free appointment slots for a medical specialty, optionally on a given weekday.',
    keywords: ['book', 'appointment', 'slot', 'schedule', 'see a', 'visit', 'doctor', 'available', 'free', 'earliest'],
    schema: {
      type: 'object',
      properties: { specialty: { type: 'string', enum: Object.keys(SPECIALTIES) }, day: { type: 'string', enum: DAYS } },
      required: ['specialty'],
    },
    extract: q => {
      const t = q.toLowerCase(), a = {};
      for (const [s, kws] of Object.entries(SPECIALTIES)) if (kws.some(k => t.includes(k))) { a.specialty = s; break; }
      const d = DAYS.find(x => t.includes(x));
      if (d) a.day = d;
      return a;
    },
    run: ({ specialty, day }) => {
      if (!SPECIALTIES[specialty]) return { error: `unknown specialty "${specialty}"` };
      const slots = SLOTS.filter(s => s.specialty === specialty && (!day || s.day === day))
        .map(({ day, time, doctor }) => ({ day, time, doctor }));
      return { specialty, day: day || 'any', slots };
    },
  },
];
const TOOL = Object.fromEntries(TOOLS.map(t => [t.name, t]));
