// Med Math answer-key tests. Loaded by tools/test.html; tools/test.py runs it in headless Chrome.
// 1. the fixed cases from the spec, exactly
// 2. 1,000 random problems per topic with the default settings (and 400 more per topic with two
//    other settings profiles), each worked out twice: the fraction train (topics.js, exact) and the
//    plain formulas (formulas.js, ordinary numbers). They must agree, the units must cancel to the
//    answer's unit, the numbers the formulas used must all be printed in the problem, and the key
//    must be accepted by the answer checker.
// 3. small checks of rounding, number writing, the train's cancelling and the answer reader.
import { Q } from '../app/js/frac.js';
import { fmt, fmtClock } from '../app/js/fmt.js';
import { car, load, solve } from '../app/js/train.js';
import { TOPICS, buildProblem, generateProblem, seeded } from '../app/js/topics.js';
import { byFormula, roundDp } from '../app/js/formulas.js';
import { judge, parseNumber, parseClock } from '../app/js/answer.js';
import { DEFAULT_SETTINGS } from '../app/js/rules.js';

const failures = [];
const log = [];
let checks = 0;
function ok(cond, what) {
  checks++;
  if (!cond) failures.push(what);
  return cond;
}
const eqNum = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

// The key as a plain number string, for comparing with the formula answer.
const keyNumber = (p) => (p.answer.type === 'number' ? Number(p.answer.key.toFixedString(9)) : p.answer.key);

// ---------- 1. fixed cases ----------
const D = DEFAULT_SETTINGS;
const FIXED = [
  { name: '500 mg ordered, 250 mg/5 mL on hand → 10 mL', topic: 'liquids',
    g: { drug: 'amoxicillin', form: 'oral suspension', order: { v: 500, u: 'mg' }, have: { v: 250, u: 'mg' }, per: { v: 5, u: 'mL' }, route: 'PO', how: 'every 8 hours' },
    key: '10', right: ['10', '10.0', '10 mL'], wrong: ['5', '100'] },
  { name: '0.125 mg ordered, 0.25 mg tablets → 0.5 tablet', topic: 'tablets',
    g: { drug: 'digoxin', form: 'tab', order: { v: 0.125, u: 'mg' }, have: { v: 0.25, u: 'mg' }, how: 'PO daily' },
    key: '0.5', right: ['0.5', '.5', '1/2', '½', '0.50'], wrong: ['2', '0.25', '0.4'] },
  { name: '75 mg ordered, 50 mg/mL → 1.5 mL', topic: 'injections',
    g: { drug: 'meperidine', order: { v: 75, u: 'mg' }, have: { v: 50, u: 'mg' }, per: { v: 1, u: 'mL' }, route: 'IM', how: 'once' },
    key: '1.5', right: ['1.5', '1.50 mL'], wrong: ['0.67', '1.4'] },
  { name: '0.3 mg ordered, 0.5 mg/mL → 0.6 mL', topic: 'injections',
    g: { drug: 'medication', order: { v: 0.3, u: 'mg' }, have: { v: 0.5, u: 'mg' }, per: { v: 1, u: 'mL' }, route: 'IM', how: 'once' },
    key: '0.6', right: ['0.6', '.6', '0.60'], wrong: ['1.67', '0.06'] },
  { name: '1,000 mL over 8 h on a pump → 125 mL/h', topic: 'pump',
    g: { kind: 'vt', fluid: 'D5W', vol: 1000, t: { v: 8, u: 'h' } },
    key: '125', right: ['125', '125.0'], wrong: ['8', '31'] },
  { name: '1,000 mL over 8 h, drop factor 15 → 31.25 → 31 gtt/min', topic: 'drip',
    g: { kind: 'vt', fluid: 'D5W', vol: 1000, t: { v: 8, u: 'h' }, df: 15 },
    key: '31', exact: '31.25', say: ['31.25', '31 gtt/min'], right: ['31'], wrong: ['31.25', '32', '30'] },
  { name: '100 mL over 30 min, drop factor 20 → 66.7 → 67 gtt/min', topic: 'drip',
    g: { kind: 'vt', fluid: '0.9% sodium chloride', vol: 100, t: { v: 30, u: 'min' }, df: 20 },
    key: '67', exactFrac: [200, 3], say: ['66.7', '67 gtt/min'], right: ['67'], wrong: ['66.7', '66', '66.67'] },
  { name: 'child 44 lb → 20 kg; 20 mg/kg/day divided every 8 h → 400 mg/day → 133.3 mg per dose', topic: 'weight',
    g: { drug: 'amoxicillin', mode: 'day', per: 20, every: 8, route: 'PO', w: { v: 44, u: 'lb' }, ask: 'mg', c: { have: 250, per: 5 } },
    key: '133.3', facts: { kg: '20', daily: '400' }, mid: { kg: 20, daily: 400 }, right: ['133.3', '133.33'], wrong: ['133', '400', '133.4'] },
  { name: 'heparin 25,000 units in 250 mL (100 units/mL), 1,000 units/h → 10 mL/h', topic: 'heparin',
    g: { kind: 'toRate', bag: [25000, 250], order: 1000 },
    key: '10', facts: { perMl: '100' }, mid: { perMl: 100 }, right: ['10'], wrong: ['100', '1'] },
  { name: 'dopamine 400 mg in 250 mL (1,600 mcg/mL), 5 mcg/kg/min for 80 kg → 400 mcg/min → 15 mL/h', topic: 'titration',
    g: { drug: 'dopamine', bag: [400, 250], perKg: true, fluid: 'D5W', vial: false, kind: 'toRate', dose: 5, w: { v: 80, u: 'kg' } },
    key: '15', facts: { conc: '1600', perMin: '400' }, mid: { conc: 1600, perMin: 400 }, right: ['15', '15.0'], wrong: ['0.25', '25'] },
  { name: 'BSA (Mosteller) 165 cm, 60 kg → 1.66 m²', topic: 'bsa',
    g: { cm: 165, kg: 60, ask: 'bsa' },
    key: '1.66', mid: { bsa: 1.66 }, right: ['1.66', '1.658', '1.66 m²'], wrong: ['1.65', '1.7', '2.75'] },
];

