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
import { readTTT, columnOf, expectedComp, hhExact, hhFloat, anionGap, correctedGap, pfRatio, gapIsHigh } from '../app/js/abg.js';
import * as MEMO from '../app/js/memo.js';
import { TOPIC } from '../app/js/topics.js';
import { TALK, KINDS } from '../app/js/talk.js';

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
const sameKey = (a, b) => (a && b && typeof a === 'object' ? a.d === b.d && a.c === b.c : a === b);
const hhPH = (hco3, paco2) => 6.1 + Math.log10(hco3 / (0.03 * paco2));

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

// ---------- 1b. fixed blood gas cases ----------
const ABG_FIXED = [
  [7.30, 50, 24, 'resp-acid', 'uncomp'], [7.48, 30, 24, 'resp-alk', 'uncomp'], [7.30, 40, 18, 'met-acid', 'uncomp'],
  [7.50, 40, 30, 'met-alk', 'uncomp'], [7.33, 30, 16, 'met-acid', 'partial'], [7.37, 55, 31, 'resp-acid', 'full'],
  [7.44, 30, 20, 'resp-alk', 'full'], [7.25, 60, 18, 'mixed-acid', 'none'], [7.40, 40, 24, 'normal', 'none'],
];
for (const [ph, paco2, hco3, d, c] of ABG_FIXED) {
  const where = `fixed ABG ${ph.toFixed(2)}/${paco2}/${hco3}`;
  let p;
  try { p = buildProblem('abg', { ph, paco2, hco3 }, D); } catch (e) { ok(false, `${where}: build threw ${e.message}`); continue; }
  ok(p.answer.key.d === d && p.answer.key.c === c, `${where}: read as ${p.answer.key.d}/${p.answer.key.c}, want ${d}/${c}`);
  const fx = byFormula('abg', { ph, paco2, hco3 }, D);
  ok(fx.value && fx.value.d === d && fx.value.c === c, `${where}: ROME way says ${JSON.stringify(fx.value)}`);
  ok(judge(p, { d, c: c === 'none' ? '' : c }, D).state === 'right', `${where}: the right reading counts`);
  ok(judge(p, { d: d === 'normal' ? 'resp-acid' : 'normal', c: 'uncomp' }, D).state === 'wrong', `${where}: a wrong reading doesn't`);
  if (c !== 'none') ok(judge(p, { d, c: c === 'full' ? 'partial' : 'full' }, D).state === 'wrong', `${where}: the wrong compensation doesn't count`);
  log.push(`fixed ✓ ${where} → ${d}${c === 'none' ? '' : ', ' + c}`);
}
{
  const p = buildProblem('hh', { hco3: 24, paco2: 40 }, D);
  ok(p.answer.key.eq('7.4') && p.answer.key.toFixedString(2) === '7.40', `fixed HH 24/40: key ${p.answer.key.toFixedString(2)}, want 7.40`);
  ok(eqNum(byFormula('hh', { hco3: 24, paco2: 40 }, D).value, 7.4), 'fixed HH 24/40: formula way gives 7.40');
  ok(judge(p, '7.40', D).state === 'right' && judge(p, '7.4', D).state === 'right' && judge(p, '7.401', D).state === 'right' && judge(p, '7.41', D).state === 'wrong', 'fixed HH 24/40: 7.40, 7.4 and 7.401 count, 7.41 does not');
  log.push('fixed ✓ Henderson-Hasselbalch HCO3 24, PaCO2 40 → 7.40');
  const w = buildProblem('comp', { kind: 'met-acid', ask: 'expected', hco3: 12 }, D);
  ok(w.answer.key.eq(26) && w.facts.lo.eq(24) && w.facts.hi.eq(28), `fixed Winters HCO3 12: ${fmt(w.answer.key)} (${fmt(w.facts.lo)}–${fmt(w.facts.hi)}), want 26 (24–28)`);
  ok(eqNum(byFormula('comp', { kind: 'met-acid', ask: 'expected', hco3: 12 }, D).value, 26), 'fixed Winters HCO3 12: formula way gives 26');
  log.push('fixed ✓ Winters’ formula HCO3 12 → 26 (24–28)');
  const g1 = buildProblem('gap', { kind: 'ag', na: 140, cl: 104, hco3: 12 }, D);
  const g2 = buildProblem('gap', { kind: 'high', na: 140, cl: 104, hco3: 12 }, D);
  ok(g1.answer.key.eq(24) && g2.answer.key === 'high', `fixed anion gap 140/104/12: ${fmt(g1.answer.key)}, ${g2.answer.key}; want 24, high`);
  ok(byFormula('gap', { kind: 'ag', na: 140, cl: 104, hco3: 12 }, D).value === 24 && byFormula('gap', { kind: 'high', na: 140, cl: 104, hco3: 12 }, D).value === 'high', 'fixed anion gap: formula way agrees');
  log.push('fixed ✓ Anion gap Na 140, Cl 104, HCO3 12 → 24 (high)');
  const c1 = buildProblem('gap', { kind: 'corr', na: 140, cl: 106, hco3: 24, alb: 2 }, D);
  ok(c1.answer.key.eq(15), `corrected gap 10 with albumin 2: ${fmt(c1.answer.key)}, want 15`);
  const pf = buildProblem('oxygen', { kind: 'pf', pao2: 80, fio2: 0.4, fio2As: '%' }, D);
  ok(pf.answer.key.eq(200) && judge(pf, '200', D).state === 'right', `P/F 80 on 40%: ${fmt(pf.answer.key)}, want 200`);
  const pf2 = buildProblem('oxygen', { kind: 'pf', pao2: 95, fio2: 0.21, fio2As: 'frac' }, D);
  ok(pf2.answer.key.eq(452) && byFormula('oxygen', { kind: 'pf', pao2: 95, fio2: 0.21, fio2As: 'frac' }, D).value === 452, `P/F 95 on room air: ${fmt(pf2.answer.key)}, want 452`);
  log.push('fixed ✓ P/F 80 ÷ 0.40 → 200, 95 ÷ 0.21 → 452; corrected gap 10 + 2.5 × 2 → 15');
}

