// Blood gases: reading an ABG, oxygenation, Henderson-Hasselbalch, expected compensation, the anion
// gap, and "Talk it through". Same rules as the dosage topics: realistic numbers, exact working
// (frac.js), and formulas.js checks every answer a second, independent way.
import { Q } from './frac.js';
import { car, load } from './train.js';
import { fmt, fmtApprox } from './fmt.js';
import { pick, int, chance, steps, T } from './kit.js';
import { TALK, KINDS } from './talk.js';

// Every blood gas number Med Math uses, in one place. The problems, the flashcards, the tiles, the blanks
// and the speed round all read from here, so a memory trick can never disagree with a problem.
export const ABG = {
  ranges: { ph: ['7.35', '7.45'], paco2: ['35', '45'], hco3: ['22', '26'], pao2: ['80', '100'], sao2: ['95', '100'] },
  mid: { ph: '7.4', paco2: '40', hco3: '24' },
  hh: { pK: '6.1', sol: '0.03' },
  winters: { a: '1.5', b: '8', tol: '2' },
  metAlk: { base: '40', k: '0.7', ref: '24', tol: '2' },
  resp: { acidAcute: '1', acidChronic: '3.5', alkAcute: '2', alkChronic: '4', per: '10', tol: '2' },
  gap: { lo: '8', hi: '12', alb: '2.5', albRef: '4' },
};
const R = ABG.ranges;
export const RANGE_TEXT = [
  ['pH', `${R.ph[0]}–${R.ph[1]}`], ['PaCO2', `${R.paco2[0]}–${R.paco2[1]} mmHg`], ['HCO3', `${R.hco3[0]}–${R.hco3[1]} mEq/L`],
  ['PaO2', `${R.pao2[0]}–${R.pao2[1]} mmHg`], ['SaO2', `${R.sao2[0]}–${R.sao2[1]}%`],
];
export const VARY = 'Check with your instructor: methods and ranges vary slightly by program.';

const ph2 = (x) => Q.of(x).toFixedString(2); // pH is always written with two decimals

// ---------- reading an ABG: the tic-tac-toe way (formulas.js has the ROME way) ----------

// Which column of the tic-tac-toe grid a value goes in.
export function columnOf(kind, v) {
  const x = Q.of(v);
  if (kind === 'ph') return x.lt(R.ph[0]) ? 'acid' : x.gt(R.ph[1]) ? 'base' : 'normal';
  if (kind === 'paco2') return x.gt(R.paco2[1]) ? 'acid' : x.lt(R.paco2[0]) ? 'base' : 'normal'; // CO2 acts as an acid
  if (kind === 'hco3') return x.lt(R.hco3[0]) ? 'acid' : x.gt(R.hco3[1]) ? 'base' : 'normal'; // bicarbonate is a base
  throw new Error('columnOf ' + kind);
}

export const DISORDERS = [
  { id: 'normal', label: 'Normal' },
  { id: 'resp-acid', label: 'Respiratory acidosis' },
  { id: 'resp-alk', label: 'Respiratory alkalosis' },
  { id: 'met-acid', label: 'Metabolic acidosis' },
  { id: 'met-alk', label: 'Metabolic alkalosis' },
  { id: 'mixed-acid', label: 'Mixed respiratory and metabolic acidosis' },
  { id: 'mixed-alk', label: 'Mixed respiratory and metabolic alkalosis' },
];
export const COMPS = [
  { id: 'uncomp', label: 'Uncompensated' },
  { id: 'partial', label: 'Partially compensated' },
  { id: 'full', label: 'Fully compensated' },
];
export const NO_COMP = ['normal', 'mixed-acid', 'mixed-alk'];
export function abgLabel(key) {
  const d = DISORDERS.find((x) => x.id === key.d).label;
  if (NO_COMP.includes(key.d)) return d;
  return `${d}, ${COMPS.find((x) => x.id === key.c).label.toLowerCase()}`;
}

// Place the three numbers in the grid and read it. Returns null when they don't fit any pattern.
export function readTTT(v) {
  const cols = { ph: columnOf('ph', v.ph), paco2: columnOf('paco2', v.paco2), hco3: columnOf('hco3', v.hco3) };
  const kindOf = (k) => (k === 'paco2' ? 'resp' : 'met');
  const other = (k) => (k === 'paco2' ? 'hco3' : 'paco2');
  if (cols.ph !== 'normal') {
    const inLine = ['paco2', 'hco3'].filter((k) => cols[k] === cols.ph);
    const tag = cols.ph === 'acid' ? 'acid' : 'alk';
    if (inLine.length === 2) return { d: `mixed-${tag}`, c: 'none', cols, line: ['ph', 'paco2', 'hco3'] };
    if (inLine.length === 0) return null;
    const p = inLine[0], o = other(p);
    return { d: `${kindOf(p)}-${tag}`, c: cols[o] === 'normal' ? 'uncomp' : 'partial', cols, line: ['ph', p], primary: p, comp: o };
  }
  if (cols.paco2 === 'normal' && cols.hco3 === 'normal') return { d: 'normal', c: 'none', cols, line: [] };
  if (cols.paco2 === 'normal' || cols.hco3 === 'normal' || cols.paco2 === cols.hco3) return null;
  const x = Q.of(v.ph);
  if (x.eq('7.4')) return null;
  const side = x.lt('7.4') ? 'acid' : 'base';
  const p = cols.paco2 === side ? 'paco2' : 'hco3';
  return { d: `${kindOf(p)}-${side === 'acid' ? 'acid' : 'alk'}`, c: 'full', cols, line: ['ph', p], primary: p, comp: other(p), side };
}

