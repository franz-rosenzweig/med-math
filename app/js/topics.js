// The fourteen topics. Each one picks numbers that make a realistic, clean problem, writes it like a
// real order, and works the answer out as a fraction train (exactly, see frac.js) with the rounding
// rule applied. formulas.js checks every answer a second way, with plain formulas.
import { Q } from './frac.js';
import { car, load, makeTrain, runTrain } from './train.js';
import { applyRule, ruleText, ruleStep, lbFactor, DEFAULT_SETTINGS } from './rules.js';
import { fmt, fmtApprox, fmtClock, fmtDuration, unitsText } from './fmt.js';

// ---------- small helpers ----------

export const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const chance = (rng, p) => rng() < p;
function steps(lo, hi, step) {
  const out = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) out.push(Number((lo + i * step).toFixed(6)));
  return out;
}
const placesOf = (x) => Q.of(x).places(8);
// An exact Q as a plain JS number (only for exact short decimals).
function num(x) {
  const v = Q.of(x);
  const p = v.places(8);
  if (p < 0) return null;
  return Number(v.toFixedString(p));
}
// Does this look like an amount someone would really order?
function niceDose(x) {
  if (x == null || !(x > 0)) return false;
  const p = placesOf(x);
  if (p < 0) return false;
  if (x >= 100) return p === 0;
  if (x >= 10) return p <= 1;
  if (x >= 1) return p <= 2;
  return p <= 3;
}

// …and is it a round number, the way doses are written (275 mg yes, 6.4 mg no)?
function roundDose(x) {
  if (!niceDose(x)) return false;
  const grid = x >= 100 ? 25 : x >= 20 ? 5 : x >= 5 ? 2.5 : x >= 2 ? 0.5 : x >= 0.2 ? 0.05 : 0.005;
  return Q.of(x).div(String(grid)).isInt();
}

const UNIT_WORD = { tab: ['tablet', 'tablets'], cap: ['capsule', 'capsules'] };
// "0.5 tablet", "2 tablets", "10 mL"
export function amountText(value, unit) {
  const w = UNIT_WORD[unit];
  const t = fmt(value);
  if (!w) return `${t} ${unit}`;
  return `${t} ${Q.of(value).gt(1) ? w[1] : w[0]}`;
}

// Build a train, multiply it out, and refuse to go on if the units don't cancel to what we want.
function T(want, cars, rule, s, extra = {}) {
  const train = makeTrain(want, cars, extra);
  const r = runTrain(train);
  if (!r.unitsOk) throw new Error(`Units don't cancel to ${unitsText(train.want.n, train.want.d)}`);
  train.exact = r.value;
  train.rule = rule || 'exact';
  train.key = rule ? applyRule(rule, r.value, s) : r.value;
  train.unit = unitsText(train.want.n, train.want.d);
  return train;
}

// Decimal places to show an unrounded value with: two more than the rounding step uses.
function showPlaces(rule, exact, s) {
  const step = ruleStep(rule, exact, s);
  return step ? step.places(4) + 1 : 4;
}
// "31.25 gtt/min, which rounds to whole drops: 31 gtt/min."
function roundingSay(exact, key, rule, s, unit) {
  const words = UNIT_WORD[unit];
  if (rule === 'exact' || exact.eq(key)) return `That comes out even: **${words ? amountText(key, unit) : `${fmt(key)} ${unit}`}**.`;
  const p = showPlaces(rule, exact, s);
  const a = exact.terminatesWithin(p + 1) ? { text: fmt(exact), approx: false } : fmtApprox(exact, p);
  return `That’s ${a.approx ? 'about ' : ''}${a.text} ${words ? words[1] : unit}, rounded ${ruleText(rule, exact, s)}: **${words ? amountText(key, unit) : `${fmt(key)} ${unit}`}**.`;
}

function numberAnswer({ exact, rule, unit, s, alts = [], sqrtOf = null }) {
  const key = sqrtOf ? sqrtOf.sqrtRoundTo(ruleStep(rule, Q.of(1), s)) : applyRule(rule, exact, s);
  const altKeys = [];
  for (const a of alts) {
    const k = applyRule(rule, a, s);
    if (!k.eq(key) && !altKeys.some((x) => x.eq(k))) altKeys.push(k);
  }
  return { type: 'number', exact, sqrtOf, key, rule, unit, alts: altKeys, ruleText: ruleText(rule, exact, s) };
}

// Mass and volume conversion cars that turn `from` into `to`, wanted unit first.
const MASS = { g: 0, mg: 1, mcg: 2 };
const MASS_NAMES = ['g', 'mg', 'mcg'];
export function convCars(from, to) {
  if (from === to) return [];
  const cars = [];
  if (from in MASS && to in MASS) {
    let cur = from;
    while (cur !== to) {
      const next = MASS[to] > MASS[cur] ? MASS_NAMES[MASS[cur] + 1] : MASS_NAMES[MASS[cur] - 1];
      cars.push(MASS[next] > MASS[cur] ? car(1000, next, 1, cur) : car(1, next, 1000, cur));
      cur = next;
    }
    return cars.reverse();
  }
  const pairs = { 'L>mL': car(1000, 'mL', 1, 'L'), 'mL>L': car(1, 'L', 1000, 'mL'), 'kg>g': car(1000, 'g', 1, 'kg'), 'g>kg': car(1, 'kg', 1000, 'g') };
  const c = pairs[`${from}>${to}`];
  if (!c) throw new Error(`No conversion from ${from} to ${to}`);
  return [c];
}
// How a unit change is said in words, for the steps.
function convSay(from, to) {
  if (from === to) return '';
  const facts = { 'g-mg': '1 g = 1,000 mg', 'mg-mcg': '1 mg = 1,000 mcg', 'g-mcg': '1 g = 1,000 mg and 1 mg = 1,000 mcg', 'L-mL': '1 L = 1,000 mL', 'kg-g': '1 kg = 1,000 g' };
  return facts[`${from}-${to}`] || facts[`${to}-${from}`] || '';
}

// The weight step: kg as given, or pounds turned into kg and rounded by the kg rule.
function weightStep(w, s) {
  if (w.u === 'kg') return { kg: Q.of(w.v), exactKg: Q.of(w.v), step: null };
  const F = lbFactor(s);
  const t = T({ n: 'kg' }, [car(1, 'kg', F, 'lb'), load(w.v, 'lb')], 'kg', s);
  return {
    kg: t.key, exactKg: t.exact,
    step: { say: `First the weight in kg. There are ${fmt(F)} lb in 1 kg. ${roundingSay(t.exact, t.key, 'kg', s, 'kg')}`, train: t },
  };
}
const weightText = (w) => `${fmt(w.v)} ${w.u}`;

const PRACTICE_NOTE = 'Practice numbers only, not real dosing.';

// ---------- 1. Metric conversions ----------

const metric = {
  id: 'metric',
  build(g, s) {
    const cars = [...convCars(g.from, g.to), load(g.v, g.from)];
    const t = T({ n: g.to }, cars, 'exact', s);
    let lines = [], ask;
    const big = MASS[g.from] < MASS[g.to] || (g.from === 'L') || (g.from === 'kg');
    if (g.ctx === 'order') {
      lines = [{ label: 'Order', text: `${g.drug} ${fmt(g.v)} ${g.from} ${g.how}` }];
      ask = `How many ${g.to} is that?`;
    } else if (g.ctx === 'newborn') {
      lines = [{ label: 'Patient', text: `a newborn who weighs ${fmt(g.v)} ${g.from}` }];
      ask = `What is the weight in ${g.to === 'g' ? 'grams' : 'kilograms'}?`;
    } else if (g.ctx === 'fluid') {
      lines = [{ label: 'Intake', text: `${fmt(g.v)} ${g.from} of fluid by mouth today` }];
      ask = `How many ${g.to} is that?`;
    } else {
      ask = `Convert ${fmt(g.v)} ${g.from} to ${g.to}.`;
    }
    const fact = convSay(g.from, g.to);
    return {
      lines, ask,
      answer: numberAnswer({ exact: t.exact, rule: 'exact', unit: g.to, s }),
      steps: [
        { say: `You want ${g.to}, so start with the fact that has ${g.to} on top (${fact}), then the amount you have.`, train: t },
        { say: big ? `Going from a bigger unit to a smaller one gives a bigger number: move the decimal point 3 places to the right for each step. **${fmt(t.exact)} ${g.to}**.`
                   : `Going from a smaller unit to a bigger one gives a smaller number: move the decimal point 3 places to the left for each step. **${fmt(t.exact)} ${g.to}**.` },
      ],
      formula: `${fmt(g.v)} ${g.from} ${big ? '×' : '÷'} ${g.from === 'g' && g.to === 'mcg' || g.from === 'mcg' && g.to === 'g' ? '1,000,000' : '1,000'} = ${fmt(t.exact)} ${g.to}`,
      facts: {},
    };
  },
  generate(rng, s) {
    const kind = pick(rng, ['g>mg', 'mg>g', 'mg>mcg', 'mcg>mg', 'L>mL', 'mL>L', 'kg>g', 'g>kg', 'g>mcg', 'mcg>g']);
    const [from, to] = kind.split('>');
    const pools = {
      'g>mg': [0.1, 0.125, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 1.2, 1.5, 2, 2.5, 3],
      'mg>g': [50, 100, 125, 200, 250, 300, 400, 500, 750, 1000, 1200, 1500, 2000, 2500],
      'mg>mcg': [0.025, 0.05, 0.075, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1.5],
      'mcg>mg': [25, 50, 75, 88, 100, 112, 125, 150, 175, 200, 250, 300, 400, 500, 600, 800],
      'L>mL': [0.25, 0.5, 0.75, 1, 1.2, 1.5, 2, 2.5, 3],
      'mL>L': [100, 150, 250, 500, 750, 900, 1200, 1500, 1800, 2000, 2400, 3000],
      'kg>g': [2.1, 2.45, 2.8, 3.05, 3.2, 3.4, 3.5, 3.65, 3.9, 4.1, 4.25],
      'g>kg': [1850, 2300, 2650, 2900, 3100, 3250, 3480, 3600, 3750, 4020, 4300],
      'g>mcg': [0.0001, 0.00025, 0.0004, 0.0005, 0.00075, 0.001, 0.002],
      'mcg>g': [100, 200, 250, 400, 500, 1000, 1500, 2000],
    };
    let v = pick(rng, pools[kind]);
    let ctx = 'plain', drug = null, how = null;
    const ORDERS = {
      'mcg>mg': [['levothyroxine', 'PO daily', [25, 50, 75, 88, 100, 112, 125, 150, 175]], ['cyanocobalamin', 'IM once a month', [100, 500, 1000]], ['fentanyl', 'IV once', [25, 50, 75, 100]], ['digoxin', 'PO daily', [62.5, 125, 250]]],
      'mg>mcg': [['digoxin', 'PO daily', [0.0625, 0.125, 0.25]], ['levothyroxine', 'PO daily', [0.025, 0.05, 0.075, 0.1, 0.125, 0.15]], ['clonidine', 'PO twice a day', [0.1, 0.2, 0.3]], ['naloxone', 'IV once', [0.04, 0.1, 0.4]]],
      'g>mg': [['cefazolin', 'IV every 8 hours', [1, 2]], ['ceftriaxone', 'IV daily', [1, 2]], ['vancomycin', 'IV every 12 hours', [0.75, 1, 1.25, 1.5]], ['amoxicillin', 'PO every 8 hours', [0.25, 0.5, 0.875]], ['acetaminophen', 'PO every 6 hours as needed', [0.325, 0.5, 0.65, 1]]],
      'mg>g': [['cefazolin', 'IV every 8 hours', [500, 1000, 2000]], ['ceftriaxone', 'IV daily', [500, 1000, 2000]], ['vancomycin', 'IV every 12 hours', [750, 1000, 1250, 1500]], ['metformin', 'PO twice a day', [500, 850, 1000]], ['amoxicillin', 'PO every 8 hours', [250, 500, 875]]],
    };
    if (ORDERS[kind] && chance(rng, 0.55)) {
      ctx = 'order';
      let list;
      [drug, how, list] = pick(rng, ORDERS[kind]);
      v = pick(rng, list);
    } else if (kind === 'kg>g' || kind === 'g>kg') ctx = 'newborn';
    else if ((kind === 'L>mL' || kind === 'mL>L') && chance(rng, 0.6)) ctx = 'fluid';
    return { v, from, to, ctx, drug, how };
  },
};