for (const f of FIXED) {
  const where = `fixed: ${f.name}`;
  let p;
  try { p = buildProblem(f.topic, f.g, D); } catch (e) { ok(false, `${where}: build threw ${e.message}`); continue; }
  const key = p.answer.key;
  ok(key.eq(Q.of(f.key)), `${where}: key is ${fmt(key)}, want ${f.key}`);
  if (f.exact) ok(p.answer.exact.eq(Q.of(f.exact)), `${where}: unrounded is ${p.answer.exact}, want ${f.exact}`);
  if (f.exactFrac) ok(p.answer.exact.eq(new Q(BigInt(f.exactFrac[0]), BigInt(f.exactFrac[1]))), `${where}: unrounded is ${p.answer.exact}`);
  for (const [k, v] of Object.entries(f.facts || {})) ok(p.facts[k] && p.facts[k].eq(Q.of(v)), `${where}: fact ${k} is ${p.facts[k]}, want ${v}`);
  const text = p.steps.map((s) => s.say).join(' ');
  for (const bit of f.say || []) ok(text.includes(bit), `${where}: the worked steps should say "${bit}"`);
  const fx = byFormula(f.topic, f.g, D);
  ok(eqNum(fx.value, Number(f.key)), `${where}: formula way gives ${fx.value}, want ${f.key}`);
  for (const [k, v] of Object.entries(f.mid || {})) ok(fx.mid && eqNum(fx.mid[k], v), `${where}: formula ${k} is ${fx.mid && fx.mid[k]}, want ${v}`);
  for (const r of f.right) ok(judge(p, r, D).state === 'right', `${where}: "${r}" should count as right`);
  for (const w of f.wrong) ok(judge(p, w, D).state === 'wrong', `${where}: "${w}" should count as wrong (got ${judge(p, w, D).state})`);
  log.push(`fixed ✓ ${f.name}`);
}

// ---------- 2. random problems, both ways ----------
const PROFILES = [
  { name: 'default', n: 1000, s: { ...DEFAULT_SETTINGS } },
  { name: 'tenths, whole pump, kg hundredths, 2.2046, 12-hour', n: 400, s: { ...DEFAULT_SETTINGS, volume: 'tenths', pump: 'whole', kg: 'hundredths', lbPerKg: '2.2046', clock: '12' } },
  { name: 'hundredths, 2.2046', n: 400, s: { ...DEFAULT_SETTINGS, volume: 'hundredths', lbPerKg: '2.2046' } },
];