const NAME = { ph: 'pH', paco2: 'PaCO2', hco3: 'HCO3' };
const WORD = { acid: 'Acid', normal: 'Normal', base: 'Base' };

// Henderson-Hasselbalch on ordinary numbers, only to pick realistic values (keys use frac.js).
export const hhFloat = (hco3, paco2) => Number(ABG.hh.pK) + Math.log10(hco3 / (Number(ABG.hh.sol) * paco2));
// Severinghaus (1979): SaO2 from PaO2, to make a plausible SaO2 to go with a PaO2.
export const satCurve = (po2) => 100 / (1 + 23400 / (po2 ** 3 + 150 * po2));
export const satFromPo2 = (po2) => Math.min(100, Math.round(satCurve(po2)));

const read = {
  id: 'abg',
  build(g) {
    const r = readTTT(g);
    if (!r) throw new Error(`This ABG doesn't fit a pattern: ${JSON.stringify(g)}`);
    const ph = ph2(g.ph);
    const lines = [];
    if (g.pao2) lines.push({ label: 'Patient', text: g.who });
    lines.push({ label: 'pH', text: ph }, { label: 'PaCO2', text: `${fmt(g.paco2)} mmHg` }, { label: 'HCO3', text: `${fmt(g.hco3)} mEq/L` });
    if (g.pao2) lines.push({ label: 'PaO2', text: `${fmt(g.pao2)} mmHg` }, { label: 'SaO2', text: `${g.sao2}%` });
    const st = [];
    const c = r.cols;
    if (c.ph === 'acid') st.push({ say: `Start with the pH. ${ph} is below 7.35, so the blood is too acidic: **acidosis**.` });
    else if (c.ph === 'base') st.push({ say: `Start with the pH. ${ph} is above 7.45, so the blood is too basic: **alkalosis**.` });
    else if (r.d === 'normal') st.push({ say: `Start with the pH. ${ph} is inside 7.35 to 7.45.` });
    else st.push({ say: `Start with the pH. ${ph} is inside 7.35 to 7.45, but both other numbers are out of range, which means the body has made up for something. So look at which side of 7.40 it’s on: ${ph} is on the **${r.side === 'acid' ? 'acid' : 'base (alkaline)'} side**.` });
    const co2Say = c.paco2 === 'acid' ? 'above 45, and carbon dioxide acts like an acid, so high CO2 pushes toward acidosis'
      : c.paco2 === 'base' ? 'below 35, and carbon dioxide acts like an acid, so low CO2 pushes toward alkalosis' : 'inside 35 to 45, so it isn’t pushing either way';
    const hco3Say = c.hco3 === 'acid' ? 'below 22, and bicarbonate is a base, so low HCO3 pushes toward acidosis'
      : c.hco3 === 'base' ? 'above 26, and bicarbonate is a base, so high HCO3 pushes toward alkalosis' : 'inside 22 to 26, so it isn’t pushing either way';
    st.push({ say: `PaCO2 ${fmt(g.paco2)} is ${co2Say}. HCO3 ${fmt(g.hco3)} is ${hco3Say}.` });
    let gridSay;
    if (r.d === 'normal') gridSay = 'Put each number in its column of the tic-tac-toe grid. All three are in the Normal column.';
    else if (r.d.startsWith('mixed')) gridSay = `Put each number in its column of the tic-tac-toe grid. All three land in the ${WORD[c.ph]} column: three in a row. Both the lungs and the metabolism are pushing the same way, so it’s **mixed**.`;
    else if (r.c === 'full') gridSay = `Put each number in its column of the tic-tac-toe grid. The pH sits in Normal, so use its side of 7.40: the ${NAME[r.primary]} is the one in the ${WORD[r.side]} column, so the cause is **${r.primary === 'paco2' ? 'respiratory' : 'metabolic'}**.`;
    else gridSay = `Put each number in its column of the tic-tac-toe grid. The pH and the ${NAME[r.primary]} line up in the ${WORD[c.ph]} column, so the cause is **${r.primary === 'paco2' ? 'respiratory' : 'metabolic'}**.`;
    st.push({ say: gridSay, fig: { kind: 'ttt', values: { ph, paco2: fmt(g.paco2), hco3: fmt(g.hco3) }, cols: c, line: r.line, comp: r.comp || null, side: r.side || null } });
    const arrow = (k) => (k === 'ph' ? (c.ph === 'acid' || r.side === 'acid' ? '↓' : '↑') : c[k] === 'normal' ? '–' : (k === 'paco2' ? (c[k] === 'acid' ? '↑' : '↓') : (c[k] === 'acid' ? '↓' : '↑')));
    let rome;
    if (r.d === 'normal') rome = 'Nothing is out of range, so there’s nothing for ROME to sort out.';
    else if (r.d.startsWith('mixed')) rome = `ROME says the same: the pH ${arrow('ph')} and PaCO2 ${arrow('paco2')} go opposite ways (respiratory), and the pH ${arrow('ph')} and HCO3 ${arrow('hco3')} go the same way (metabolic). Both at once means mixed.`;
    else if (r.primary === 'paco2') rome = `ROME (Respiratory Opposite, Metabolic Equal) agrees: the pH ${arrow('ph')} and the PaCO2 ${arrow('paco2')} go **opposite** ways, which is respiratory.`;
    else rome = `ROME (Respiratory Opposite, Metabolic Equal) agrees: the pH ${arrow('ph')} and the HCO3 ${arrow('hco3')} go the **same** way, which is metabolic.`;
    st.push({ say: rome });
    if (r.c === 'uncomp') st.push({ say: `The ${NAME[r.comp]} is still normal, so the body hasn’t started to make up for it yet: **uncompensated**.` });
    if (r.c === 'partial') st.push({ say: `The ${NAME[r.comp]} has moved the other way to make up for it, but the pH is still out of range: **partially compensated**.` });
    if (r.c === 'full') st.push({ say: `The ${NAME[r.comp]} has moved the other way and brought the pH back inside the normal range: **fully compensated**.` });
    const key = { d: r.d, c: r.c };
    st.push({ say: `So it’s **${abgLabel(key)}**.${g.pao2 ? ' The PaO2 and SaO2 are about oxygen, which is a separate question from the acid-base reading.' : ''}` });
    return {
      lines, ranges: true, note: VARY,
      ask: 'How would you read this blood gas?',
      answer: { type: 'abg', key, options: DISORDERS, comps: COMPS, noComp: NO_COMP },
      steps: st,
      formulaLabel: 'In one line',
      formula: `pH ${ph} (${c.ph === 'normal' ? (r.side ? `normal, ${r.side} side of 7.40` : 'normal') : c.ph}), PaCO2 ${fmt(g.paco2)} (${c.paco2}), HCO3 ${fmt(g.hco3)} (${c.hco3}) → ${abgLabel(key)}.`,
      facts: { d: r.d, c: r.c },
    };
  },
  generate(rng) {
    const PLANS = {
      'normal': [36, 44, 23, 25], 'resp-acid:uncomp': [48, 66, 23, 25], 'resp-acid:partial': [50, 85, 27, 34], 'resp-acid:full': [47, 70, 27, 42],
      'resp-alk:uncomp': [22, 33, 23, 25], 'resp-alk:partial': [18, 32, 15, 21], 'resp-alk:full': [22, 33, 14, 21],
      'met-acid:uncomp': [36, 44, 10, 20], 'met-acid:partial': [16, 33, 6, 18], 'met-acid:full': [20, 33, 12, 21],
      'met-alk:uncomp': [36, 44, 28, 40], 'met-alk:partial': [47, 60, 32, 48], 'met-alk:full': [47, 60, 28, 40],
      'mixed-acid': [48, 80, 12, 21], 'mixed-alk': [22, 33, 28, 40],
    };
    const want = pick(rng, Object.keys(PLANS));
    const [c1, c2, h1, h2] = PLANS[want];
    for (let tries = 0; tries < 400; tries++) {
      const paco2 = int(rng, c1, c2), hco3 = int(rng, h1, h2);
      if ([35, 45].includes(paco2) || [22, 26].includes(hco3)) continue;
      const raw = hhFloat(hco3, paco2) + pick(rng, [-0.01, 0, 0, 0.01]);
      const ph = Number(raw.toFixed(2));
      if (ph < 6.95 || ph > 7.7 || [7.35, 7.45, 7.4].includes(ph)) continue;
      const r = readTTT({ ph, paco2, hco3 });
      if (!r) continue;
      const got = NO_COMP.includes(r.d) ? r.d : `${r.d}:${r.c}`;
      if (got !== want) continue;
      const g = { ph, paco2, hco3 };
      if (chance(rng, 0.35)) {
        g.pao2 = int(rng, 55, 100);
        g.sao2 = satFromPo2(g.pao2);
        g.who = pick(rng, ['an adult breathing room air', 'an adult on 2 L/min oxygen by nasal cannula', 'an adult in the emergency department']);
      }
      return g;
    }
    return this.generate(rng);
  },
};