// every combination on a grid, both ways of reading an ABG must agree (including "doesn't fit")
{
  let n = 0, agree = 0;
  for (let ph100 = 690; ph100 <= 775; ph100++) {
    const ph = ph100 / 100;
    for (let paco2 = 12; paco2 <= 95; paco2++) {
      for (let hco3 = 4; hco3 <= 52; hco3++) {
        n++;
        const a = readTTT({ ph, paco2, hco3 });
        const b = byFormula('abg', { ph, paco2, hco3 }, D).value;
        const same = (!a && !b) || (a && b && a.d === b.d && a.c === b.c);
        if (same) agree++;
        else if (agree + 20 > n) ok(false, `grid ${ph}/${paco2}/${hco3}: tic-tac-toe ${JSON.stringify(a && { d: a.d, c: a.c })}, ROME ${JSON.stringify(b)}`);
      }
    }
  }
  ok(agree === n, `ABG grid: ${agree} of ${n} combinations read the same both ways`);
  log.push(`grid ✓ ${n.toLocaleString()} pH/PaCO2/HCO3 combinations read the same by tic-tac-toe and by ROME`);
}

// the talk cards: one best answer each, every option explained, a model answer
for (const c of TALK) {
  const where = `talk card ${c.id}`;
  ok(c.options.length >= 3 && c.options.length <= 4, `${where}: 3 or 4 options`);
  ok(c.options.filter((o) => o.kind === 'best').length === 1, `${where}: exactly one best answer`);
  ok(new Set(c.options.map((o) => o.id)).size === c.options.length && new Set(c.options.map((o) => o.text)).size === c.options.length, `${where}: options are all different`);
  ok(c.options.every((o) => o.text && o.why && KINDS[o.kind]), `${where}: every option says why`);
  ok(c.model && c.model.length > 80 && c.scene && c.says && c.who, `${where}: has a scene and a model answer`);
}
log.push(`talk ✓ ${TALK.length} cards, each with one best answer and every option explained`);