// ---------- 2. Household and weight conversions ----------

const HOUSE = { tsp: 5, tbsp: 15, oz: 30 };
const household = {
  id: 'household',
  build(g, s) {
    const F = lbFactor(s);
    let cars, rule = 'tenths', fact;
    const k = `${g.from}>${g.to}`;
    if (g.from in HOUSE) { cars = [car(HOUSE[g.from], 'mL', 1, g.from), load(g.v, g.from)]; fact = `1 ${g.from} = ${HOUSE[g.from]} mL`; }
    else if (g.to in HOUSE) { cars = [car(1, g.to, HOUSE[g.to], 'mL'), load(g.v, 'mL')]; fact = `1 ${g.to} = ${HOUSE[g.to]} mL`; }
    else if (k === 'lb>kg') { cars = [car(1, 'kg', F, 'lb'), load(g.v, 'lb')]; rule = 'kg'; fact = `1 kg = ${fmt(F)} lb`; }
    else if (k === 'kg>lb') { cars = [car(F, 'lb', 1, 'kg'), load(g.v, 'kg')]; fact = `1 kg = ${fmt(F)} lb`; }
    else if (k === 'in>cm') { cars = [car(2.54, 'cm', 1, 'in'), load(g.v, 'in')]; fact = '1 in = 2.54 cm'; }
    else if (k === 'cm>in') { cars = [car(1, 'in', 2.54, 'cm'), load(g.v, 'cm')]; fact = '1 in = 2.54 cm'; }
    else throw new Error('household: ' + k);
    const t = T({ n: g.to }, cars, rule, s);
    const unitName = { tsp: 'teaspoons', tbsp: 'tablespoons', oz: 'ounces', mL: 'mL', kg: 'kg', lb: 'lb', cm: 'cm', in: 'inches' };
    let lines = [], ask;
    if (g.from === 'tsp' || g.from === 'tbsp') {
      lines = [{ label: 'Order', text: `${g.drug} ${fmt(g.v)} ${g.from} PO ${g.how}` }];
      ask = 'How many mL is that?';
    } else if (g.from === 'oz') {
      lines = [{ label: 'Intake', text: `${fmt(g.v)} oz of ${g.drink}` }];
      ask = 'How many mL do you write down?';
    } else if (g.to in HOUSE) {
      lines = [{ label: 'Dose', text: `${fmt(g.v)} mL` }];
      ask = `How many ${unitName[g.to]} is that, to take at home?`;
    } else if (g.from === 'lb' || g.from === 'kg') {
      lines = [{ label: 'Patient', text: `weighs ${fmt(g.v)} ${g.from}` }];
      ask = `What is the weight in ${g.to}?`;
    } else {
      lines = [{ label: 'Patient', text: g.baby ? `a baby ${fmt(g.v)} ${g.from} long` : `${fmt(g.v)} ${g.from} tall` }];
      ask = `What is that in ${unitName[g.to]}?`;
    }
    const divides = cars[0].d.v.gt(1);
    return {
      lines, ask,
      answer: numberAnswer({ exact: t.exact, rule, unit: g.to, s }),
      steps: [
        { say: `You want ${g.to}. The fact you need is ${fact}, so put it in a car with ${g.to} on top and ${g.from} underneath.`, train: t },
        { say: roundingSay(t.exact, t.key, rule, s, g.to) },
      ],
      formula: `${fmt(g.v)} ${g.from} ${divides ? '÷' : '×'} ${fmt(divides ? cars[0].d.v : cars[0].n.v)} = ${fmtApprox(t.exact, 3).text} → ${fmt(t.key)} ${g.to}`,
      facts: {},
    };
  },
  generate(rng, s) {
    const kind = pick(rng, ['tsp>mL', 'tbsp>mL', 'oz>mL', 'mL>tsp', 'mL>tbsp', 'mL>oz', 'lb>kg', 'lb>kg', 'kg>lb', 'in>cm', 'cm>in']);
    const [from, to] = kind.split('>');
    const syrups = [['guaifenesin syrup', 'every 4 hours as needed'], ['lactulose', 'twice a day'], ['milk of magnesia', 'at bedtime'], ['acetaminophen liquid', 'every 6 hours as needed'], ['nystatin suspension', 'four times a day']];
    const g = { from, to };
    if (from === 'tsp') { g.v = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3]); [g.drug, g.how] = pick(rng, syrups); }
    else if (from === 'tbsp') { g.v = pick(rng, [0.5, 1, 1.5, 2, 3]); [g.drug, g.how] = pick(rng, syrups); }
    else if (from === 'oz') { g.v = pick(rng, [2, 3, 4, 5, 6, 8, 10, 12, 16]); g.drink = pick(rng, ['apple juice', 'water', 'milk', 'broth', 'tea']); }
    else if (to === 'tsp') g.v = pick(rng, [2.5, 5, 7.5, 10, 12.5, 15]);
    else if (to === 'tbsp') g.v = pick(rng, [7.5, 15, 22.5, 30, 45]);
    else if (to === 'oz') g.v = pick(rng, [60, 90, 120, 150, 180, 240, 360, 480]);
    else if (from === 'lb') g.v = chance(rng, 0.5) ? int(rng, 8, 90) : int(rng, 100, 280);
    else if (from === 'kg') g.v = chance(rng, 0.5) ? pick(rng, steps(3, 40, 0.5)) : int(rng, 45, 130);
    else if (from === 'in') { g.v = chance(rng, 0.3) ? pick(rng, steps(18, 30, 0.5)) : int(rng, 58, 76); g.baby = g.v < 40; }
    else if (from === 'cm') { g.v = chance(rng, 0.3) ? int(rng, 46, 80) : int(rng, 145, 195); g.baby = g.v < 100; }
    return g;
  },
};

// ---------- 3. Tablets and capsules ----------

const TABLETS = [
  { drug: 'digoxin', u: 'mg', st: [0.125, 0.25], split: true, alt: 'mcg', how: ['PO daily'], max: 0.25 },
  { drug: 'levothyroxine', u: 'mcg', st: [25, 50, 75, 100], split: true, alt: 'mg', how: ['PO daily before breakfast'], max: 200 },
  { drug: 'furosemide', u: 'mg', st: [20, 40, 80], split: true, how: ['PO daily', 'PO twice a day'], max: 80 },
  { drug: 'metoprolol tartrate', u: 'mg', st: [25, 50, 100], split: true, how: ['PO twice a day'], max: 100 },
  { drug: 'lisinopril', u: 'mg', st: [2.5, 5, 10, 20], split: false, how: ['PO daily'], max: 40 },
  { drug: 'warfarin', u: 'mg', st: [1, 2, 2.5, 5], split: true, how: ['PO daily in the evening'], max: 10 },
  { drug: 'prednisone', u: 'mg', st: [5, 10, 20], split: true, how: ['PO daily with breakfast'], max: 60 },
  { drug: 'carvedilol', u: 'mg', st: [3.125, 6.25, 12.5, 25], split: false, how: ['PO twice a day with food'], max: 25 },
  { drug: 'acetaminophen', u: 'mg', st: [325, 500], split: false, alt: 'g', how: ['PO every 6 hours as needed'], max: 1000 },
  { drug: 'metformin', u: 'mg', st: [500, 1000], split: false, alt: 'g', how: ['PO twice a day with meals'], max: 1000 },
  { drug: 'lorazepam', u: 'mg', st: [0.5, 1, 2], split: true, how: ['PO at bedtime', 'PO every 8 hours as needed'], max: 2 },
  { drug: 'hydrochlorothiazide', u: 'mg', st: [12.5, 25, 50], split: true, how: ['PO daily'], max: 50 },
  { drug: 'allopurinol', u: 'mg', st: [100, 300], split: true, how: ['PO daily'], max: 600 },
  { drug: 'captopril', u: 'mg', st: [12.5, 25, 50], split: true, how: ['PO three times a day'], max: 50 },
  { drug: 'amoxicillin', form: 'cap', u: 'mg', st: [250, 500], alt: 'g', how: ['PO every 8 hours'], max: 1000 },
  { drug: 'cephalexin', form: 'cap', u: 'mg', st: [250, 500], alt: 'g', how: ['PO every 6 hours'], max: 1000 },
  { drug: 'gabapentin', form: 'cap', u: 'mg', st: [100, 300, 400], how: ['PO three times a day'], max: 900 },
];

const tablets = {
  id: 'tablets',
  build(g, s) {
    const form = g.form || 'tab';
    const cars = [car(1, form, g.have.v, g.have.u), ...convCars(g.order.u, g.have.u), load(g.order.v, g.order.u)];
    const t = T({ n: form }, cars, 'tablet', s);
    const word = form === 'cap' ? 'capsules' : 'tablets';
    const conv = g.order.u !== g.have.u;
    return {
      lines: [
        { label: 'Order', text: `${g.drug} ${fmt(g.order.v)} ${g.order.u} ${g.how}` },
        { label: 'Available', text: `${g.drug} ${fmt(g.have.v)} ${g.have.u} ${word}` },
      ],
      ask: `How many ${word} do you give?`,
      answer: numberAnswer({ exact: t.exact, rule: 'tablet', unit: form, s }),
      steps: [
        { say: `You want ${word}, so start with what one holds: 1 ${form === 'cap' ? 'capsule' : 'tablet'} is ${fmt(g.have.v)} ${g.have.u}. ${conv ? `The order is in ${g.order.u}, so add a car for ${convSay(g.order.u, g.have.u)}. ` : ''}Then the amount ordered.`, train: t },
        { say: roundingSay(t.exact, t.key, 'tablet', s, form) },
      ],
      formula: `D/H × Q = ${fmt(g.order.v)} ${g.order.u} ÷ ${fmt(g.have.v)} ${g.have.u} × 1 = ${amountText(t.key, form)}${conv ? ' (with the units made the same first)' : ''}`,
      facts: {},
    };
  },
  generate(rng, s) {
    for (;;) {
      const d = pick(rng, TABLETS);
      const form = d.form || 'tab';
      const H = pick(rng, d.st);
      const count = pick(rng, form === 'tab' && d.split ? [0.5, 1, 1.5, 2, 2, 3] : [1, 2, 2, 3]);
      let D = num(Q.of(H).mul(count));
      if (!niceDose(D) || (d.max && D > d.max)) continue;
      let ou = d.u;
      const swap = (v, u) => { if (niceDose(v)) { D = v; ou = u; } };
      if (d.alt === 'mcg' && chance(rng, 0.4)) swap(num(Q.of(D).mul(1000)), 'mcg');
      else if (d.alt === 'mg' && chance(rng, 0.4)) swap(num(Q.of(D).div(1000)), 'mg');
      else if (d.alt === 'g' && D >= 1000 && D % 500 === 0 && chance(rng, 0.5)) swap(num(Q.of(D).div(1000)), 'g');
      return { drug: d.drug, form, order: { v: D, u: ou }, have: { v: H, u: d.u }, how: pick(rng, d.how) };
    }
  },
};