// ---------- oxygenation ----------

const OXY_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low (hypoxemia)' },
  { id: 'high', label: 'Higher than normal' },
];
const fio2Text = (g) => (Q.of(g.fio2).eq('0.21') ? (g.fio2As === '%' ? 'room air (21% oxygen)' : 'room air (FiO2 0.21)')
  : g.fio2As === '%' ? `${fmt(Q.of(g.fio2).mul(100))}% oxygen` : `FiO2 ${Q.of(g.fio2).toFixedString(2)}`);

const oxygen = {
  id: 'oxygen',
  build(g, s) {
    if (g.kind === 'class') {
      const x = Q.of(g.pao2);
      const key = x.lt(80) ? 'low' : x.gt(100) ? 'high' : 'normal';
      const say = key === 'low' ? `PaO2 ${fmt(g.pao2)} mmHg is below 80, so there’s less oxygen in the blood than there should be: **low (hypoxemia)**. The SaO2 of ${g.sao2}% agrees${g.sao2 < 95 ? ': it’s under 95%' : ''}.`
        : key === 'high' ? `PaO2 ${fmt(g.pao2)} mmHg is above 100: **higher than normal**. That usually means the patient is getting more oxygen than they need, which the team may turn down. The SaO2 can’t go over 100%, so it looks normal (${g.sao2}%).`
          : `PaO2 ${fmt(g.pao2)} mmHg is inside 80 to 100: **normal**, and the SaO2 of ${g.sao2}% is inside 95 to 100%.`;
      return {
        lines: [{ label: 'Patient', text: `breathing ${fio2Text(g)}` }, { label: 'PaO2', text: `${fmt(g.pao2)} mmHg` }, { label: 'SaO2', text: `${g.sao2}%` }],
        ranges: true, note: VARY,
        ask: 'How is the oxygenation?',
        answer: { type: 'choice', key, options: OXY_OPTIONS },
        steps: [
          { say: 'Oxygen is its own question, separate from the acid-base reading. Look at the PaO2 first, against 80 to 100 mmHg.', fig: { kind: 'range', min: 40, max: 140, lo: 80, hi: 100, mark: g.pao2, label: 'PaO2', unit: 'mmHg', band: 'normal' } },
          { say },
        ],
        formulaLabel: 'In one line',
        formula: `PaO2 ${fmt(g.pao2)} mmHg against 80–100, SaO2 ${g.sao2}% against 95–100% → ${OXY_OPTIONS.find((o) => o.id === key).label.toLowerCase()}.`,
        facts: { key },
      };
    }
    // the P/F ratio
    const t = T({ n: 'mmHg' }, [load(g.pao2, 'mmHg'), car(1, [], g.fio2, [])], 'whole', s, { engine: 'P/F' });
    t.unit = '';
    const pct = fmt(Q.of(g.fio2).mul(100));
    const st = [];
    if (g.fio2As === '%') st.push({ say: `FiO2 goes in as a fraction, not a percent: ${pct}% is ${pct} ÷ 100 = ${Q.of(g.fio2).toFixedString(2)}.` });
    st.push({ say: 'The P/F ratio is the PaO2 divided by the FiO2. As a train, the PaO2 rides with 1 over the FiO2.', train: t });
    const said = t.exact.eq(t.key) ? `That comes out even: **${fmt(t.key)}**.` : `That’s about ${fmtApprox(t.exact, 2).text}, rounded to a whole number: **${fmt(t.key)}**.`;
    st.push({ say: `${said} Breathing room air, a healthy P/F is roughly 400 to 500 (100 ÷ 0.21 is about 476). The lower it is, the harder oxygen is finding it to get from the lungs into the blood, and 300 or less is one of the criteria the Berlin definition uses for ARDS.` });
    return {
      lines: [{ label: 'PaO2', text: `${fmt(g.pao2)} mmHg` }, { label: 'Oxygen', text: fio2Text(g) }],
      ranges: true, note: VARY,
      ask: 'What is the P/F ratio (PaO2 ÷ FiO2)?',
      answer: { type: 'number', exact: t.exact, key: t.key, rule: 'whole', unit: '', alts: [], ruleText: 'to a whole number' },
      steps: st,
      formula: `P/F = ${fmt(g.pao2)} ÷ ${Q.of(g.fio2).toFixedString(2)} = ${fmt(t.key)}`,
      facts: { pf: t.key },
    };
  },
  generate(rng) {
    if (chance(rng, 0.45)) {
      for (;;) {
        const band = pick(rng, ['low', 'low', 'normal', 'high']);
        const pao2 = band === 'low' ? int(rng, 40, 76) : band === 'normal' ? int(rng, 82, 99) : int(rng, 105, 250);
        const fio2 = band === 'high' ? pick(rng, [0.4, 0.5, 0.6, 0.8, 1]) : pick(rng, [0.21, 0.21, 0.24, 0.28, 0.3]);
        return { kind: 'class', pao2, sao2: satFromPo2(pao2), fio2, fio2As: pick(rng, ['%', 'frac']) };
      }
    }
    const fio2 = pick(rng, [0.21, 0.24, 0.28, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 1]);
    const pao2 = int(rng, fio2 >= 0.5 ? 50 : 55, fio2 <= 0.3 ? 100 : 130);
    return { kind: 'pf', pao2, fio2, fio2As: pick(rng, ['%', 'frac']) };
  },
};