function textOf(p) { return [...p.lines.map((l) => `${l.label}: ${l.text}`), p.ask].join('\n'); }
function shows(text, x) {
  const t = fmt(Q.of(x));
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\d.,])${esc}(?![\\d]|[.,]\\d)`).test(text);
}
const BOUNDS = {
  tablets: (p) => p.answer.exact.eq(p.answer.key) && p.answer.key.ge('0.5') && p.answer.key.le(3),
  liquids: (p) => p.answer.exact.ge('0.5') && p.answer.exact.le(30),
  injections: (p) => p.answer.exact.ge('0.1') && p.answer.exact.le(5),
  weight: (p) => (p.answer.unit === 'mL' ? p.answer.key.ge('0.2') && p.answer.key.le(30) : p.answer.key.ge(1)),
  recon: (p) => (p.answer.unit === 'mL' ? p.answer.key.ge('0.2') && p.answer.key.le(10) : p.answer.key.gt(0)),
  pump: (p) => p.answer.key.ge(2) && p.answer.key.le(999),
  drip: (p) => p.answer.key.ge(5) && p.answer.key.le(100),
  time: (p) => p.answer.exactMinutes.isInt() && p.answer.exactMinutes.ge(20) && p.answer.exactMinutes.le(1440),
  heparin: (p) => p.answer.key.gt(0),
  titration: (p) => p.answer.key.gt(0) && p.answer.key.le(200),
  bsa: (p) => p.answer.unit !== 'm²' || (p.answer.key.ge('0.2') && p.answer.key.le('3.2')),
  metric: (p) => p.answer.key.gt(0),
  household: (p) => p.answer.key.gt(0),
  safe: () => true,
};

const summary = [];
let seed = 20261020;
for (const prof of PROFILES) {
  for (const topic of TOPICS) {
    const row = { profile: prof.name, topic: topic.id, n: 0, agree: 0, unique: new Set(), errors: 0 };
    const verdicts = {};
    for (let i = 0; i < prof.n; i++) {
      const rng = seeded(seed++);
      const where = `${prof.name} / ${topic.id} #${i}`;
      let p;
      try { p = generateProblem(topic.id, rng, prof.s); } catch (e) { row.errors++; ok(false, `${where}: generate/build threw ${e.message}`); continue; }
      row.n++;
      row.unique.add(p.sig);
      let fx;
      try { fx = byFormula(topic.id, p.given, prof.s); } catch (e) { ok(false, `${where}: formula threw ${e.message}`); continue; }
      const mine = keyNumber(p);
      const agree = fx.type === p.answer.type && (typeof mine === 'number' ? eqNum(fx.value, mine) : fx.value === mine);
      if (ok(agree, `${where}: train says ${typeof mine === 'number' ? mine : mine}, formula says ${fx.value} — ${JSON.stringify(p.given)}`)) row.agree++;
      if (p.answer.type === 'choice') verdicts[p.answer.key] = (verdicts[p.answer.key] || 0) + 1;
      // every number the formulas used is printed in the problem
      const text = textOf(p);
      for (const x of fx.used) ok(shows(text, x), `${where}: the problem never shows ${x}:\n${text}`);
      if (p.answer.type === 'clock') ok(text.includes(fmtClock(p.given.start, prof.s.clock)), `${where}: start time not shown`);
      // nothing half-made in the words
      const words = text + ' ' + p.steps.map((s) => s.say).join(' ') + ' ' + (p.formula || '');
      ok(!/undefined|NaN|null|\[object/.test(words), `${where}: odd words: ${words.slice(0, 300)}`);
      // the key can be written properly, is realistic, and the checker accepts it
      if (p.answer.type === 'number') {
        let written = '';
        try { written = fmt(p.answer.key); } catch (e) { ok(false, `${where}: key can't be written: ${e.message}`); }
        ok(!/^\./.test(written) && !/\.\d*0$/.test(written), `${where}: badly written key ${written}`);
        ok(judge(p, written, prof.s).state === 'right', `${where}: the checker refuses its own key ${written}`);
        const off = p.answer.key.mul(10).add(1);
        ok(judge(p, fmt(off), prof.s).state === 'wrong', `${where}: the checker accepts a wrong answer ${fmt(off)}`);
        for (const st of p.steps) if (st.train && !st.train.root) {
          const s = solve(st.train.cars);
          ok(s.left.n.join() === [...st.train.want.n].join() || [...s.left.n].sort().join() === [...st.train.want.n].sort().join(), `${where}: leftover units`);
        }
      } else if (p.answer.type === 'clock') {
        ok(judge(p, fmtClock(p.answer.key, prof.s.clock), prof.s).state === 'right', `${where}: clock key refused`);
        ok(judge(p, fmtClock(p.answer.key + 1, prof.s.clock), prof.s).state === 'wrong', `${where}: clock off by 1 accepted`);
      } else if (p.answer.type === 'duration') {
        ok(judge(p, { h: Math.floor(p.answer.key / 60), m: p.answer.key % 60 }, prof.s).state === 'right', `${where}: duration key refused`);
      } else if (p.answer.type === 'choice') {
        ok(judge(p, p.answer.key, prof.s).state === 'right', `${where}: choice key refused`);
      }
      ok(BOUNDS[topic.id](p), `${where}: outside the realistic range — ${JSON.stringify(p.given)} → ${p.answer.key}`);
    }
    summary.push({ profile: prof.name, topic: topic.id, made: row.n, agree: row.agree, unique: row.unique.size, errors: row.errors, verdicts: Object.keys(verdicts).length ? verdicts : undefined });
  }
}