// ---------- 4. Oral liquids and 5. Injections (same math, D/H × Q) ----------

const LIQUIDS = [
  { drug: 'amoxicillin', form: 'oral suspension', c: [[125, 5], [250, 5], [400, 5]], dose: [100, 875], how: ['PO every 8 hours', 'PO every 12 hours'], alt: 'g' },
  { drug: 'acetaminophen', form: 'oral liquid', c: [[160, 5]], dose: [80, 650], how: ['PO every 6 hours as needed'] },
  { drug: 'ibuprofen', form: 'oral suspension', c: [[100, 5]], dose: [50, 400], how: ['PO every 6 hours as needed'] },
  { drug: 'cephalexin', form: 'oral suspension', c: [[125, 5], [250, 5]], dose: [125, 500], how: ['PO every 6 hours'] },
  { drug: 'prednisolone', form: 'oral solution', c: [[15, 5]], dose: [5, 60], how: ['PO daily'] },
  { drug: 'ondansetron', form: 'oral solution', c: [[4, 5]], dose: [2, 8], how: ['PO every 8 hours as needed'] },
  { drug: 'furosemide', form: 'oral solution', c: [[10, 1], [40, 5]], dose: [10, 80], how: ['PO daily', 'PO twice a day'] },
  { drug: 'phenytoin', form: 'oral suspension', c: [[125, 5]], dose: [50, 300], how: ['PO twice a day'] },
  { drug: 'potassium chloride', form: 'oral solution', c: [[20, 15]], u: 'mEq', dose: [10, 40], how: ['PO daily', 'PO twice a day'] },
  { drug: 'lactulose', form: 'oral solution', c: [[10, 15]], u: 'g', dose: [10, 30], how: ['PO twice a day'] },
  { drug: 'diphenhydramine', form: 'oral liquid', c: [[12.5, 5]], dose: [6.25, 50], how: ['PO at bedtime', 'PO every 6 hours as needed'] },
  { drug: 'digoxin', form: 'oral solution', c: [[0.05, 1]], dose: [0.05, 0.25], how: ['PO daily'], alt: 'mcg' },
  { drug: 'cetirizine', form: 'oral solution', c: [[5, 5]], dose: [2.5, 10], how: ['PO daily'] },
  { drug: 'valproic acid', form: 'oral solution', c: [[250, 5]], dose: [125, 500], how: ['PO twice a day'] },
  { drug: 'azithromycin', form: 'oral suspension', c: [[100, 5], [200, 5]], dose: [50, 500], how: ['PO daily'] },
];
const INJECTIONS = [
  { drug: 'morphine', c: [[2, 1], [4, 1], [10, 1]], doses: [1, 2, 3, 4, 5, 6, 8, 10], route: ['IV', 'IM'], how: ['every 4 hours as needed'] },
  { drug: 'hydromorphone', c: [[1, 1], [2, 1]], doses: [0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2], route: ['IV'], how: ['every 3 hours as needed'] },
  { drug: 'ketorolac', c: [[15, 1], [30, 1]], doses: [15, 30], route: ['IV', 'IM'], how: ['every 6 hours as needed'] },
  { drug: 'promethazine', c: [[25, 1]], doses: [6.25, 12.5, 25], route: ['IM'], how: ['every 6 hours as needed'] },
  { drug: 'meperidine', c: [[50, 1], [75, 1], [100, 1]], doses: [25, 50, 75, 100], route: ['IM'], how: ['once'] },
  { drug: 'furosemide', c: [[10, 1]], doses: [10, 20, 40], route: ['IV'], how: ['once', 'twice a day'] },
  { drug: 'ondansetron', c: [[2, 1]], doses: [2, 4], route: ['IV'], how: ['every 8 hours as needed'] },
  { drug: 'diphenhydramine', c: [[50, 1]], doses: [12.5, 25, 50], route: ['IV', 'IM'], how: ['every 6 hours as needed'] },
  { drug: 'haloperidol', c: [[5, 1]], doses: [1, 2, 2.5, 5], route: ['IM'], how: ['every 6 hours as needed'] },
  { drug: 'famotidine', c: [[10, 1]], doses: [20], route: ['IV'], how: ['every 12 hours'] },
  { drug: 'lorazepam', c: [[2, 1], [4, 1]], doses: [0.5, 1, 2], route: ['IV', 'IM'], how: ['every 6 hours as needed'] },
  { drug: 'cyanocobalamin', u: 'mcg', c: [[1000, 1]], doses: [100, 250, 500, 1000], route: ['IM'], how: ['once a month'] },
  { drug: 'heparin', u: 'units', c: [[5000, 1], [10000, 1]], doses: [5000, 7500], route: ['subcut'], how: ['every 12 hours', 'every 8 hours'] },
  { drug: 'gentamicin', c: [[40, 1], [10, 1]], doses: [10, 20, 30, 40, 60, 70, 80, 100, 120], route: ['IM', 'IV'], how: ['every 8 hours'] },
  { drug: 'methylprednisolone', c: [[40, 1], [125, 2]], doses: [40, 60, 80, 125], route: ['IV'], how: ['every 6 hours', 'daily'] },
  { drug: 'phytonadione', c: [[1, 0.5], [10, 1]], doses: [0.5, 1, 2.5, 5, 10], route: ['IM'], how: ['once'] },
  { drug: 'atropine', c: [[0.4, 1], [1, 1]], doses: [0.4, 0.5, 0.6, 1], route: ['IV', 'IM'], how: ['once'] },
  { drug: 'naloxone', c: [[0.4, 1]], doses: [0.1, 0.2, 0.4], route: ['IV'], how: ['every 2 minutes as needed'] },
  { drug: 'epinephrine', c: [[1, 1]], doses: [0.3, 0.5], route: ['IM'], how: ['once'] },
  { drug: 'enoxaparin', c: [[100, 1]], doses: [30, 40, 60, 80], route: ['subcut'], how: ['daily', 'every 12 hours'] },
];

const concText = (have, per) => (Q.of(per.v).eq(1) ? `${fmt(have.v)} ${have.u}/mL` : `${fmt(have.v)} ${have.u}/${fmt(per.v)} mL`);

function dhq(kind) {
  return {
    id: kind,
    build(g, s) {
      const cars = [car(g.per.v, 'mL', g.have.v, g.have.u), ...convCars(g.order.u, g.have.u), load(g.order.v, g.order.u)];
      const t = T({ n: 'mL' }, cars, 'volume', s);
      const conv = g.order.u !== g.have.u;
      const lines = [
        { label: 'Order', text: `${g.drug} ${fmt(g.order.v)} ${g.order.u} ${g.route} ${g.how}` },
        { label: 'Available', text: kind === 'liquids' ? `${g.drug} ${g.form} ${concText(g.have, g.per)}` : `${g.drug} ${concText(g.have, g.per)}` },
      ];
      return {
        lines,
        ask: kind === 'liquids' ? 'How many mL per dose?' : 'How many mL do you draw up?',
        answer: numberAnswer({ exact: t.exact, rule: 'volume', unit: 'mL', s }),
        steps: [
          { say: `You want mL, so start with the label (${fmt(g.have.v)} ${g.have.u} in ${fmt(g.per.v)} mL) turned over, with mL on top. ${conv ? `The order is in ${g.order.u}, so a car for ${convSay(g.order.u, g.have.u)} goes next. ` : ''}Then the amount ordered.`, train: t },
          { say: roundingSay(t.exact, t.key, 'volume', s, 'mL') },
        ],
        formula: `D/H × Q = ${fmt(g.order.v)} ${g.order.u} ÷ ${fmt(g.have.v)} ${g.have.u} × ${fmt(g.per.v)} mL = ${fmt(t.key)} mL${conv ? ' (with the units made the same first)' : ''}`,
        facts: {},
      };
    },
    generate(rng, s) {
      for (;;) {
        if (kind === 'liquids') {
          const d = pick(rng, LIQUIDS);
          const [hv, pv] = pick(rng, d.c);
          const u = d.u || 'mg';
          let D;
          if (chance(rng, 0.7)) {
            const V = pick(rng, [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10, 12.5, 15, 20]);
            D = num(Q.of(hv).mul(V).div(pv));
          } else {
            const grid = d.dose[1] >= 100 ? 25 : d.dose[1] >= 20 ? 5 : d.dose[1] >= 2 ? 0.5 : 0.025;
            D = num(Q.of(pick(rng, steps(Math.ceil(d.dose[0] / grid), Math.floor(d.dose[1] / grid), 1))).mul(grid));
          }
          if (!roundDose(D) || D < d.dose[0] || D > d.dose[1]) continue;
          const V = Q.of(D).mul(pv).div(hv);
          if (V.lt('0.5') || V.gt(30)) continue;
          let order = { v: D, u };
          if (d.alt === 'mcg' && chance(rng, 0.5)) order = { v: num(Q.of(D).mul(1000)), u: 'mcg' };
          if (d.alt === 'g' && D >= 500 && chance(rng, 0.3)) { const gv = num(Q.of(D).div(1000)); if (niceDose(gv)) order = { v: gv, u: 'g' }; }
          return { drug: d.drug, form: d.form, order, have: { v: hv, u }, per: { v: pv, u: 'mL' }, route: 'PO', how: pick(rng, d.how).replace(/^PO /, '') };
        }
        const d = pick(rng, INJECTIONS);
        const [hv, pv] = pick(rng, d.c);
        const u = d.u || 'mg';
        const D = pick(rng, d.doses);
        const route = pick(rng, d.route);
        const V = Q.of(D).mul(pv).div(hv);
        const max = route === 'IV' ? 5 : 3;
        if (V.lt('0.1') || V.gt(max)) continue;
        let order = { v: D, u };
        if (u === 'mcg' && D >= 100 && chance(rng, 0.3)) order = { v: num(Q.of(D).div(1000)), u: 'mg' };
        if (u === 'mg' && D < 1 && chance(rng, 0.3)) order = { v: num(Q.of(D).mul(1000)), u: 'mcg' };
        return { drug: d.drug, order, have: { v: hv, u }, per: { v: pv, u: 'mL' }, route, how: pick(rng, d.how) };
      }
    },
  };
}
const liquids = dhq('liquids');
const injections = dhq('injections');

// ---------- 6. Weight-based doses ----------