// ---------- Henderson-Hasselbalch ----------

export function hhExact(hco3, paco2) {
  return Q.of(hco3).div(Q.of(ABG.hh.sol).mul(paco2)).offsetLog10Round(ABG.hh.pK, 2);
}

const hh = {
  id: 'hh',
  build(g, s) {
    const tCO2 = T({ n: 'mmol/L' }, [car('0.03', 'mmol/L', 1, 'mmHg'), load(g.paco2, 'mmHg')], 'exact', s);
    const tRatio = T({ n: [], d: [] }, [load(g.hco3, 'mmol/L'), car(1, [], tCO2.exact, 'mmol/L')], 'exact', s, { engine: 'ratio' });
    tRatio.unit = '';
    const ratio = tRatio.exact.toNumber();
    const lg = Math.log10(ratio);
    const est = 6.1 + lg;
    const key = hhExact(g.hco3, g.paco2);
    const ratioText = fmtApprox(tRatio.exact, 2);
    return {
      lines: [{ label: 'HCO3', text: `${fmt(g.hco3)} mEq/L` }, { label: 'PaCO2', text: `${fmt(g.paco2)} mmHg` }],
      note: 'pH = 6.1 + log10(HCO3 ÷ (0.03 × PaCO2))',
      ask: 'Using Henderson-Hasselbalch, what is the pH?',
      answer: { type: 'number', exact: Q.of(est.toFixed(10)), key, rule: 'hundredths', unit: '', alts: [], ruleText: 'to hundredths', fixed: 2 },
      steps: [
        { say: 'First turn the PaCO2 into dissolved carbon dioxide: 0.03 mmol/L for every mmHg. (HCO3 in mEq/L is the same number as mmol/L, because it carries one charge.)', train: tCO2 },
        { say: 'Then the ratio of bicarbonate to dissolved carbon dioxide. The units cancel completely, which is why the ratio has none.', train: tRatio },
        { say: `Now the log: log10(${ratioText.text}) ≈ ${lg.toFixed(4)}, and 6.1 + ${lg.toFixed(4)} ≈ ${est.toFixed(4)}. pH is written to two decimal places: **${key.toFixedString(2)}**. A ratio of 20 to 1 is what gives the normal 7.40, so a ratio ${ratio < 20 ? 'under 20 means more acidic' : ratio > 20 ? 'over 20 means more basic' : 'of exactly 20 is right in the middle'}.` },
      ],
      formula: `pH = 6.1 + log10(${fmt(g.hco3)} ÷ (0.03 × ${fmt(g.paco2)})) = 6.1 + log10(${ratioText.approx ? '≈ ' : ''}${ratioText.text}) = ${key.toFixedString(2)}`,
      facts: { ratio: tRatio.exact },
    };
  },
  generate(rng) {
    for (;;) {
      const near = chance(rng, 0.35);
      const hco3 = near ? int(rng, 18, 32) : int(rng, 8, 45);
      const paco2 = near ? int(rng, 30, 52) : int(rng, 18, 90);
      const est = hhFloat(hco3, paco2);
      if (est < 6.95 || est > 7.7) continue;
      const f = est * 100 - Math.floor(est * 100);
      if (Math.abs(f - 0.5) < 1e-6) continue; // never right on a rounding edge
      return { hco3, paco2 };
    }
  },
};