// ---------- 3. small checks ----------
const R = (x, step) => fmt(Q.of(x).roundTo(step));
ok(R('31.25', 1) === '31', 'round 31.25 → 31');
ok(fmt(new Q(200n, 3n).roundTo(1)) === '67', 'round 66.67 → 67');
ok(R('62.5', 1) === '63', 'round half up 62.5 → 63');
ok(R('1.005', '0.01') === '1.01', 'round 1.005 → 1.01');
ok(R('0.25', '0.5') === '0.5' && R('0.24', '0.5') === '0' && R('1.75', '0.5') === '2', 'nearest half');
ok(roundDp(1.005, 2) === 1.01 && roundDp(62.5, 0) === 63 && roundDp(0.125, 2) === 0.13 && roundDp(66.66666666666667, 1) === 66.7, 'formula rounding');
ok(fmt(Q.of('2.75').sqrtRoundTo('0.01')) === '1.66', 'sqrt 2.75 → 1.66');
ok(fmt(Q.of('2.25').sqrtRoundTo('0.01')) === '1.5', 'sqrt 2.25 → 1.5');
ok(fmt('0.5') === '0.5' && fmt(5) === '5' && fmt('10.0') === '10' && fmt(1000) === '1,000' && fmt(25000) === '25,000' && fmt('0.0025') === '0.0025' && fmt(1600) === '1,600', 'writing numbers');
const sv = solve([car(5, 'mL', 250, 'mg'), load(500, 'mg')]);
ok(sv.value.eq(10) && sv.left.n.join() === 'mL' && sv.left.d.length === 0 && sv.strikes.length === 1, 'train: mg cancels');
const sv2 = solve([car(15, 'gtt', 1, 'mL'), car(1000, 'mL', 8, 'h'), car(1, 'h', 60, 'min')]);
ok(sv2.value.eq('31.25') && sv2.left.n.join() === 'gtt' && sv2.left.d.join() === 'min' && sv2.strikes.length === 2, 'train: drip');
const pn = (s) => { const q = parseNumber(s); return q ? fmt(q.roundPlaces(6)) : null; };
ok(pn('.5') === '0.5' && pn('1/2') === '0.5' && pn('1 1/2') === '1.5' && pn('1½') === '1.5' && pn('1,000') === '1,000' && pn('10 mL') === '10' && pn('15 mL/h') === '15' && pn('2.') === '2', 'reading numbers');
ok(pn('abc') === null && pn('1/0') === null && pn('1e3') === null && pn('') === null, 'reading nonsense');
ok(parseClock('7:30').minutes === 450 && parseClock('0730').minutes === 450 && parseClock('19:30').minutes === 1170 && parseClock('7:30 pm').minutes === 1170 && parseClock('12:15 AM').minutes === 15 && parseClock('12:15 pm').minutes === 735 && parseClock('1930').minutes === 1170, 'reading clock times');
ok(parseClock('25:00') === null && parseClock('7:75') === null && parseClock('13:00 pm') === null, 'reading bad clock times');

const report = { ok: failures.length === 0, checks, failures: failures.slice(0, 60), failureCount: failures.length, summary, log };
window.__report = report;
render(report);

function render(r) {
  const el = document.getElementById('out');
  const rows = r.summary.map((s) => `<tr class="${s.agree === s.made && !s.errors ? '' : 'bad'}"><td>${s.profile}</td><td>${s.topic}</td><td>${s.made}</td><td>${s.agree}</td><td>${s.unique}</td><td>${s.errors}</td><td>${s.verdicts ? JSON.stringify(s.verdicts) : ''}</td></tr>`).join('');
  el.innerHTML = `<h1>${r.ok ? 'All checks passed' : `${r.failureCount} failed`}</h1>
    <p>${r.checks.toLocaleString()} checks.</p>
    ${r.failures.length ? `<pre class="bad">${r.failures.map((f) => f.replace(/</g, '&lt;')).join('\n\n')}</pre>` : ''}
    <h2>Fixed cases</h2><pre>${r.log.join('\n')}</pre>
    <h2>Random problems, both ways</h2>
    <table><tr><th>settings</th><th>topic</th><th>made</th><th>agree</th><th>different</th><th>errors</th><th>verdicts</th></tr>${rows}</table>`;
}