const WEIGHT_DRUGS = [
  { drug: 'amoxicillin', mode: 'day', per: [20, 25, 30, 40, 45, 50, 80, 90], every: [8, 12], route: 'PO', c: [[250, 5], [400, 5], [125, 5]] },
  { drug: 'cephalexin', mode: 'day', per: [25, 50, 75, 100], every: [6, 8, 12], route: 'PO', c: [[125, 5], [250, 5]] },
  { drug: 'cefazolin', mode: 'day', per: [25, 50, 75, 100], every: [8], route: 'IV', c: [[100, 1], [200, 1]] },
  { drug: 'gentamicin', mode: 'day', per: [5, 6, 7.5], every: [8], route: 'IV', c: [[10, 1], [40, 1]] },
  { drug: 'ceftriaxone', mode: 'day', per: [50, 75, 80, 100], every: [12], route: 'IV', c: [[100, 1]] },
  { drug: 'clindamycin', mode: 'day', per: [10, 20, 25, 30, 40], every: [6, 8], route: 'PO', c: [[75, 5]] },
  { drug: 'acetaminophen', mode: 'dose', per: [10, 12.5, 15], every: [4, 6], route: 'PO', c: [[160, 5]] },
  { drug: 'ibuprofen', mode: 'dose', per: [5, 7.5, 10], every: [6, 8], route: 'PO', c: [[100, 5]] },
  { drug: 'vancomycin', mode: 'dose', per: [10, 15], every: [6, 8], route: 'IV', c: [[50, 1]] },
  { drug: 'azithromycin', mode: 'dose', per: [5, 10], every: [24], route: 'PO', c: [[100, 5], [200, 5]] },
  { drug: 'morphine', mode: 'dose', per: [0.05, 0.1], every: [4], route: 'IV', c: [[1, 1], [2, 1]] },
];
const everyText = (h) => (h === 24 ? 'once a day' : `every ${h} hours`);

function childWeight(rng) {
  if (chance(rng, 0.5)) return { v: int(rng, 9, 88), u: 'lb' };
  return { v: chance(rng, 0.6) ? pick(rng, steps(4, 40, 0.1)) : int(rng, 4, 40), u: 'kg' };
}

const weight = {
  id: 'weight',
  build(g, s) {
    const W = weightStep(g.w, s);
    const n = 24 / g.every;
    const prefix = g.ask === 'mL' ? [car(g.c.per, 'mL', g.c.have, 'mg')] : [];
    const want = { n: g.ask, d: 'dose' };
    const rule = g.ask === 'mL' ? 'volume' : 'tenths';
    const doseCars = (kg) => (g.mode === 'day'
      ? [...prefix, car(g.per, 'mg', 1, ['kg', 'day']), load(kg, 'kg'), car(1, 'day', n, 'dose')]
      : [...prefix, car(g.per, 'mg', 1, ['kg', 'dose']), load(kg, 'kg')]);
    const t = T(want, doseCars(W.kg), rule, s);
    const daily = Q.of(g.per).mul(W.kg);
    const perDose = g.mode === 'day' ? daily.div(n) : daily;
    // Also right: the same sum with the weight not rounded, or (for mL) the mg dose rounded first.
    const alts = [];
    if (g.w.u === 'lb') alts.push(T(want, doseCars(W.exactKg), rule, s).exact);
    if (g.ask === 'mL') alts.push(applyRule('tenths', perDose, s).mul(g.c.per).div(g.c.have));
    const lines = [
      { label: 'Order', text: g.mode === 'day'
        ? `${g.drug} ${fmt(g.per)} mg/kg/day ${g.route}, divided ${everyText(g.every)}`
        : `${g.drug} ${fmt(g.per)} mg/kg ${g.route} ${everyText(g.every)}` },
      { label: 'Patient', text: `weighs ${weightText(g.w)}` },
    ];
    if (g.ask === 'mL') lines.push({ label: 'Available', text: `${g.drug} ${concText({ v: g.c.have, u: 'mg' }, { v: g.c.per })}` });
    const st = [];
    if (W.step) st.push(W.step);
    if (g.mode === 'day') {
      st.push({ say: `The dose is per kg per DAY, split into ${n} doses (${everyText(g.every)} is ${n} a day). ${g.ask === 'mL' ? 'You want mL per dose, so the label goes first, mL on top. ' : ''}Then the dose, the weight, and 1 day over ${n} doses.`, train: t });
      st.push({ say: `In between: ${fmt(g.per)} mg/kg/day × ${fmt(W.kg)} kg = ${fmtApprox(daily, 3).text} mg a day, and ${fmtApprox(daily, 3).text} ÷ ${n} = ${fmtApprox(perDose, 3).text} mg per dose. ${roundingSay(t.exact, t.key, rule, s, g.ask)}` });
    } else {
      st.push({ say: `The dose is per kg for each dose. ${g.ask === 'mL' ? 'You want mL per dose, so the label goes first, mL on top. ' : ''}Then the dose and the weight.`, train: t });
      st.push({ say: `In between: ${fmt(g.per)} mg/kg × ${fmt(W.kg)} kg = ${fmtApprox(perDose, 3).text} mg per dose. ${roundingSay(t.exact, t.key, rule, s, g.ask)}` });
    }
    return {
      lines, note: PRACTICE_NOTE,
      ask: `How many ${g.ask} per dose?`,
      answer: numberAnswer({ exact: t.exact, rule, unit: g.ask, s, alts }),
      steps: st,
      formula: g.mode === 'day'
        ? `${fmt(g.per)} mg × ${fmt(W.kg)} kg ÷ ${n} doses${g.ask === 'mL' ? ` ÷ ${fmt(g.c.have)} mg × ${fmt(g.c.per)} mL` : ''} = ${fmt(t.key)} ${g.ask}`
        : `${fmt(g.per)} mg × ${fmt(W.kg)} kg${g.ask === 'mL' ? ` ÷ ${fmt(g.c.have)} mg × ${fmt(g.c.per)} mL` : ''} = ${fmt(t.key)} ${g.ask}`,
      facts: { kg: W.kg, daily: g.mode === 'day' ? daily : null, perDose },
    };
  },
  generate(rng, s) {
    for (;;) {
      const d = pick(rng, WEIGHT_DRUGS);
      const g = { drug: d.drug, mode: d.mode, per: pick(rng, d.per), every: pick(rng, d.every), route: d.route, w: childWeight(rng), ask: chance(rng, 0.5) ? 'mg' : 'mL' };
      const [have, per] = pick(rng, d.c);
      g.c = { have, per };
      const p = this.build(g, s);
      const k = p.answer.key;
      if (g.ask === 'mL' && (k.lt('0.2') || k.gt(30))) continue;
      if (g.ask === 'mg' && k.lt(1)) continue;
      return g;
    }
  },
};

// ---------- 7. Safe-dose check ----------

const SAFE_DRUGS = [
  { drug: 'cefazolin', basis: 'day', ranges: [[25, 50], [50, 100]], every: [8], route: 'IV' },
  { drug: 'amoxicillin', basis: 'day', ranges: [[20, 40], [25, 45], [80, 90]], every: [8, 12], route: 'PO' },
  { drug: 'ampicillin', basis: 'day', ranges: [[100, 200], [50, 100]], every: [6], route: 'IV' },
  { drug: 'gentamicin', basis: 'day', ranges: [[6, 7.5], [5, 7.5]], every: [8], route: 'IV' },
  { drug: 'cephalexin', basis: 'day', ranges: [[25, 50], [50, 100]], every: [6], route: 'PO' },
  { drug: 'clindamycin', basis: 'day', ranges: [[10, 25], [20, 40]], every: [6, 8], route: 'PO' },
  { drug: 'acetaminophen', basis: 'dose', ranges: [[10, 15]], every: [4, 6], route: 'PO' },
  { drug: 'ibuprofen', basis: 'dose', ranges: [[5, 10]], every: [6, 8], route: 'PO' },
  { drug: 'vancomycin', basis: 'dose', ranges: [[10, 15]], every: [6, 8], route: 'IV' },
  { drug: 'morphine', basis: 'dose', ranges: [[0.05, 0.1], [0.1, 0.2]], every: [4], route: 'IV' },
];
export const SAFE_OPTIONS = [
  { id: 'safe', label: 'Yes, it’s safe' },
  { id: 'low', label: 'No, too low' },
  { id: 'high', label: 'No, too high' },
];

function safeVerdict(ordered, lo, hi) {
  if (ordered.lt(lo)) return 'low';
  if (ordered.gt(hi)) return 'high';
  return 'safe';
}

const safe = {
  id: 'safe',
  build(g, s) {
    const W = weightStep(g.w, s);
    const n = 24 / g.every;
    const per = g.basis === 'day' ? 'day' : 'dose';
    const tLo = T({ n: 'mg', d: per }, [car(g.lo, 'mg', 1, ['kg', per]), load(W.kg, 'kg')], 'exact', s);
    const tHi = T({ n: 'mg', d: per }, [car(g.hi, 'mg', 1, ['kg', per]), load(W.kg, 'kg')], 'exact', s);
    let ordered, tOrd = null;
    if (g.basis === 'day') {
      tOrd = T({ n: 'mg', d: 'day' }, [car(g.order, 'mg', 1, 'dose'), car(n, 'dose', 1, 'day')], 'exact', s);
      ordered = tOrd.exact;
    } else ordered = Q.of(g.order);
    const verdict = safeVerdict(ordered, tLo.exact, tHi.exact);
    const perWord = per === 'day' ? 'a day' : 'per dose';
    const range = `${fmtApprox(tLo.exact, 2).text}–${fmtApprox(tHi.exact, 2).text} mg ${perWord}`;
    const st = [];
    if (W.step) st.push(W.step);
    st.push({ say: `The low end of the safe range for this weight:`, train: tLo });
    st.push({ say: `The high end:`, train: tHi });
    if (tOrd) st.push({ say: `Now what the order adds up to in a day: ${fmt(g.order)} mg a dose, ${everyText(g.every)}, is ${n} doses a day.`, train: tOrd });
    else st.push({ say: `The order is ${fmt(g.order)} mg per dose, and the range is per dose too, so compare them straight away.` });
    const why = verdict === 'safe' ? `${fmt(ordered)} mg ${perWord} is inside ${range}, so **yes, it’s safe**.`
      : verdict === 'low' ? `${fmt(ordered)} mg ${perWord} is below ${range}, so **no, it’s too low** (it may not work), and you’d check with the prescriber.`
      : `${fmt(ordered)} mg ${perWord} is above ${range}, so **no, it’s too high**, and you’d hold it and check with the prescriber.`;
    st.push({ say: why });
    return {
      lines: [
        { label: 'Order', text: `${g.drug} ${fmt(g.order)} mg ${g.route} ${everyText(g.every)}` },
        { label: 'Patient', text: `weighs ${weightText(g.w)}` },
        { label: 'Safe range', text: g.basis === 'day' ? `${fmt(g.lo)}–${fmt(g.hi)} mg/kg/day` : `${fmt(g.lo)}–${fmt(g.hi)} mg/kg per dose` },
      ],
      note: 'The safe range is part of the problem. Practice numbers only, not real dosing.',
      ask: 'Is the order safe?',
      answer: { type: 'choice', key: verdict, options: SAFE_OPTIONS },
      steps: st,
      formula: `Range: ${fmt(g.lo)} and ${fmt(g.hi)} mg × ${fmt(W.kg)} kg = ${range}. Ordered: ${g.basis === 'day' ? `${fmt(g.order)} mg × ${n} = ` : ''}${fmt(ordered)} mg ${perWord}.`,
      facts: { kg: W.kg, low: tLo.exact, high: tHi.exact, ordered },
    };
  },
  generate(rng, s) {
    for (let tries = 0; ; tries++) {
      const d = pick(rng, SAFE_DRUGS);
      const [lo, hi] = pick(rng, d.ranges);
      const every = pick(rng, d.every);
      const n = 24 / every;
      const w = childWeight(rng);
      // The kg the student might reasonably use: rounded to tenths or hundredths, with 2.2 or 2.2046, or not rounded.
      const kgs = w.u === 'kg' ? [Q.of(w.v)] : ['2.2', '2.2046'].flatMap((f) => {
        const e = Q.of(w.v).div(f);
        return [e, e.roundTo('0.1'), e.roundTo('0.01')];
      });
      const want = pick(rng, ['safe', 'safe', 'low', 'high']);
      const k0 = kgs[0];
      const perUnit = d.basis === 'day' ? n : 1; // ordered amount per (day or dose) = order × perUnit
      const loTot = Q.of(lo).mul(k0), hiTot = Q.of(hi).mul(k0);
      let target;
      if (want === 'safe') target = loTot.add(hiTot.sub(loTot).mul(0.15 + 0.7 * rng()));
      else if (want === 'low') target = loTot.mul(0.45 + 0.35 * rng());
      else target = hiTot.mul(1.2 + 0.6 * rng());
      const raw = target.div(perUnit).toNumber();
      const grid = raw >= 200 ? 25 : raw >= 50 ? 10 : raw >= 10 ? 5 : raw >= 2 ? 0.5 : raw >= 0.5 ? 0.1 : 0.05;
      const order = num(Q.of(Math.max(1, Math.round(raw / grid))).mul(String(grid)));
      if (!niceDose(order)) continue;
      // Keep it only if every reasonable way of working it gives the same verdict, with room to spare.
      const ordered = Q.of(order).mul(perUnit);
      const verdicts = new Set();
      let tight = false;
      for (const kg of kgs) {
        const L = Q.of(lo).mul(kg), H = Q.of(hi).mul(kg);
        verdicts.add(safeVerdict(ordered, L, H));
        for (const b of [L, H]) if (ordered.sub(b).toNumber() !== 0 && Math.abs(ordered.sub(b).div(b).toNumber()) < 0.03) tight = true;
        if (ordered.eq(L) || ordered.eq(H)) tight = true;
      }
      if (verdicts.size !== 1 || tight || [...verdicts][0] !== want) continue;
      return { drug: d.drug, basis: d.basis, lo, hi, every, route: d.route, w, order };
    }
  },
};