// ---------- expected compensation ----------

const COMP_RULES = {
  'met-acid': { what: 'PaCO2', unit: 'mmHg', name: 'metabolic acidosis', rule: 'Winters’ formula: expected PaCO2 = 1.5 × HCO3 + 8, ±2' },
  'met-alk': { what: 'PaCO2', unit: 'mmHg', name: 'metabolic alkalosis', rule: 'expected PaCO2 = 40 + 0.7 × (HCO3 − 24), ±2' },
  'resp-acid': { what: 'HCO3', unit: 'mEq/L', name: 'respiratory acidosis', rule: 'HCO3 rises about 1 (acute) or 3.5 (chronic) for every 10 mmHg the PaCO2 is above 40' },
  'resp-alk': { what: 'HCO3', unit: 'mEq/L', name: 'respiratory alkalosis', rule: 'HCO3 falls about 2 (acute) or 4 (chronic) for every 10 mmHg the PaCO2 is below 40' },
};
export function expectedComp(g) {
  const { winters: W, metAlk: M, resp: P, mid } = ABG;
  if (g.kind === 'met-acid') return Q.of(W.a).mul(g.hco3).add(W.b);
  if (g.kind === 'met-alk') return Q.of(M.base).add(Q.of(M.k).mul(Q.of(g.hco3).sub(M.ref)));
  if (g.kind === 'resp-acid') return Q.of(mid.hco3).add(Q.of(g.chronic ? P.acidChronic : P.acidAcute).mul(Q.of(g.paco2).sub(mid.paco2)).div(P.per));
  return Q.of(mid.hco3).sub(Q.of(g.chronic ? P.alkChronic : P.alkAcute).mul(Q.of(mid.paco2).sub(g.paco2)).div(P.per));
}
// The anion gap, the albumin-corrected gap and the P/F ratio, exactly.
export function anionGap(na, cl, hco3) { return Q.of(na).sub(Q.of(cl).add(hco3)); }
export function correctedGap(ag, alb) { return Q.of(ag).add(Q.of(ABG.gap.alb).mul(Q.of(ABG.gap.albRef).sub(alb))); }
export function pfRatio(pao2, fio2) { return Q.of(pao2).div(fio2); }
export function gapIsHigh(ag) { return Q.of(ag).gt(ABG.gap.hi);
}
const SECOND = {
  met: [
    { id: 'none', label: 'No, it’s compensating as expected' },
    { id: 'resp-acid', label: 'Yes, a respiratory acidosis too (PaCO2 higher than expected)' },
    { id: 'resp-alk', label: 'Yes, a respiratory alkalosis too (PaCO2 lower than expected)' },
  ],
  resp: [
    { id: 'none', label: 'No, it’s compensating as expected' },
    { id: 'met-acid', label: 'Yes, a metabolic acidosis too (HCO3 lower than expected)' },
    { id: 'met-alk', label: 'Yes, a metabolic alkalosis too (HCO3 higher than expected)' },
  ],
};