// ---------- 1c. memorize it: every card, tile, blank and the speed round ----------
{
  const M = MEMO;
  // Read the numbers back out of the problem functions themselves, independently of the constants.
  const scan = (kind, from, to, step) => {
    const normal = [];
    for (let v = from; v <= to + 1e-9; v += step) { const x = Number(v.toFixed(2)); if (columnOf(kind, x) === 'normal') normal.push(x); }
    return [normal[0], normal[normal.length - 1]];
  };
  const [phLo, phHi] = scan('ph', 7.0, 7.8, 0.01), [cLo, cHi] = scan('paco2', 10, 100, 1), [hLo, hHi] = scan('hco3', 4, 50, 1);
  const E = (g) => expectedComp(g).toNumber();
  const wa = (E({ kind: 'met-acid', hco3: 20 }) - E({ kind: 'met-acid', hco3: 10 })) / 10, wb = E({ kind: 'met-acid', hco3: 10 }) - 10 * wa;
  const mk = (E({ kind: 'met-alk', hco3: 34 }) - E({ kind: 'met-alk', hco3: 24 })) / 10, m40 = E({ kind: 'met-alk', hco3: 24 });
  const ra1 = E({ kind: 'resp-acid', chronic: false, paco2: 50 }) - 24, ra2 = E({ kind: 'resp-acid', chronic: true, paco2: 50 }) - 24;
  const rk1 = 24 - E({ kind: 'resp-alk', chronic: false, paco2: 30 }), rk2 = 24 - E({ kind: 'resp-alk', chronic: true, paco2: 30 });
  const albK = correctedGap(10, 3).toNumber() - 10, albRef = (() => { for (let a = 2; a <= 6; a += 0.1) if (Math.abs(correctedGap(10, a).toNumber() - 10) < 1e-9) return Number(a.toFixed(1)); })();
  let gapHi = null; for (let g = 5; g <= 20; g++) if (!gapIsHigh(g) && gapIsHigh(g + 1)) gapHi = g;
  const f = (x) => String(Number(x.toFixed(4)));
  ok(phLo === 7.35 && phHi === 7.45 && cLo === 35 && cHi === 45 && hLo === 22 && hHi === 26, `memo: ranges read from the ABG reader are ${phLo}–${phHi}, ${cLo}–${cHi}, ${hLo}–${hHi}`);
  ok(wa === 1.5 && wb === 8 && mk === 0.7 && m40 === 40 && ra1 === 1 && ra2 === 3.5 && rk1 === 2 && rk2 === 4 && albK === 2.5 && albRef === 4 && gapHi === 12,
    `memo: rules read from the problem functions: Winters ${wa}/${wb}, alk ${mk}/${m40}, resp ${ra1}/${ra2}/${rk1}/${rk2}, albumin ${albK}/${albRef}, gap ${gapHi}`);
  ok(hhExact(24, 40).toFixedString(2) === '7.40' && anionGap(140, 104, 12).eq(24) && pfRatio(80, '0.4').eq(200), 'memo: the worked examples on the cards come out right');
  // every flashcard says what the problems use
  const MUST = {
    'r-ph': [phLo.toFixed(2), phHi.toFixed(2)], 'r-paco2': [f(cLo), f(cHi)], 'r-hco3': [f(hLo), f(hHi)], 'r-pao2': ['80', '100'], 'r-sao2': ['95', '100'],
    'r-gap': ['8', f(gapHi)], mid: ['7.40', '40', '24'], winters: [f(wa), f(wb), '±2'], metalk: [f(m40), f(mk), '24', '±2'],
    'ra-acute': [f(ra1)], 'ra-chronic': [f(ra2)], 'rk-acute': [f(rk1)], 'rk-chronic': [f(rk2)], hh: ['6.1', '0.03'], 'hh-pk': ['6.1'], 'hh-sol': ['0.03'],
    'gap-alb': [f(albK), f(albRef)], ratio: ['20'], gap: ['Na', 'Cl', 'HCO3'], pf: ['PaO2', 'FiO2'],
  };
  const ids = new Set();
  for (const c of M.FLASHCARDS) {
    ok(!ids.has(c.id) && c.front && c.back && M.TRICK[c.trick], `memo: flashcard ${c.id} is complete and links to a trick`);
    ids.add(c.id);
    for (const bit of MUST[c.id] || []) ok(c.back.includes(bit), `memo: flashcard ${c.id} should say ${bit}: “${c.back}”`);
  }
  ok(Object.keys(MUST).every((k) => ids.has(k)), 'memo: every checked flashcard exists');
  // the hh formula on its card agrees with the problems
  const hhCard = M.FLASHCARDS.find((c) => c.id === 'hh').back.match(/([\d.]+) \+ log\(HCO3 ÷ \(([\d.]+) × PaCO2\)\)/);
  ok(hhCard && [[24, 40], [12, 26], [31, 55], [7, 19]].every(([h, p]) => Math.abs(Number(hhCard[1]) + Math.log10(h / (Number(hhCard[2]) * p)) - hhExact(h, p).toNumber()) <= 0.0051), 'memo: the Henderson-Hasselbalch card matches the problems');
  // mnemonics spell themselves
  ok(M.MUDPILES.map(([l, w]) => (w[0] === l ? l : '?')).join('') === 'MUDPILES', 'memo: MUDPILES letters match their words');
  ok(M.GOLDMARK.map(([l, w]) => (w[0] === l || (l === 'L' && w.startsWith('L-')) || (l === 'D' && w.startsWith('D-')) ? l : '?')).join('') === 'GOLDMARK', 'memo: GOLDMARK letters match their words');
  // trick cards are complete, labeled, and their links go somewhere real
  for (const t of M.TRICKS) {
    ok(t.title && t.thing && t.trick && t.why && t.source && M.KIND_LABEL[t.kind], `memo: trick ${t.id} is complete and labeled`);
    for (const [, href] of t.practice) {
      const m = /^#\/(practice|memorize)\/([\w-]+)(?:\/([\w-]+))?$/.exec(href);
      ok(m && (m[1] === 'practice' ? !!TOPIC[m[2]] : ['cards', 'build', 'blanks', 'speed', 'dump', 'trick'].includes(m[2]) && (!m[3] || M.BUILD_BY[m[3]] || M.TRICK[m[3]])), `memo: trick ${t.id} links to ${href}`);
    }
  }
  // build the formula: the answer is right, at the sample values and at 200 more random ones, and no arrangement using a decoy passes
  const EXPECT_WAYS = { hh: 2, winters: 2, metalk: 1, gap: 2, albumin: 1, pf: 1 };
  const rng = seeded(4242);
  for (const b of M.BUILD) {
    ok(M.checkBuild(b, b.answer), `memo: build ${b.id}: the answer is accepted`);
    const T = M.TRUTH[b.id];
    let worst = 0;
    for (let k = 0; k < 200; k++) {
      const v = { HCO3: 5 + Math.round(rng() * 400) / 10, PaCO2: 15 + Math.round(rng() * 700) / 10, Na: 128 + Math.round(rng() * 22), Cl: 88 + Math.round(rng() * 28), K: 3 + rng() * 3,
        AG: 4 + Math.round(rng() * 30), albumin: 1.5 + Math.round(rng() * 30) / 10, PaO2: 40 + Math.round(rng() * 160), FiO2: [0.21, 0.3, 0.4, 0.5, 0.6, 1][Math.floor(rng() * 6)], SaO2: 90 };
      worst = Math.max(worst, Math.abs(M.evaluate(M.buildExpr(b, b.answer), v) - T.f(v)) / (T.tol > 1e-6 ? 1 : Math.max(1, Math.abs(T.f(v)))));
    }
    ok(worst <= T.tol, `memo: build ${b.id}: the tiles match the problem function everywhere (worst ${worst})`);
    const tiles = [...b.answer, ...b.decoys];
    const k = b.answer.length;
    let ways = 0, badWays = 0;
    const pickN = (chosen) => {
      if (chosen.length === k) {
        if (M.checkBuild(b, chosen)) { ways += 1; if (chosen.some((t) => b.decoys.includes(t))) badWays += 1; }
        return;
      }
      for (const t of tiles) if (!chosen.includes(t)) pickN([...chosen, t]);
    };
    pickN([]);
    ok(ways === EXPECT_WAYS[b.id] && badWays === 0, `memo: build ${b.id}: ${ways} arrangements pass (want ${EXPECT_WAYS[b.id]}), ${badWays} with a decoy`);
  }
  // fill the blank: the answers are what the problems use, and the checker is fair
  const CLOZE_EXPECT = {
    winters: ['HCO3', f(wb), '2'], 'winters-a': [f(wa)], hh: ['6.1', '0.03'], metalk: [f(m40), f(mk), '24'],
    'r-ph': [phLo.toFixed(2), phHi.toFixed(2)], 'r-paco2': [f(cLo), f(cHi)], 'r-hco3': [f(hLo), f(hHi)], 'r-o2': ['80', '100', '95', '100'],
    'resp-acid': [f(ra1), f(ra2)], 'resp-alk': [f(rk1), f(rk2)], gap: ['Na', 'Cl', 'HCO3'], 'gap-normal': ['8', f(gapHi)],
    albumin: [f(albK), f(albRef)], rome: ['opposite', 'equal'], ratio: ['20'], pf: ['PaO2', 'FiO2'],
  };
  for (const c of M.CLOZE) {
    const want = CLOZE_EXPECT[c.id];
    const answers = M.blanksOf(c).map((b) => b.answer);
    ok(want && JSON.stringify(answers) === JSON.stringify(want), `memo: blank ${c.id}: answers ${JSON.stringify(answers)}, want ${JSON.stringify(want)}`);
    ok(M.judgeCloze(c, answers).every(Boolean), `memo: blank ${c.id}: the right answers count`);
    ok(M.judgeCloze(c, answers.map((a, i) => (i === 0 ? (Number.isNaN(Number(a)) ? 'nope' : String(Number(a) + 1)) : a)))[0] === false, `memo: blank ${c.id}: a wrong first blank doesn't`);
    ok(!/undefined|NaN/.test(M.clozeText(c)) && M.TRICK[c.trick], `memo: blank ${c.id} reads properly`);
  }
  const g = M.CLOZE.find((c) => c.id === 'gap');
  ok(M.judgeCloze(g, ['sodium', 'bicarb', 'chloride']).every(Boolean) && !M.judgeCloze(g, ['Na', 'Cl', 'Cl']).every(Boolean), 'memo: the anion gap blanks take Cl and HCO3 in either order, but not twice');
  ok(M.judgeCloze(M.CLOZE.find((c) => c.id === 'metalk'), ['40', '.7', '24']).every(Boolean), 'memo: .7 counts as 0.7');
  // the speed round: right answers from the ABG reader's own function, and a separate check of the edges
  let speedOk = 0;
  const srng = seeded(99);
  for (let k = 0; k < 3000; k++) {
    const it = M.speedItem(srng);
    const indep = it.kind === 'ph' ? (it.value < phLo ? 'acid' : it.value > phHi ? 'base' : 'normal')
      : it.kind === 'paco2' ? (it.value > cHi ? 'acid' : it.value < cLo ? 'base' : 'normal')
        : (it.value < hLo ? 'acid' : it.value > hHi ? 'base' : 'normal');
    const edge = (it.kind === 'ph' ? [phLo, phHi] : it.kind === 'paco2' ? [cLo, cHi] : [hLo, hHi]).includes(it.value);
    if (it.answer === columnOf(it.kind, it.value) && it.answer === indep && !edge) speedOk++;
  }
  ok(speedOk === 3000, `memo: speed round: ${speedOk} of 3,000 values classed right, none on an edge`);
  // the rough check, over the range the card states, with the pH as it's written (two decimals)
  const shownWorst = {};
  for (let h = 3; h <= 30; h += 0.005) {
    const hh = Number(h.toFixed(3));
    const e = E({ kind: 'met-acid', hco3: hh });
    const shown = hhExact(hh, e).toNumber();
    const key = shown.toFixed(2);
    shownWorst[key] = Math.max(shownWorst[key] || 0, Math.abs(e - (shown - 7) * 100));
  }
  const inRange = Object.entries(shownWorst).filter(([k]) => Number(k) >= Number(M.ROUGH.from) && Number(k) <= Number(M.ROUGH.to));
  const worstShown = Math.max(...inRange.map(([, v]) => v));
  const worstAt = inRange.find(([, v]) => v === worstShown)[0];
  ok(Math.abs(worstShown - Number(M.ROUGH.worst)) <= 0.05 && Math.abs(Number(worstAt) - Number(M.ROUGH.worstAt)) <= 0.015, `memo: rough check: worst ${worstShown.toFixed(2)} at pH ${worstAt} over ${M.ROUGH.from}–${M.ROUGH.to}; the card says ${M.ROUGH.worst} around ${M.ROUGH.worstAt}`);
  ok(Math.abs(shownWorst[Number(M.ROUGH.lowPh).toFixed(2)] - Number(M.ROUGH.low)) <= 0.1 && Math.abs(shownWorst[Number(M.ROUGH.highPh).toFixed(2)] - Number(M.ROUGH.high)) <= 0.1,
    `memo: rough check drifts ${shownWorst[Number(M.ROUGH.lowPh).toFixed(2)].toFixed(2)} at ${M.ROUGH.lowPh} and ${shownWorst[Number(M.ROUGH.highPh).toFixed(2)].toFixed(2)} at ${M.ROUGH.highPh}, as the card says`);
  const ex = M.TRICK.rough.trick.match(/pH of (7\.\d\d) means a PaCO2 of about (\d+)/);
  ok(ex && shownWorst[ex[1]] <= 2, `memo: the rough check's own example (${ex && ex[1]}) is one where it works well (off by ${ex && shownWorst[ex[1]].toFixed(2)})`);
  const worstExact = worstShown;
  // the Leitner boxes
  let st = { box: 1, due: 0 };
  st = M.review(st, true, 100); const s2 = st.box === 2 && st.due === 102;
  st = M.review(st, true, 102); const s3 = st.box === 3 && st.due === 106;
  st = M.review(st, false, 106); const s1 = st.box === 1 && st.due === 106;
  let top = { box: 5, due: 0 }; top = M.review(top, true, 200);
  ok(s2 && s3 && s1 && top.box === 5 && top.due === 216, 'memo: Leitner: right moves up a box (2, 4, 8, 16 days), wrong goes back to box 1');
  const memo = { cards: Object.fromEntries(M.FLASHCARDS.slice(0, 5).map((c, i) => [c.id, { box: i + 1, due: 1000 + i }])) };
  ok(M.learnedCount(memo) === 3 && M.dueCards(memo, 1001).length === M.FLASHCARDS.length - 3, 'memo: learned and due counts');
  // the brain dump key
  ok(M.DUMP.every((d) => d.title && d.key.length) && M.DUMP.some((d) => d.key.join(' ').includes(`${f(wa)} × HCO3 + ${f(wb)}`)), 'memo: the brain dump key is complete');
  log.push(`memorize ✓ ${M.TRICKS.length} trick cards, ${M.FLASHCARDS.length} flashcards, ${M.BUILD.length} formulas to build, ${M.CLOZE.length} blanks, the speed round and the rough check (worst ${worstExact.toFixed(2)} mmHg over pH ${M.ROUGH.from}–${M.ROUGH.to})`);
}