// ---------- 8. Reconstitution ----------

const VIALS = [
  { drug: 'ceftriaxone', vial: [1, 'g'], mixes: [[3.6, 4], [9.6, 10]], route: ['IM', 'IV'], orders: [250, 500, 750, 1000] },
  { drug: 'ceftriaxone', vial: [500, 'mg'], mixes: [[1.8, 2]], route: ['IM'], orders: [125, 250, 300, 500] },
  { drug: 'cefazolin', vial: [1, 'g'], mixes: [[4.6, 5], [9.5, 10]], route: ['IM', 'IV'], orders: [250, 300, 500, 750, 1000] },
  { drug: 'ampicillin', vial: [500, 'mg'], mixes: [[1.8, 2], [4.8, 5]], route: ['IM', 'IV'], orders: [125, 150, 250, 300, 400, 500] },
  { drug: 'ampicillin', vial: [1, 'g'], mixes: [[3.5, 4], [7.4, 8]], route: ['IM', 'IV'], orders: [250, 500, 750, 1000] },
  { drug: 'oxacillin', vial: [2, 'g'], mixes: [[9.6, 10]], route: ['IV'], orders: [250, 500, 1000, 1500, 2000] },
  { drug: 'nafcillin', vial: [1, 'g'], mixes: [[3.4, 4]], route: ['IV'], orders: [250, 500, 750, 1000] },
  { drug: 'cefotaxime', vial: [1, 'g'], mixes: [[9.6, 10]], route: ['IV'], orders: [250, 500, 750, 1000] },
  { drug: 'penicillin G potassium', vial: [5000000, 'units'], mixes: [[18.2, 20], [8.2, 10], [3.2, 5]], route: ['IM', 'IV'], orders: [250000, 300000, 500000, 600000, 1000000, 1200000, 2000000] },
  { drug: 'methylprednisolone', vial: [500, 'mg'], mixes: [[7.8, 8]], route: ['IV'], orders: [60, 100, 125, 250, 500] },
];

const recon = {
  id: 'recon',
  build(g, s) {
    const cu = g.vial.u === 'g' ? 'mg' : g.vial.u; // concentration per mL, in the order's unit
    const tc = T({ n: cu, d: 'mL' }, [...convCars(g.vial.u, cu), car(g.vial.v, g.vial.u, g.total, 'mL')], g.ask === 'conc' ? 'tenths' : 'exact', s);
    const lines = [
      { label: 'Vial', text: `${g.drug} ${fmt(g.vial.v)} ${g.vial.u}, a powder` },
      { label: 'Label', text: `add ${fmt(g.add)} mL sterile water, which makes ${fmt(g.total)} mL in all` },
    ];
    const st = [{ say: `The concentration comes from the TOTAL volume after mixing (${fmt(g.total)} mL), not the water you add (${fmt(g.add)} mL), because the powder takes up room too.${g.vial.u === 'g' ? ' The vial is in g, so a car turns it into mg.' : ''}`, train: tc }];
    if (g.ask === 'conc') {
      st.push({ say: roundingSay(tc.exact, tc.key, 'tenths', s, `${cu}/mL`) });
      return {
        lines, ask: 'Once it’s mixed, how strong is it?',
        answer: numberAnswer({ exact: tc.exact, rule: 'tenths', unit: `${cu}/mL`, s }),
        steps: st,
        formula: `${fmt(g.vial.u === 'g' ? Q.of(g.vial.v).mul(1000) : g.vial.v)} ${cu} ÷ ${fmt(g.total)} mL = ${fmt(tc.key)} ${cu}/mL`,
        facts: { conc: tc.exact },
      };
    }
    lines.push({ label: 'Order', text: `${g.drug} ${fmt(g.order)} ${cu} ${g.route} ${g.how}` });
    const tv = T({ n: 'mL' }, [car(1, 'mL', tc.exact, cu), load(g.order, cu)], 'volume', s);
    st[0].say = `First the concentration. ${st[0].say}`;
    st.push({ say: `So 1 mL holds ${fmt(tc.exact)} ${cu}. Now it’s D/H × Q: put that over the order, mL on top.`, train: tv });
    st.push({ say: roundingSay(tv.exact, tv.key, 'volume', s, 'mL') });
    return {
      lines, ask: 'How many mL do you give?',
      answer: numberAnswer({ exact: tv.exact, rule: 'volume', unit: 'mL', s }),
      steps: st,
      formula: `${fmt(g.order)} ${cu} ÷ ${fmt(tc.exact)} ${cu}/mL = ${fmt(tv.key)} mL`,
      facts: { conc: tc.exact },
    };
  },
  generate(rng, s) {
    for (;;) {
      const d = pick(rng, VIALS);
      const [add, total] = pick(rng, d.mixes);
      const route = pick(rng, d.route);
      const order = pick(rng, d.orders);
      const g = { drug: d.drug, vial: { v: d.vial[0], u: d.vial[1] }, add, total, order, route, how: route === 'IM' ? 'once' : pick(rng, ['every 6 hours', 'every 8 hours', 'every 12 hours']), ask: chance(rng, 0.25) ? 'conc' : 'mL' };
      const amount = Q.of(d.vial[0]).mul(d.vial[1] === 'g' ? 1000 : 1);
      if (Q.of(order).gt(amount)) continue;
      const vol = Q.of(order).mul(total).div(amount);
      if (g.ask === 'mL' && (vol.lt('0.2') || vol.gt(route === 'IM' ? 3 : 10))) continue;
      return g;
    }
  },
};

// ---------- 9. IV pump rates ----------

const FLUIDS = ['0.9% sodium chloride', 'lactated Ringer’s', 'D5W', 'D5 0.45% sodium chloride'];
const PUMP_DRIPS = [
  { drug: 'diltiazem', bag: [125, 'mg', 125], fluid: 'D5W', orders: [[5, 'mg', 'h'], [10, 'mg', 'h'], [15, 'mg', 'h']] },
  { drug: 'furosemide', bag: [100, 'mg', 100], fluid: '0.9% sodium chloride', orders: [[5, 'mg', 'h'], [10, 'mg', 'h'], [20, 'mg', 'h']] },
  { drug: 'regular insulin', bag: [100, 'units', 100], fluid: '0.9% sodium chloride', orders: [2, 3, 4, 4.5, 5, 6, 7, 8, 9.5, 10, 12].map((v) => [v, 'units', 'h']) },
  { drug: 'magnesium sulfate', bag: [20, 'g', 500], fluid: 'sterile water', orders: [[1, 'g', 'h'], [2, 'g', 'h'], [3, 'g', 'h']] },
  { drug: 'magnesium sulfate', bag: [40, 'g', 1000], fluid: 'sterile water', orders: [[1, 'g', 'h'], [2, 'g', 'h']] },
  { drug: 'potassium chloride', bag: [20, 'mEq', 100], fluid: 'sterile water', orders: [[10, 'mEq', 'h']] },
  { drug: 'potassium chloride', bag: [40, 'mEq', 500], fluid: '0.9% sodium chloride', orders: [[5, 'mEq', 'h'], [10, 'mEq', 'h']] },
  { drug: 'amiodarone', bag: [900, 'mg', 500], fluid: 'D5W', orders: [[1, 'mg', 'min'], [0.5, 'mg', 'min']] },
  { drug: 'lidocaine', bag: [2, 'g', 500], fluid: 'D5W', orders: [[1, 'mg', 'min'], [2, 'mg', 'min'], [3, 'mg', 'min'], [4, 'mg', 'min']] },
  { drug: 'nicardipine', bag: [25, 'mg', 250], fluid: '0.9% sodium chloride', orders: [2.5, 5, 7.5, 10, 12.5, 15].map((v) => [v, 'mg', 'h']) },
  { drug: 'famotidine', bag: [40, 'mg', 250], fluid: '0.9% sodium chloride', orders: [[1.7, 'mg', 'h'], [2, 'mg', 'h']] },
];