const comp = {
  id: 'comp',
  build(g, s) {
    const R = COMP_RULES[g.kind];
    const E = expectedComp(g);
    const lo = E.sub(2), hi = E.add(2);
    const met = g.kind.startsWith('met');
    const primary = `${g.chronic === true ? 'chronic ' : g.chronic === false ? 'acute ' : ''}${R.name}`;
    let arith;
    if (g.kind === 'met-acid') arith = `1.5 × ${fmt(g.hco3)} + 8 = ${fmt(Q.of('1.5').mul(g.hco3))} + 8 = ${fmt(E)}`;
    else if (g.kind === 'met-alk') arith = `40 + 0.7 × (${fmt(g.hco3)} − 24) = 40 + 0.7 × ${fmt(Q.of(g.hco3).sub(24))} = ${fmt(E)}`;
    else if (g.kind === 'resp-acid') arith = `the PaCO2 is ${fmt(Q.of(g.paco2).sub(40))} above 40, so ${g.chronic ? '3.5' : '1'} × ${fmt(Q.of(g.paco2).sub(40))} ÷ 10 = ${fmt(E.sub(24))}, and 24 + ${fmt(E.sub(24))} = ${fmt(E)}`;
    else arith = `the PaCO2 is ${fmt(Q.of(40).sub(g.paco2))} below 40, so ${g.chronic ? 4 : 2} × ${fmt(Q.of(40).sub(g.paco2))} ÷ 10 = ${fmt(Q.of(24).sub(E))}, and 24 − ${fmt(Q.of(24).sub(E))} = ${fmt(E)}`;
    const ruleWords = g.kind.startsWith('resp') ? (g.kind === 'resp-acid'
      ? `In ${g.chronic ? 'chronic' : 'acute'} respiratory acidosis, HCO3 rises ${g.chronic ? 'about 3.5' : 'about 1'} for every 10 mmHg the PaCO2 is above 40 (from a starting HCO3 of 24).`
      : `In ${g.chronic ? 'chronic' : 'acute'} respiratory alkalosis, HCO3 falls ${g.chronic ? 'about 4 (sources say 4 to 5)' : 'about 2'} for every 10 mmHg the PaCO2 is below 40 (from a starting HCO3 of 24).`)
      : g.kind === 'met-acid' ? 'In metabolic acidosis, Winters’ formula gives the PaCO2 the lungs should bring it to: 1.5 × HCO3 + 8, give or take 2.'
        : 'In metabolic alkalosis, the PaCO2 should rise by about 0.7 for every 1 that the HCO3 is above 24, from a starting PaCO2 of 40, give or take 2.';
    const lines = [{ label: 'Primary', text: primary }];
    if (g.ask === 'second') lines.push({ label: 'pH', text: ph2(g.ph) });
    if (met) { lines.push({ label: 'HCO3', text: `${fmt(g.hco3)} mEq/L` }); if (g.ask === 'second') lines.push({ label: 'PaCO2', text: `${fmt(g.paco2)} mmHg` }); }
    else { lines.push({ label: 'PaCO2', text: `${fmt(g.paco2)} mmHg` }); if (g.ask === 'second') lines.push({ label: 'HCO3', text: `${fmt(g.hco3)} mEq/L` }); }
    const st = [{ say: `${ruleWords} So the expected ${R.what} is: ${arith} ${R.unit}, and the range is ${fmt(lo)} to ${fmt(hi)}.` }];
    const common = { ranges: true, note: `Rules of thumb; sources differ a little on the numbers. ${VARY}`, formula: `${R.rule}. Here: ${fmt(E)} (${fmt(lo)}–${fmt(hi)}) ${R.unit}.`, facts: { expected: E, lo, hi } };
    if (g.ask === 'expected') {
      st[0].fig = { kind: 'range', min: Math.floor(lo.toNumber() - 10), max: Math.ceil(hi.toNumber() + 10), lo: lo.toNumber(), hi: hi.toNumber(), mid: E.toNumber(), label: `expected ${R.what}`, unit: R.unit, band: 'expected' };
      st.push({ say: `The answer is the middle of the range: **${fmt(E)} ${R.unit}**.` });
      return {
        ...common, lines,
        ask: `What ${R.what} would you expect${met && g.kind === 'met-acid' ? ' (Winters’ formula)' : ''}? Give the middle of the range.`,
        answer: { type: 'number', exact: E, key: E.roundTo('0.1'), rule: 'tenths', unit: R.unit, alts: [], ruleText: 'to tenths' },
        steps: st,
      };
    }
    const actual = Q.of(met ? g.paco2 : g.hco3);
    let key;
    if (actual.ge(lo) && actual.le(hi)) key = 'none';
    else if (met) key = actual.gt(hi) ? 'resp-acid' : 'resp-alk';
    else key = actual.lt(lo) ? 'met-acid' : 'met-alk';
    const options = met ? SECOND.met : SECOND.resp;
    st.push({ say: key === 'none' ? `The actual ${R.what} of ${fmt(actual)} is inside ${fmt(lo)} to ${fmt(hi)}, so the body is compensating as expected: **no second disorder**.`
      : `The actual ${R.what} of ${fmt(actual)} is ${actual.gt(hi) ? 'above' : 'below'} ${fmt(actual.gt(hi) ? hi : lo)}, so it’s more than compensation explains: **${options.find((o) => o.id === key).label.replace(/^Yes, /, '')}**.`,
    fig: { kind: 'range', min: Math.floor(Math.min(lo.toNumber(), actual.toNumber()) - 8), max: Math.ceil(Math.max(hi.toNumber(), actual.toNumber()) + 8), lo: lo.toNumber(), hi: hi.toNumber(), mid: E.toNumber(), mark: actual.toNumber(), label: R.what, unit: R.unit, band: 'expected' } });
    return {
      ...common, lines,
      ask: `Using the expected ${R.what} (±2), is there a second disorder?`,
      answer: { type: 'choice', key, options },
      steps: st,
      facts: { ...common.facts, key },
    };
  },
  generate(rng) {
    for (;;) {
      const kind = pick(rng, ['met-acid', 'met-acid', 'met-alk', 'resp-acid', 'resp-alk']);
      const g = { kind, ask: chance(rng, 0.45) ? 'expected' : 'second' };
      if (kind === 'met-acid') g.hco3 = int(rng, 6, 20);
      if (kind === 'met-alk') g.hco3 = int(rng, 30, 45);
      if (kind.startsWith('resp')) {
        g.chronic = chance(rng, 0.5);
        g.paco2 = kind === 'resp-acid' ? 2 * int(rng, 25, 40) : 2 * int(rng, 10, 16);
      }
      if (g.ask === 'expected') return g;
      const E = expectedComp(g).toNumber();
      const verdict = pick(rng, ['in', 'in', 'up', 'down']);
      const off = verdict === 'in' ? pick(rng, [-1, 0, 0, 1]) : (verdict === 'up' ? 1 : -1) * (4 + int(rng, 0, 8));
      const actual = Math.round(E + off);
      const d = actual - E;
      if (verdict === 'in' ? Math.abs(d) > 1 : Math.abs(d) < 3.5) continue; // stay clear of the ±2 edges
      if (kind.startsWith('met')) g.paco2 = actual; else g.hco3 = actual;
      if (g.paco2 < 12 || g.paco2 > 95 || g.hco3 < 4 || g.hco3 > 50) continue;
      const ph = Number(hhFloat(g.hco3, g.paco2).toFixed(2));
      // the pH has to fit the primary disorder that's named
      if (kind.endsWith('acid') ? !(ph < 7.35) : !(ph > 7.45)) continue;
      if (ph < 6.95 || ph > 7.7) continue;
      g.ph = ph;
      return g;
    }
  },
};