// ---------- 2. random problems, both ways ----------
const PROFILES = [
  { name: 'default', n: 1000, s: { ...DEFAULT_SETTINGS } },
  { name: 'tenths, whole pump, kg hundredths, 2.2046, 12-hour', n: 400, s: { ...DEFAULT_SETTINGS, volume: 'tenths', pump: 'whole', kg: 'hundredths', lbPerKg: '2.2046', clock: '12' } },
  { name: 'hundredths, 2.2046', n: 400, s: { ...DEFAULT_SETTINGS, volume: 'hundredths', lbPerKg: '2.2046' } },
];

function textOf(p) { return [...p.lines.map((l) => `${l.label}: ${l.text}`), p.ask].join('\n'); }
function shows(text, x) {
  return [fmt(Q.of(x)), Q.of(x).toFixedString(2)].some((t) => {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\d.,])${esc}(?![\\d]|[.,]\\d)`).test(text);
  });
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
  abg: (p) => p.given.ph >= 6.95 && p.given.ph <= 7.7 && p.given.paco2 >= 12 && p.given.paco2 <= 95 && p.given.hco3 >= 4 && p.given.hco3 <= 50,
  oxygen: (p) => (p.answer.type === 'number' ? p.answer.key.ge(40) && p.answer.key.le(650) : p.given.pao2 >= 35 && p.given.pao2 <= 300),
  hh: (p) => p.answer.key.ge('6.95') && p.answer.key.le('7.7'),
  comp: (p) => (p.answer.type === 'number' ? p.answer.key.gt(8) && p.answer.key.lt(70) : p.given.ph >= 6.95 && p.given.ph <= 7.7),
  gap: (p) => p.facts.ag.ge(3) && p.facts.ag.le(40) && p.given.cl >= 85 && p.given.cl <= 120,
  talk: (p) => p.answer.options.length >= 3,
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
      const agree = fx.type === p.answer.type && (typeof mine === 'number' ? eqNum(fx.value, mine) : sameKey(mine, fx.value));
      if (ok(agree, `${where}: train says ${JSON.stringify(mine)}, formula says ${JSON.stringify(fx.value)} — ${JSON.stringify(p.given)}`)) row.agree++;
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
        const other = p.answer.options.find((o) => o.id !== p.answer.key);
        ok(judge(p, other.id, prof.s).state === 'wrong', `${where}: another choice accepted`);
      } else if (p.answer.type === 'abg') {
        const k = p.answer.key;
        ok(judge(p, { d: k.d, c: k.c === 'none' ? '' : k.c }, prof.s).state === 'right', `${where}: ABG key refused`);
        ok(judge(p, { d: k.d === 'normal' ? 'met-acid' : 'normal', c: 'partial' }, prof.s).state === 'wrong', `${where}: wrong ABG reading accepted`);
      }
      // a blood gas has to hang together: Henderson-Hasselbalch within 0.03 of the pH shown
      if (p.given.ph != null) ok(Math.abs(hhPH(p.given.hco3, p.given.paco2) - p.given.ph) <= 0.03, `${where}: implausible ABG ${JSON.stringify(p.given)} (HH gives ${hhPH(p.given.hco3, p.given.paco2).toFixed(3)})`);
      if (p.given.sao2 != null) ok(p.given.sao2 >= 70 && p.given.sao2 <= 100 && (p.given.pao2 >= 80 ? p.given.sao2 >= 95 : true), `${where}: SaO2 doesn't fit the PaO2`);
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