const pump = {
  id: 'pump',
  build(g, s) {
    let t, lines, say, formula;
    if (g.kind === 'vt') {
      const cars = g.t.u === 'h' ? [car(g.vol, 'mL', g.t.v, 'h')] : [car(g.vol, 'mL', g.t.v, 'min'), car(60, 'min', 1, 'h')];
      t = T({ n: 'mL', d: 'h' }, cars, 'pump', s);
      lines = [{ label: 'Order', text: g.drug ? `${g.drug} in ${fmt(g.vol)} mL ${g.fluid} IV over ${fmt(g.t.v)} ${g.t.u === 'h' ? 'hours' : 'minutes'}` : `${g.fluid} ${fmt(g.vol)} mL IV over ${fmt(g.t.v)} ${g.t.u === 'h' ? (g.t.v === 1 ? 'hour' : 'hours') : 'minutes'}` }];
      say = g.t.u === 'h' ? 'A pump runs in mL per hour, so it’s the volume over the hours, in one car.'
        : 'A pump runs in mL per HOUR, and this one is in minutes, so add a car that turns minutes into hours (60 min = 1 h).';
      formula = g.t.u === 'h' ? `${fmt(g.vol)} mL ÷ ${fmt(g.t.v)} h = ${fmt(t.key)} mL/h` : `${fmt(g.vol)} mL ÷ ${fmt(g.t.v)} min × 60 = ${fmt(t.key)} mL/h`;
    } else {
      const bagU = g.bag.u;
      const cars = [car(g.bag.vol, 'mL', g.bag.amt, bagU), ...convCars(g.dose.u, bagU), car(g.dose.v, g.dose.u, 1, g.dose.per)];
      if (g.dose.per === 'min') cars.push(car(60, 'min', 1, 'h'));
      t = T({ n: 'mL', d: 'h' }, cars, 'pump', s);
      lines = [
        { label: 'Order', text: `${g.drug} ${fmt(g.dose.v)} ${g.dose.u}/${g.dose.per} IV` },
        { label: 'Bag', text: `${g.drug} ${fmt(g.bag.amt)} ${bagU} in ${fmt(g.bag.vol)} mL ${g.fluid}` },
      ];
      say = `You want mL/h, so the bag goes first, turned so mL is on top. ${g.dose.u !== bagU ? `The bag is in ${bagU} and the order in ${g.dose.u}, so a car for ${convSay(g.dose.u, bagU)}. ` : ''}Then the order${g.dose.per === 'min' ? ', and since it’s per minute, 60 min in 1 h' : ''}.`;
      formula = `${fmt(g.dose.v)} ${g.dose.u}/${g.dose.per}${g.dose.per === 'min' ? ' × 60' : ''} ÷ (${fmt(g.bag.amt)} ${bagU} ÷ ${fmt(g.bag.vol)} mL) = ${fmt(t.key)} mL/h`;
    }
    return {
      lines, ask: 'What rate do you set on the pump?',
      answer: numberAnswer({ exact: t.exact, rule: 'pump', unit: 'mL/h', s }),
      steps: [{ say, train: t }, { say: roundingSay(t.exact, t.key, 'pump', s, 'mL/h') }],
      formula, facts: {},
    };
  },
  generate(rng, s) {
    for (;;) {
      const r = rng();
      let g;
      if (r < 0.4) g = { kind: 'vt', fluid: pick(rng, FLUIDS), vol: pick(rng, [250, 500, 500, 1000, 1000, 1000, 1500, 2000]), t: { v: pick(rng, [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24]), u: 'h' } };
      else if (r < 0.6) {
        const [drug, vol] = pick(rng, [['cefazolin 1 g', 50], ['cefazolin 2 g', 100], ['vancomycin 1 g', 250], ['vancomycin 1.25 g', 250], ['ceftriaxone 1 g', 50], ['piperacillin-tazobactam 3.375 g', 100], ['metronidazole 500 mg', 100], ['levofloxacin 750 mg', 150], ['acyclovir 500 mg', 100], ['famotidine 20 mg', 50]]);
        g = { kind: 'vt', drug, fluid: '0.9% sodium chloride', vol, t: { v: pick(rng, vol >= 250 ? [60, 90, 120] : [15, 20, 30, 45, 60, 90]), u: 'min' } };
      } else {
        const d = pick(rng, PUMP_DRIPS);
        const [v, u, per] = pick(rng, d.orders);
        g = { kind: 'dose', drug: d.drug, fluid: d.fluid, bag: { amt: d.bag[0], u: d.bag[1], vol: d.bag[2] }, dose: { v, u, per } };
      }
      const t = this.build(g, s).answer.exact;
      if (t.lt(2) || t.gt(999)) continue;
      return g;
    }
  },
};

// ---------- 10. Gravity drip rates ----------

const drip = {
  id: 'drip',
  build(g, s) {
    let cars, lines;
    if (g.kind === 'rate') {
      cars = [car(g.df, 'gtt', 1, 'mL'), car(g.rate, 'mL', 1, 'h'), car(1, 'h', 60, 'min')];
      lines = [{ label: 'Order', text: `${g.fluid} IV at ${fmt(g.rate)} mL/h, by gravity (no pump)` }];
    } else {
      cars = [car(g.df, 'gtt', 1, 'mL'), car(g.vol, 'mL', g.t.v, g.t.u)];
      if (g.t.u === 'h') cars.push(car(1, 'h', 60, 'min'));
      lines = [{ label: 'Order', text: `${g.drug ? `${g.drug} in ` : `${g.fluid} `}${fmt(g.vol)} mL${g.drug ? ` ${g.fluid}` : ''} IV over ${fmt(g.t.v)} ${g.t.u === 'h' ? (g.t.v === 1 ? 'hour' : 'hours') : 'minutes'}` }];
    }
    lines.push({ label: 'Tubing', text: `drop factor ${g.df} gtt/mL` });
    const t = T({ n: 'gtt', d: 'min' }, cars, 'drops', s);
    const mins = g.kind === 'rate' ? 60 : g.t.u === 'h' ? g.t.v * 60 : g.t.v;
    return {
      lines, ask: 'How many drops per minute?',
      answer: numberAnswer({ exact: t.exact, rule: 'drops', unit: 'gtt/min', s }),
      steps: [
        { say: `You want drops per minute. The drop factor says ${g.df} drops make 1 mL, so it goes first with gtt on top. Then the ${g.kind === 'rate' ? 'rate' : 'volume over the time'}${g.kind === 'rate' || g.t.u === 'h' ? ', and 1 h = 60 min to finish in minutes' : ''}.`, train: t },
        { say: `${roundingSay(t.exact, t.key, 'drops', s, 'gtt/min')} You can’t count part of a drop.` },
      ],
      formula: `mL × drop factor ÷ minutes = ${fmt(g.kind === 'rate' ? g.rate : g.vol)} × ${g.df} ÷ ${fmt(mins)} = ${fmtApprox(t.exact, 2).text} → ${fmt(t.key)} gtt/min`,
      facts: {},
    };
  },
  generate(rng, s) {
    for (;;) {
      const df = pick(rng, [10, 15, 20, 60]);
      const r = rng();
      let g;
      if (r < 0.5) g = { kind: 'vt', fluid: pick(rng, FLUIDS), vol: pick(rng, [250, 500, 750, 1000, 1000]), t: { v: pick(rng, [2, 3, 4, 5, 6, 8, 10, 12, 24]), u: 'h' }, df };
      else if (r < 0.7) g = { kind: 'vt', drug: pick(rng, ['cefazolin 1 g', 'ceftriaxone 1 g', 'metronidazole 500 mg', 'ampicillin 1 g', 'famotidine 20 mg']), fluid: '0.9% sodium chloride', vol: pick(rng, [50, 100, 150]), t: { v: pick(rng, [20, 30, 45, 60]), u: 'min' }, df };
      else g = { kind: 'rate', fluid: pick(rng, FLUIDS), rate: pick(rng, [50, 60, 75, 80, 100, 120, 125, 150, 175, 200]), df };
      const k = this.build(g, s).answer.key;
      if (k.lt(5) || k.gt(100)) continue;
      // microdrip (60 gtt/mL) tubing is for slow rates, up to about 100 mL/h
      const mlPerHour = g.kind === 'rate' ? g.rate : g.vol / (g.t.u === 'h' ? g.t.v : g.t.v / 60);
      if (df === 60 && mlPerHour > 100) continue;
      return g;
    }
  },
};

// ---------- 11. Infusion time and finish time ----------

const time = {
  id: 'time',
  build(g, s) {
    let cars, lines = [], say, formula;
    if (g.gtt) {
      cars = [car(1, 'min', g.gtt, 'gtt'), car(g.df, 'gtt', 1, 'mL'), load(g.vol, 'mL')];
      lines.push({ label: g.left ? 'In the bag' : 'Order', text: g.left ? `${fmt(g.vol)} mL ${g.fluid} left` : `${g.fluid} ${fmt(g.vol)} mL IV` });
      lines.push({ label: 'Running', text: `by gravity at ${g.gtt} gtt/min, drop factor ${g.df} gtt/mL` });
      say = `You want minutes. ${g.gtt} drops fall each minute, so 1 min over ${g.gtt} gtt goes first, then ${g.df} gtt in 1 mL, then the volume.`;
      formula = `${fmt(g.vol)} mL × ${g.df} ÷ ${g.gtt} gtt/min = ${fmt(Q.of(g.vol).mul(g.df).div(g.gtt).roundTo(1))} min`;
    } else {
      cars = [car(60, 'min', 1, 'h'), car(1, 'h', g.rate, 'mL'), load(g.vol, 'mL')];
      lines.push({ label: g.left ? 'In the bag' : 'Order', text: g.left ? `${fmt(g.vol)} mL ${g.fluid} left, running at ${fmt(g.rate)} mL/h` : `${g.fluid} ${fmt(g.vol)} mL IV at ${fmt(g.rate)} mL/h` });
      say = `You want minutes (it’s easier to split into hours and minutes after). 60 min in 1 h goes first, then the rate turned over so mL is on the bottom (1 h for every ${fmt(g.rate)} mL), then the volume.`;
      formula = `${fmt(g.vol)} mL ÷ ${fmt(g.rate)} mL/h = ${fmtApprox(Q.of(g.vol).div(g.rate), 3).text} h`;
    }
    const t = T({ n: 'min' }, cars, 'whole', s);
    const minutes = Number(t.key.n);
    const dur = fmtDuration(minutes);
    const st = [{ say, train: t }];
    const hrs = Math.floor(minutes / 60), rest = minutes % 60;
    const split = !hrs ? `**${dur}**` : !rest ? `${minutes} ÷ 60 = **${dur}**` : `${hrs} × 60 = ${hrs * 60} min, plus ${rest} min left over, so **${dur}**`;
    st.push({ say: `${roundingSay(t.exact, t.key, 'whole', s, 'min')} In hours and minutes: ${split}.` });
    if (g.ask === 'finish') {
      lines.push({ label: g.left ? 'Now' : 'Started', text: fmtClock(g.start, s.clock) });
      const end = (g.start + minutes) % 1440;
      const nextDay = g.start + minutes >= 1440;
      st.push({ say: `Add ${dur} to ${fmtClock(g.start, s.clock)}: it finishes at **${fmtClock(end, s.clock)}**${nextDay ? ', the next day' : ''}.` });
      return {
        lines, ask: g.left ? 'What time will the bag run out?' : 'What time will it finish?',
        answer: { type: 'clock', key: end, exactMinutes: t.exact, nextDay },
        steps: st, formula: `${formula}; ${fmtClock(g.start, s.clock)} + ${dur} = ${fmtClock(end, s.clock)}`,
        facts: { minutes: t.exact },
      };
    }
    return {
      lines, ask: 'How long will it take?',
      answer: { type: 'duration', key: minutes, exactMinutes: t.exact },
      steps: st, formula: `${formula} = ${dur}`,
      facts: { minutes: t.exact },
    };
  },
  generate(rng, s) {
    for (;;) {
      const g = { fluid: pick(rng, FLUIDS), ask: chance(rng, 0.55) ? 'finish' : 'dur', left: false };
      if (chance(rng, 0.25)) {
        g.gtt = pick(rng, [12, 15, 20, 21, 25, 28, 30, 31, 40, 42, 50]);
        g.df = pick(rng, [10, 15, 20, 60]);
        g.vol = pick(rng, [100, 250, 500, 750, 1000]);
      } else {
        g.rate = pick(rng, [50, 60, 75, 80, 100, 120, 125, 150, 200, 250]);
        g.vol = pick(rng, [250, 500, 750, 1000, 1000, 1200]);
      }
      if (g.ask === 'finish' && chance(rng, 0.35)) { g.left = true; g.vol = pick(rng, steps(100, 900, 50)); }
      if (g.ask === 'finish') g.start = pick(rng, steps(0, 1435, 5));
      const mins = g.gtt ? Q.of(g.vol).mul(g.df).div(g.gtt) : Q.of(g.vol).mul(60).div(g.rate);
      if (!mins.isInt() || mins.lt(20) || mins.gt(24 * 60)) continue;
      return g;
    }
  },
};