// ---------- anion gap ----------

const GAP_OPTIONS = [{ id: 'high', label: 'Yes, it’s high' }, { id: 'normal', label: 'No, it’s normal' }];
const gap = {
  id: 'gap',
  build(g, s) {
    const ag = anionGap(g.na, g.cl, g.hco3);
    const lines = [{ label: 'Na', text: `${fmt(g.na)} mEq/L` }, { label: 'Cl', text: `${fmt(g.cl)} mEq/L` }, { label: 'HCO3', text: `${fmt(g.hco3)} mEq/L` }];
    const fig = { kind: 'gap', na: g.na, cl: g.cl, hco3: g.hco3, ag: ag.toNumber() };
    const st = [{ say: `The anion gap is the sodium minus the chloride and bicarbonate: ${fmt(g.na)} − (${fmt(g.cl)} + ${fmt(g.hco3)}) = ${fmt(g.na)} − ${fmt(Q.of(g.cl).add(g.hco3))} = **${fmt(ag)} mEq/L**. It’s the part of the negative charges the usual lab panel doesn’t measure.`, fig }];
    const note = 'Normal is about 8 to 12 mEq/L, and labs vary.';
    const common = { note, formula: `AG = Na − (Cl + HCO3) = ${fmt(g.na)} − (${fmt(g.cl)} + ${fmt(g.hco3)}) = ${fmt(ag)} mEq/L`, facts: { ag } };
    if (g.kind === 'corr') {
      lines.push({ label: 'Albumin', text: `${fmt(g.alb)} g/dL` });
      const corr = correctedGap(ag, g.alb);
      st.push({ say: `Albumin carries negative charge too, so when it’s low the gap looks smaller than it really is. Add 2.5 for every 1 g/dL the albumin is below 4: 2.5 × (4 − ${fmt(g.alb)}) = ${fmt(Q.of('2.5').mul(Q.of(4).sub(g.alb)))}, and ${fmt(ag)} + ${fmt(Q.of('2.5').mul(Q.of(4).sub(g.alb)))} = **${fmt(corr)} mEq/L**.${ag.le(12) && corr.gt(12) ? ' The plain gap looked normal, but the corrected one is high.' : ''}` });
      return {
        ...common, lines, ask: 'What is the albumin-corrected anion gap?',
        answer: { type: 'number', exact: corr, key: corr.roundTo('0.1'), rule: 'tenths', unit: 'mEq/L', alts: [], ruleText: 'to tenths' },
        steps: st,
        formula: `${common.formula}; corrected = ${fmt(ag)} + 2.5 × (4 − ${fmt(g.alb)}) = ${fmt(corr)} mEq/L`,
        facts: { ag, corr },
      };
    }
    if (g.kind === 'high') {
      const key = gapIsHigh(ag) ? 'high' : 'normal';
      st.push({ say: key === 'high' ? `${fmt(ag)} is above about 12, so **yes, it’s high**. A high gap points to an extra acid in the blood that isn’t chloride, like lactate or ketones.` : `${fmt(ag)} is inside about 8 to 12, so **no, it’s normal**.` });
      return { ...common, lines, ask: 'Is the anion gap high?', answer: { type: 'choice', key, options: GAP_OPTIONS }, steps: st, facts: { ag, key } };
    }
    return {
      ...common, lines, ask: 'What is the anion gap?',
      answer: { type: 'number', exact: ag, key: ag, rule: 'whole', unit: 'mEq/L', alts: [], ruleText: 'to a whole number' },
      steps: st,
    };
  },
  generate(rng) {
    for (;;) {
      const kind = pick(rng, ['ag', 'ag', 'high', 'corr']);
      const na = int(rng, 132, 148);
      const hco3 = int(rng, 8, 30);
      const target = chance(rng, 0.45) ? int(rng, 9, 11) : int(rng, 15, 32);
      const cl = na - hco3 - target;
      if (cl < 88 || cl > 118) continue;
      const g = { kind, na, cl, hco3 };
      if (kind === 'corr') g.alb = pick(rng, steps(1.8, 3.8, 0.2));
      return g;
    }
  },
};