// ---------- 12. Heparin ----------

const HEP_BAGS = [[25000, 250], [25000, 500], [20000, 500], [10000, 250]];
const heparin = {
  id: 'heparin',
  build(g, s) {
    const bagLine = g.bag ? { label: 'Bag', text: `heparin ${fmt(g.bag[0])} units in ${fmt(g.bag[1])} mL D5W` } : null;
    if (g.kind === 'toRate') {
      const t = T({ n: 'mL', d: 'h' }, [car(g.bag[1], 'mL', g.bag[0], 'units'), car(g.order, 'units', 1, 'h')], 'pump', s);
      const per = Q.of(g.bag[0]).div(g.bag[1]);
      return {
        lines: [{ label: 'Order', text: `heparin ${fmt(g.order)} units/h IV` }, bagLine],
        ask: 'What rate do you set on the pump?',
        answer: numberAnswer({ exact: t.exact, rule: 'pump', unit: 'mL/h', s }),
        steps: [{ say: 'You want mL/h, so the bag goes first with mL on top, then the order in units per hour.', train: t }, { say: roundingSay(t.exact, t.key, 'pump', s, 'mL/h') }],
        formula: `${fmt(g.bag[0])} ÷ ${fmt(g.bag[1])} = ${fmtApprox(per, 2).text} units/mL; ${fmt(g.order)} ÷ ${fmtApprox(per, 2).text} = ${fmt(t.key)} mL/h`,
        facts: { perMl: per },
      };
    }
    if (g.kind === 'toUnits') {
      const t = T({ n: 'units', d: 'h' }, [car(g.bag[0], 'units', g.bag[1], 'mL'), car(g.rate, 'mL', 1, 'h')], 'whole', s);
      return {
        lines: [bagLine, { label: 'Running', text: `${fmt(g.rate)} mL/h on the pump` }],
        ask: 'How many units an hour is that?',
        answer: numberAnswer({ exact: t.exact, rule: 'whole', unit: 'units/h', s }),
        steps: [{ say: 'You want units per hour, so the bag goes first with units on top, then the rate.', train: t }, { say: roundingSay(t.exact, t.key, 'whole', s, 'units/h') }],
        formula: `${fmt(g.rate)} mL/h × ${fmtApprox(Q.of(g.bag[0]).div(g.bag[1]), 2).text} units/mL = ${fmt(t.key)} units/h`,
        facts: {},
      };
    }
    const W = weightStep(g.w, s);
    const st = W.step ? [W.step] : [];
    const patient = { label: 'Patient', text: `weighs ${weightText(g.w)}` };
    if (g.kind === 'bolus') {
      const unitsT = (kg) => T({ n: 'units' }, [car(g.perKg, 'units', 1, 'kg'), load(kg, 'kg')], 'whole', s);
      const lines = [{ label: 'Order', text: `heparin ${fmt(g.perKg)} units/kg IV bolus` }, patient];
      if (g.ask === 'units') {
        const t = unitsT(W.kg);
        st.push({ say: 'You want units. The order is per kg, so it’s the dose and then the weight.', train: t }, { say: roundingSay(t.exact, t.key, 'whole', s, 'units') });
        return {
          lines, ask: 'How many units is the bolus?',
          answer: numberAnswer({ exact: t.exact, rule: 'whole', unit: 'units', s, alts: g.w.u === 'lb' ? [unitsT(W.exactKg).exact] : [] }),
          steps: st, formula: `${fmt(g.perKg)} units × ${fmt(W.kg)} kg = ${fmt(t.key)} units`, facts: { kg: W.kg },
        };
      }
      lines.push({ label: 'Vial', text: `heparin ${fmt(g.vial)} units/mL` });
      const mlT = (kg) => T({ n: 'mL' }, [car(1, 'mL', g.vial, 'units'), car(g.perKg, 'units', 1, 'kg'), load(kg, 'kg')], 'volume', s);
      const t = mlT(W.kg);
      st.push({ say: `You want mL, so the vial goes first (1 mL holds ${fmt(g.vial)} units), then the dose per kg and the weight.`, train: t }, { say: roundingSay(t.exact, t.key, 'volume', s, 'mL') });
      const units = Q.of(g.perKg).mul(W.kg);
      return {
        lines, ask: 'How many mL do you draw up for the bolus?',
        answer: numberAnswer({ exact: t.exact, rule: 'volume', unit: 'mL', s, alts: [...(g.w.u === 'lb' ? [mlT(W.exactKg).exact] : []), units.roundTo(1).div(g.vial)] }),
        steps: st, formula: `${fmt(g.perKg)} units × ${fmt(W.kg)} kg = ${fmtApprox(units, 2).text} units; ÷ ${fmt(g.vial)} units/mL = ${fmt(t.key)} mL`, facts: { kg: W.kg, units },
      };
    }
    // weight-based infusion
    const rateT = (kg) => T({ n: 'mL', d: 'h' }, [car(g.bag[1], 'mL', g.bag[0], 'units'), car(g.perKg, 'units', 1, ['kg', 'h']), load(kg, 'kg')], 'pump', s);
    const t = rateT(W.kg);
    const uph = Q.of(g.perKg).mul(W.kg);
    st.push({ say: `You want mL/h. The bag goes first with mL on top, then the order (${fmt(g.perKg)} units per kg per hour), then the weight. In between, that’s ${fmtApprox(uph, 2).text} units/h.`, train: t }, { say: roundingSay(t.exact, t.key, 'pump', s, 'mL/h') });
    return {
      lines: [{ label: 'Order', text: `heparin ${fmt(g.perKg)} units/kg/h IV` }, patient, bagLine],
      ask: 'What rate do you set on the pump?',
      answer: numberAnswer({ exact: t.exact, rule: 'pump', unit: 'mL/h', s, alts: [...(g.w.u === 'lb' ? [rateT(W.exactKg).exact] : []), uph.roundTo(1).mul(g.bag[1]).div(g.bag[0])] }),
      steps: st,
      formula: `${fmt(g.perKg)} × ${fmt(W.kg)} kg = ${fmtApprox(uph, 2).text} units/h; ÷ ${fmtApprox(Q.of(g.bag[0]).div(g.bag[1]), 2).text} units/mL = ${fmt(t.key)} mL/h`,
      facts: { kg: W.kg, unitsPerHour: uph },
    };
  },
  generate(rng, s) {
    for (;;) {
      const kind = pick(rng, ['toRate', 'toRate', 'toUnits', 'bolus', 'infusion']);
      const g = { kind };
      if (kind !== 'bolus') g.bag = pick(rng, HEP_BAGS);
      if (kind === 'toRate') g.order = pick(rng, steps(500, 2000, 50));
      if (kind === 'toUnits') g.rate = pick(rng, [...steps(5, 40, 1), 12.5, 17.5, 22.5]);
      if (kind === 'bolus' || kind === 'infusion') g.w = chance(rng, 0.3) ? { v: int(rng, 105, 290), u: 'lb' } : { v: int(rng, 48, 135), u: 'kg' };
      if (kind === 'bolus') { g.perKg = pick(rng, [40, 60, 70, 80]); g.ask = chance(rng, 0.5) ? 'units' : 'mL'; g.vial = pick(rng, [1000, 5000]); }
      if (kind === 'infusion') g.perKg = pick(rng, [12, 14, 15, 18]);
      const k = this.build(g, s).answer.key;
      if (g.ask === 'mL' && (k.lt('0.2') || k.gt(15))) continue;
      if ((kind === 'toRate' || kind === 'infusion') && (k.lt(3) || k.gt(100))) continue;
      if (kind === 'toUnits' && (k.lt(400) || k.gt(2500))) continue;
      return g;
    }
  },
};

// ---------- 13. Titrations ----------

const TITRATE = [
  { drug: 'dopamine', bags: [[400, 250], [800, 500], [800, 250]], perKg: true, doses: [2, 3, 5, 7.5, 10, 12, 15, 20], fluid: 'D5W' },
  { drug: 'dobutamine', bags: [[250, 250], [500, 250], [1000, 250]], perKg: true, doses: [2.5, 5, 7.5, 10, 15, 20], fluid: 'D5W' },
  { drug: 'esmolol', bags: [[2500, 250]], perKg: true, doses: [50, 75, 100, 150, 200], fluid: '0.9% sodium chloride' },
  { drug: 'propofol', bags: [[1000, 100]], perKg: true, doses: [5, 10, 15, 20, 25, 30, 40, 50], fluid: '', vial: true },
  { drug: 'milrinone', bags: [[20, 100], [40, 200]], perKg: true, doses: [0.25, 0.375, 0.5, 0.75], fluid: 'D5W' },
  { drug: 'norepinephrine', bags: [[4, 250], [8, 250], [16, 250]], perKg: false, doses: [2, 4, 5, 6, 8, 10, 12, 15, 20], fluid: 'D5W' },
  { drug: 'nitroglycerin', bags: [[25, 250], [50, 250], [100, 250]], perKg: false, doses: [5, 10, 15, 20, 30, 40, 50, 75, 100], fluid: 'D5W' },
  { drug: 'phenylephrine', bags: [[10, 250], [20, 250], [40, 250]], perKg: false, doses: [20, 40, 50, 60, 80, 100, 150], fluid: '0.9% sodium chloride' },
  { drug: 'epinephrine', bags: [[1, 250], [4, 250]], perKg: false, doses: [1, 2, 3, 4, 5, 8, 10], fluid: '0.9% sodium chloride' },
];

const titration = {
  id: 'titration',
  build(g, s) {
    const W = g.perKg ? weightStep(g.w, s) : null;
    const st = W && W.step ? [W.step] : [];
    const bagText = g.vial ? `${g.drug} ${fmt(g.bag[0])} mg in ${fmt(g.bag[1])} mL` : `${g.drug} ${fmt(g.bag[0])} mg in ${fmt(g.bag[1])} mL ${g.fluid}`;
    const conc = Q.of(g.bag[0]).mul(1000).div(g.bag[1]); // mcg/mL
    const doseUnit = g.perKg ? 'mcg/kg/min' : 'mcg/min';
    const lines = [];
    if (g.kind === 'toRate') {
      lines.push({ label: 'Order', text: `${g.drug} ${fmt(g.dose)} ${doseUnit} IV` });
      if (g.perKg) lines.push({ label: 'Patient', text: `weighs ${weightText(g.w)}` });
      lines.push({ label: 'Bag', text: bagText });
      const cars = [car(g.bag[1], 'mL', g.bag[0], 'mg'), car(1, 'mg', 1000, 'mcg'),
        g.perKg ? car(g.dose, 'mcg', 1, ['kg', 'min']) : car(g.dose, 'mcg', 1, 'min'),
        ...(g.perKg ? [load(W.kg, 'kg')] : []), car(60, 'min', 1, 'h')];
      const t = T({ n: 'mL', d: 'h' }, cars, 'pump', s);
      const perMin = g.perKg ? Q.of(g.dose).mul(W.kg) : Q.of(g.dose);
      st.push({ say: `You want mL/h. The bag goes first (mL on top), then 1 mg = 1,000 mcg, then the dose${g.perKg ? ' and the weight' : ''}, then 60 min in 1 h. Along the way: the bag holds ${fmtApprox(conc, 2).text} mcg in each mL, and the patient gets ${fmtApprox(perMin, 2).text} mcg each minute.`, train: t });
      st.push({ say: roundingSay(t.exact, t.key, 'pump', s, 'mL/h') });
      return {
        lines, note: PRACTICE_NOTE, ask: 'What rate do you set on the pump?',
        answer: numberAnswer({ exact: t.exact, rule: 'pump', unit: 'mL/h', s, alts: W && g.w.u === 'lb' ? [Q.of(g.dose).mul(W.exactKg).mul(60).div(conc)] : [] }),
        steps: st,
        formula: `${fmt(g.bag[0])} mg × 1,000 ÷ ${fmt(g.bag[1])} mL = ${fmtApprox(conc, 2).text} mcg/mL; ${g.perKg ? `${fmt(g.dose)} × ${fmt(W.kg)} kg = ` : ''}${fmtApprox(perMin, 2).text} mcg/min × 60 ÷ ${fmtApprox(conc, 2).text} = ${fmt(t.key)} mL/h`,
        facts: { conc, perMin, kg: W ? W.kg : null },
      };
    }
    // toDose: from the pump rate back to the dose
    lines.push({ label: 'Bag', text: bagText });
    lines.push({ label: 'Running', text: `${fmt(g.rate)} mL/h on the pump` });
    if (g.perKg) lines.push({ label: 'Patient', text: `weighs ${weightText(g.w)}` });
    const cars = [car(1000, 'mcg', 1, 'mg'), car(g.bag[0], 'mg', g.bag[1], 'mL'), car(g.rate, 'mL', 1, 'h'), car(1, 'h', 60, 'min'), ...(g.perKg ? [car(1, [], W.kg, 'kg')] : [])];
    const t = T({ n: 'mcg', d: g.perKg ? ['kg', 'min'] : ['min'] }, cars, 'tenths', s);
    st.push({ say: `You want ${doseUnit}. Start with 1,000 mcg in 1 mg, then the bag (mg on top), then the rate, then 1 h in 60 min${g.perKg ? ', and last 1 over the weight, so kg ends up on the bottom' : ''}.`, train: t });
    st.push({ say: roundingSay(t.exact, t.key, 'tenths', s, doseUnit) });
    return {
      lines, note: PRACTICE_NOTE, ask: `What dose is the patient getting, in ${doseUnit}?`,
      answer: numberAnswer({ exact: t.exact, rule: 'tenths', unit: doseUnit, s, alts: W && g.w.u === 'lb' ? [conc.mul(g.rate).div(60).div(W.exactKg)] : [] }),
      steps: st,
      formula: `${fmtApprox(conc, 2).text} mcg/mL × ${fmt(g.rate)} mL/h ÷ 60${g.perKg ? ` ÷ ${fmt(W.kg)} kg` : ''} = ${fmt(t.key)} ${doseUnit}`,
      facts: { conc, kg: W ? W.kg : null },
    };
  },
  generate(rng, s) {
    for (;;) {
      const d = pick(rng, TITRATE);
      const g = { drug: d.drug, bag: pick(rng, d.bags), perKg: d.perKg, fluid: d.fluid, vial: !!d.vial, kind: chance(rng, 0.7) ? 'toRate' : 'toDose' };
      if (d.perKg) g.w = chance(rng, 0.2) ? { v: int(rng, 105, 290), u: 'lb' } : { v: int(rng, 45, 130), u: 'kg' };
      if (g.kind === 'toRate') g.dose = pick(rng, d.doses);
      else g.rate = pick(rng, [...steps(2, 60, 1), 2.5, 3.5, 4.5, 7.5, 12.5]);
      const p = this.build(g, s);
      const k = p.answer.key;
      if (g.kind === 'toRate' && (k.lt(1) || k.gt(200))) continue;
      if (g.kind === 'toDose') {
        // keep the dose inside the drug's usual list range
        const lo = Math.min(...d.doses), hi = Math.max(...d.doses);
        if (k.lt(lo) || k.gt(hi)) continue;
      }
      return g;
    }
  },
};

// ---------- 14. BSA dosing (Mosteller) ----------

const BSA_DRUGS = [
  { drug: 'methotrexate', u: 'mg', per: [12, 20, 25, 30, 40, 50] },
  { drug: 'vincristine', u: 'mg', per: [1, 1.4, 1.5, 2] },
  { drug: 'cyclophosphamide', u: 'mg', per: [400, 500, 600, 750, 1000] },
  { drug: 'etoposide', u: 'mg', per: [50, 75, 100, 120] },
  { drug: 'acyclovir', u: 'mg', per: [250, 500] },
  { drug: 'doxorubicin', u: 'mg', per: [30, 45, 50, 60, 75] },
  { drug: 'fluorouracil', u: 'mg', per: [300, 400, 500, 600] },
];

const bsa = {
  id: 'bsa',
  build(g, s) {
    const R = Q.of(g.cm).mul(g.kg).div(3600);
    const B = R.sqrtRoundTo('0.01');
    const tB = makeTrain({ n: 'm2' }, [load(g.cm, 'cm'), load(g.kg, 'kg'), car(1, [], 3600, [])], { sqrt: true });
    tB.exact = R; tB.key = B; tB.rule = 'hundredths'; tB.unit = 'm²'; tB.root = true;
    const approx = Math.sqrt(R.toNumber());
    const lines = [{ label: 'Patient', text: `${fmt(g.cm)} cm tall, weighs ${fmt(g.kg)} kg` }];
    const st = [{ say: `Mosteller’s formula: BSA = √(cm × kg ÷ 3,600). Multiply the height by the weight and divide by 3,600: ${fmt(g.cm)} × ${fmt(g.kg)} ÷ 3,600 = ${fmtApprox(R, 4).text}. This one’s a formula rather than units cancelling, which is why the train runs under the square root.`, train: tB },
      { say: `The square root of ${fmtApprox(R, 4).text} is about ${approx.toFixed(4).replace(/0+$/, '')}, rounded to hundredths: **${fmt(B)} m²**.` }];
    if (g.ask === 'bsa') {
      return {
        lines, ask: 'What is the body surface area (BSA)?',
        answer: numberAnswer({ exact: null, sqrtOf: R, rule: 'hundredths', unit: 'm²', s }),
        steps: st, formula: `√(${fmt(g.cm)} × ${fmt(g.kg)} ÷ 3,600) = √${fmtApprox(R, 4).text} = ${fmt(B)} m²`, facts: { bsa: B },
      };
    }
    lines.unshift({ label: 'Order', text: `${g.drug} ${fmt(g.per)} ${g.u}/m² IV` });
    const t = T({ n: g.u }, [car(g.per, g.u, 1, 'm2'), load(B, 'm2')], 'tenths', s);
    st[1].say = st[1].say.replace(/\*\*(.*?)\*\*/, '$1') + ' Use that BSA for the dose.';
    st.push({ say: `Now the dose: ${fmt(g.per)} ${g.u} for every m², times the BSA.`, train: t }, { say: roundingSay(t.exact, t.key, 'tenths', s, g.u) });
    // Also right: the dose worked out with the BSA not rounded, √(per² × R) rounded to tenths.
    const alt = Q.of(g.per).mul(g.per).mul(R).sqrtRoundTo('0.1');
    return {
      lines, note: PRACTICE_NOTE, ask: `How many ${g.u} is the dose?`,
      answer: { ...numberAnswer({ exact: t.exact, rule: 'tenths', unit: g.u, s }), alts: alt.eq(t.key) ? [] : [alt] },
      steps: st, formula: `BSA = ${fmt(B)} m²; ${fmt(g.per)} ${g.u}/m² × ${fmt(B)} m² = ${fmt(t.key)} ${g.u}`, facts: { bsa: B },
    };
  },
  generate(rng, s) {
    const adult = chance(rng, 0.5);
    const g = adult
      ? { cm: int(rng, 150, 195), kg: chance(rng, 0.7) ? int(rng, 45, 130) : pick(rng, steps(45, 130, 0.5)) }
      : { cm: int(rng, 55, 150), kg: pick(rng, steps(4, 45, 0.1)) };
    if (!adult) {
      // keep the child's weight sensible for the height
      const bmi = g.kg / ((g.cm / 100) ** 2);
      if (bmi < 12 || bmi > 24) return this.generate(rng, s);
    } else {
      const bmi = g.kg / ((g.cm / 100) ** 2);
      if (bmi < 17 || bmi > 42) return this.generate(rng, s);
    }
    g.ask = chance(rng, 0.4) ? 'bsa' : 'dose';
    if (g.ask === 'dose') { const d = pick(rng, BSA_DRUGS); g.drug = d.drug; g.u = d.u; g.per = pick(rng, d.per); }
    return g;
  },
};

// ---------- the list ----------

export const TOPICS = [
  { ...metric, name: 'Metric conversions', hint: 'g, mg, mcg, L, mL' },
  { ...household, name: 'Household and weight', hint: 'tsp, oz, lb, inches' },
  { ...tablets, name: 'Tablets and capsules', hint: 'how many to give' },
  { ...liquids, name: 'Oral liquids', hint: 'mg to mL' },
  { ...injections, name: 'Injections', hint: 'mL in the syringe' },
  { ...recon, name: 'Reconstitution', hint: 'powder plus water' },
  { ...weight, name: 'Weight-based doses', hint: 'mg/kg and mg/kg/day' },
  { ...safe, name: 'Safe-dose check', hint: 'is the order safe?' },
  { ...bsa, name: 'BSA dosing', hint: 'Mosteller, mg/m²' },
  { ...pump, name: 'IV pump rates', hint: 'mL/h' },
  { ...drip, name: 'Gravity drip rates', hint: 'gtt/min' },
  { ...time, name: 'Infusion time', hint: 'how long, and when it ends' },
  { ...heparin, name: 'Heparin', hint: 'units/h and mL/h' },
  { ...titration, name: 'Titrations', hint: 'mcg/kg/min and mcg/min' },
];
export const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

export const GROUPS = [
  { id: 'conv', name: 'Conversions', topics: ['metric', 'household'] },
  { id: 'oral', name: 'Tablets, liquids and shots', topics: ['tablets', 'liquids', 'injections', 'recon'] },
  { id: 'weight', name: 'By weight', topics: ['weight', 'safe', 'bsa'] },
  { id: 'iv', name: 'IV lines', topics: ['pump', 'drip', 'time', 'heparin', 'titration'] },
];

// Make a whole problem from a topic's numbers.
export function buildProblem(topicId, given, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const topic = TOPIC[topicId];
  const p = topic.build(given, s);
  p.lines = p.lines.filter(Boolean);
  return { topic: topicId, given, ...p, sig: topicId + ':' + JSON.stringify(given) };
}

export function generateProblem(topicId, rng, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const given = TOPIC[topicId].generate(rng, s);
  return buildProblem(topicId, given, s);
}

// A small seeded random number generator (mulberry32), so a problem can be made again from its seed.
export function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