// ---------- talk it through ----------

const talk = {
  id: 'talk',
  build(g) {
    const card = TALK.find((c) => c.id === g.card);
    const opts = g.order.map((id) => card.options.find((o) => o.id === id));
    const best = card.options.find((o) => o.kind === 'best');
    return {
      lines: [{ label: 'Scene', text: card.scene }, { label: card.who, text: card.says }],
      note: 'Communication practice only. Follow your facility’s policies and your instructor.',
      ask: card.ask || 'What’s the best thing to say?',
      answer: { type: 'choice', key: best.id, options: opts.map((o) => ({ id: o.id, label: o.text, why: o.why, kind: KINDS[o.kind] })) },
      steps: [{ say: 'Why each one works, or doesn’t:', fig: { kind: 'talk', options: opts.map((o) => ({ text: o.text, why: o.why, kind: KINDS[o.kind], best: o.kind === 'best' })) } }],
      formulaLabel: 'A model answer',
      formula: card.model,
      facts: {},
    };
  },
  generate(rng) {
    const card = pick(rng, TALK);
    const order = card.options.map((o) => o.id);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return { card: card.id, order };
  },
};

// Which memory-trick card each problem's "Show me" links to.
const TRICK_FOR = {
  abg: () => 'tictactoe',
  oxygen: (g) => (g.kind === 'pf' ? 'pf' : 'oxygen'),
  hh: () => 'hh',
  comp: (g) => (g.kind === 'met-acid' ? 'winters' : g.kind === 'met-alk' ? 'metalk' : 'respcomp'),
  gap: (g) => (g.kind === 'corr' ? 'albumin' : 'gap'),
  talk: (g) => (g.card === 'allen-test' ? 'allen' : null),
};
const withTrick = (t) => ({ ...t, build(g, s) { const p = t.build.call(this, g, s); p.trick = TRICK_FOR[t.id](g); return p; } });

export const ABG_TOPICS = [
  { ...withTrick(read), name: 'Read the ABG', hint: 'ROME and tic-tac-toe' },
  { ...withTrick(oxygen), name: 'Oxygenation', hint: 'PaO2, SaO2 and P/F' },
  { ...withTrick(hh), name: 'The equation', hint: 'Henderson-Hasselbalch' },
  { ...withTrick(comp), name: 'Expected compensation', hint: 'is there a second disorder?' },
  { ...withTrick(gap), name: 'Anion gap', hint: 'and the albumin correction' },
  { ...withTrick(talk), name: 'Talk it through', hint: 'explaining it to patients' },
];
