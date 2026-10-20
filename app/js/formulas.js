// The second, independent way of working out every answer: the plain textbook formulas
// (D/H × Q, V × drop factor ÷ T and so on) on ordinary numbers, with its own unit tables and its own
// rounding. It shares nothing with topics.js / abg.js / train.js / frac.js / rules.js (only the talk cards'
// content, to look up which answer is marked best). The test runner
// (tools/test.html) checks that both ways agree on thousands of problems.

import { TALK } from './talk.js';

const MCG = { mcg: 1, mg: 1000, g: 1000000, kg: 1000000000 };
const ML = { mL: 1, L: 1000 };
const HOUSEHOLD_ML = { tsp: 5, tbsp: 15, oz: 30 };

// Round half up to dp decimal places, via a decimal exponent so 1.005 → 1.01 and 62.5 → 63.
export function roundDp(x, dp) {
  const clean = Number(x.toPrecision(12));
  const shifted = Number(`${clean}e${dp}`);
  if (!Number.isFinite(shifted)) throw new Error('roundDp: ' + x);
  return Number(`${Math.floor(shifted + 0.5)}e-${dp}`);
}
const roundHalfTab = (x) => Math.floor(Number(x.toPrecision(12)) * 2 + 0.5) / 2;

function settle(rule, x, s) {
  switch (rule) {
    case 'tablet': return roundHalfTab(x);
    case 'volume': {
      const dp = s.volume === 'tenths' ? 1 : s.volume === 'hundredths' ? 2 : (Number(x.toPrecision(12)) < 1 ? 2 : 1);
      return roundDp(x, dp);
    }
    case 'pump': return roundDp(x, s.pump === 'whole' ? 0 : 1);
    case 'kg': return roundDp(x, s.kg === 'hundredths' ? 2 : 1);
    case 'drops': case 'whole': return roundDp(x, 0);
    case 'tenths': return roundDp(x, 1);
    case 'hundredths': return roundDp(x, 2);
    case 'exact': return roundDp(x, 9);
    default: throw new Error('rule? ' + rule);
  }
}

const perLb = (s) => (s.lbPerKg === '2.2046' ? 2.2046 : 2.2);
const kgOf = (w, s) => (w.u === 'kg' ? w.v : settle('kg', w.v / perLb(s), s));
// how many of `to` in one `from` (same kind of unit), e.g. ratio('g', 'mg') = 1000
function ratio(from, to) {
  if (from === to) return 1;
  if (from in MCG && to in MCG) return MCG[from] / MCG[to];
  if (from in ML && to in ML) return ML[from] / ML[to];
  throw new Error(`ratio ${from} → ${to}`);
}

// Returns { type, value, used, mid }: the answer, the numbers the problem must show, and in-between values.
export function byFormula(topic, g, s) {
  switch (topic) {
    case 'metric': {
      return { type: 'number', value: settle('exact', g.v * ratio(g.from, g.to), s), used: [g.v] };
    }
    case 'household': {
      let v, rule = 'tenths';
      if (g.from in HOUSEHOLD_ML) v = g.v * HOUSEHOLD_ML[g.from];
      else if (g.to in HOUSEHOLD_ML) v = g.v / HOUSEHOLD_ML[g.to];
      else if (g.from === 'lb') { v = g.v / perLb(s); rule = 'kg'; }
      else if (g.from === 'kg') v = g.v * perLb(s);
      else if (g.from === 'in') v = g.v * 2.54;
      else if (g.from === 'cm') v = g.v / 2.54;
      return { type: 'number', value: settle(rule, v, s), used: [g.v] };
    }
    case 'tablets': {
      // D/H × Q, with Q = 1 tablet; the order is changed into the tablet's unit first
      const D = g.order.v * ratio(g.order.u, g.have.u);
      return { type: 'number', value: settle('tablet', (D / g.have.v) * 1, s), used: [g.order.v, g.have.v] };
    }
    case 'liquids': case 'injections': {
      const D = g.order.v * ratio(g.order.u, g.have.u);
      const used = [g.order.v, g.have.v];
      if (g.per.v !== 1) used.push(g.per.v);
      return { type: 'number', value: settle('volume', (D / g.have.v) * g.per.v, s), used };
    }
    case 'weight': {
      const kg = kgOf(g.w, s);
      const dosesADay = 24 / g.every;
      const daily = g.per * kg;
      const perDose = g.mode === 'day' ? daily / dosesADay : g.per * kg;
      const used = [g.per, g.w.v];
      if (g.every !== 24) used.push(g.every);
      if (g.ask === 'mL') {
        used.push(g.c.have); if (g.c.per !== 1) used.push(g.c.per);
        return { type: 'number', value: settle('volume', (perDose / g.c.have) * g.c.per, s), used, mid: { kg, daily, perDose } };
      }
      return { type: 'number', value: settle('tenths', perDose, s), used, mid: { kg, daily, perDose } };
    }
    case 'safe': {
      const kg = kgOf(g.w, s);
      const low = g.lo * kg, high = g.hi * kg;
      const ordered = g.basis === 'day' ? g.order * (24 / g.every) : g.order;
      const e = 1e-9 * Math.max(1, high);
      const verdict = ordered < low - e ? 'low' : ordered > high + e ? 'high' : 'safe';
      const used = [g.order, g.w.v, g.lo, g.hi];
      if (g.every !== 24) used.push(g.every);
      return { type: 'choice', value: verdict, used, mid: { kg, low, high, ordered } };
    }
    case 'recon': {
      const amount = g.vial.v * (g.vial.u === 'g' ? 1000 : 1);
      const conc = amount / g.total;
      const used = [g.vial.v, g.add, g.total];
      if (g.ask === 'conc') return { type: 'number', value: settle('tenths', conc, s), used, mid: { conc } };
      used.push(g.order);
      return { type: 'number', value: settle('volume', g.order / conc, s), used, mid: { conc } };
    }
    case 'pump': {
      if (g.kind === 'vt') {
        const hours = g.t.u === 'h' ? g.t.v : g.t.v / 60;
        return { type: 'number', value: settle('pump', g.vol / hours, s), used: [g.vol, g.t.v] };
      }
      const perHour = g.dose.v * (g.dose.per === 'min' ? 60 : 1) * ratio(g.dose.u, g.bag.u);
      const strength = g.bag.amt / g.bag.vol; // per mL
      return { type: 'number', value: settle('pump', perHour / strength, s), used: [g.dose.v, g.bag.amt, g.bag.vol] };
    }
    case 'drip': {
      if (g.kind === 'rate') {
        const raw = (g.rate * g.df) / 60;
        return { type: 'number', value: settle('drops', raw, s), used: [g.rate, g.df], mid: { raw } };
      }
      const minutes = g.t.u === 'h' ? g.t.v * 60 : g.t.v;
      const raw = (g.vol * g.df) / minutes;
      return { type: 'number', value: settle('drops', raw, s), used: [g.vol, g.t.v, g.df], mid: { raw } };
    }
    case 'time': {
      const minutes = settle('whole', g.gtt ? (g.vol * g.df) / g.gtt : (g.vol / g.rate) * 60, s);
      const used = g.gtt ? [g.vol, g.gtt, g.df] : [g.vol, g.rate];
      if (g.ask === 'finish') return { type: 'clock', value: (g.start + minutes) % (24 * 60), used, mid: { minutes } };
      return { type: 'duration', value: minutes, used, mid: { minutes } };
    }
    case 'heparin': {
      const perMl = g.bag ? g.bag[0] / g.bag[1] : null;
      if (g.kind === 'toRate') return { type: 'number', value: settle('pump', g.order / perMl, s), used: [g.order, g.bag[0], g.bag[1]], mid: { perMl } };
      if (g.kind === 'toUnits') return { type: 'number', value: settle('whole', g.rate * perMl, s), used: [g.rate, g.bag[0], g.bag[1]] };
      const kg = kgOf(g.w, s);
      if (g.kind === 'bolus') {
        const units = g.perKg * kg;
        if (g.ask === 'units') return { type: 'number', value: settle('whole', units, s), used: [g.perKg, g.w.v], mid: { kg } };
        return { type: 'number', value: settle('volume', units / g.vial, s), used: [g.perKg, g.w.v, g.vial], mid: { kg, units } };
      }
      const unitsPerHour = g.perKg * kg;
      return { type: 'number', value: settle('pump', unitsPerHour / perMl, s), used: [g.perKg, g.w.v, g.bag[0], g.bag[1]], mid: { kg, unitsPerHour } };
    }
    case 'titration': {
      const mcgPerMl = (g.bag[0] * 1000) / g.bag[1];
      const kg = g.perKg ? kgOf(g.w, s) : 1;
      const used = [g.bag[0], g.bag[1]];
      if (g.perKg) used.push(g.w.v);
      if (g.kind === 'toRate') {
        const mcgPerMin = g.dose * kg;
        used.push(g.dose);
        return { type: 'number', value: settle('pump', (mcgPerMin * 60) / mcgPerMl, s), used, mid: { conc: mcgPerMl, perMin: mcgPerMin } };
      }
      used.push(g.rate);
      return { type: 'number', value: settle('tenths', (g.rate * mcgPerMl) / 60 / kg, s), used, mid: { conc: mcgPerMl } };
    }
    case 'bsa': {
      const bsa = settle('hundredths', Math.sqrt((g.cm * g.kg) / 3600), s);
      if (g.ask === 'bsa') return { type: 'number', value: bsa, used: [g.cm, g.kg], mid: { bsa } };
      return { type: 'number', value: settle('tenths', g.per * bsa, s), used: [g.cm, g.kg, g.per], mid: { bsa } };
    }
    // ----- blood gases -----
    case 'abg': {
      // ROME, on signs: -1 means "pushing toward acid", +1 "toward base", 0 in range
      const s3 = (x, lo, hi, highIsBase) => (x > hi ? (highIsBase ? 1 : -1) : x < lo ? (highIsBase ? -1 : 1) : 0);
      const p = s3(g.ph, 7.35, 7.45, true);
      const r = s3(g.paco2, 35, 45, false); // high CO2 is acid
      const m = s3(g.hco3, 22, 26, true);
      const name = (resp, dir) => `${resp ? 'resp' : 'met'}-${dir < 0 ? 'acid' : 'alk'}`;
      let value = null;
      if (p !== 0) {
        if (r === p && m === p) value = { d: `mixed-${p < 0 ? 'acid' : 'alk'}`, c: 'none' };
        else if (r === p) value = { d: name(true, p), c: m === 0 ? 'uncomp' : 'partial' };
        else if (m === p) value = { d: name(false, p), c: r === 0 ? 'uncomp' : 'partial' };
      } else if (r === 0 && m === 0) value = { d: 'normal', c: 'none' };
      else if (r !== 0 && m !== 0 && r === -m && g.ph !== 7.4) {
        const side = g.ph < 7.4 ? -1 : 1;
        value = { d: name(r === side, side), c: 'full' };
      }
      return { type: 'abg', value, used: [g.ph, g.paco2, g.hco3, ...(g.pao2 ? [g.pao2, g.sao2] : [])] };
    }
    case 'oxygen': {
      if (g.kind === 'class') {
        const v = g.pao2 < 80 ? 'low' : g.pao2 > 100 ? 'high' : 'normal';
        return { type: 'choice', value: v, used: [g.pao2, g.sao2] };
      }
      return { type: 'number', value: settle('whole', g.pao2 / g.fio2, s), used: [g.pao2, g.fio2As === '%' ? Math.round(g.fio2 * 100) : g.fio2] };
    }
    case 'hh': {
      const ph = 6.1 + Math.log(g.hco3 / (0.03 * g.paco2)) / Math.LN10;
      return { type: 'number', value: settle('hundredths', ph, s), used: [g.hco3, g.paco2], mid: { ph } };
    }
    case 'comp': {
      let expected;
      if (g.kind === 'met-acid') expected = 1.5 * g.hco3 + 8;
      else if (g.kind === 'met-alk') expected = 40 + 0.7 * (g.hco3 - 24);
      else if (g.kind === 'resp-acid') expected = 24 + ((g.paco2 - 40) / 10) * (g.chronic ? 3.5 : 1);
      else expected = 24 - ((40 - g.paco2) / 10) * (g.chronic ? 4 : 2);
      const met = g.kind.startsWith('met');
      if (g.ask === 'expected') return { type: 'number', value: settle('tenths', expected, s), used: [met ? g.hco3 : g.paco2], mid: { expected } };
      const actual = met ? g.paco2 : g.hco3;
      const e = 1e-9;
      let v = 'none';
      if (actual > expected + 2 + e) v = met ? 'resp-acid' : 'met-alk';
      else if (actual < expected - 2 - e) v = met ? 'resp-alk' : 'met-acid';
      return { type: 'choice', value: v, used: [g.ph, g.paco2, g.hco3], mid: { expected } };
    }
    case 'gap': {
      const ag = g.na - g.cl - g.hco3;
      const used = [g.na, g.cl, g.hco3];
      if (g.kind === 'high') return { type: 'choice', value: ag > 12 ? 'high' : 'normal', used, mid: { ag } };
      if (g.kind === 'corr') return { type: 'number', value: settle('tenths', ag + 2.5 * (4 - g.alb), s), used: [...used, g.alb], mid: { ag } };
      return { type: 'number', value: settle('whole', ag, s), used, mid: { ag } };
    }
    case 'talk': {
      const card = TALK.find((c) => c.id === g.card);
      const best = card.options.filter((o) => o.kind === 'best');
      return { type: 'choice', value: best.length === 1 ? best[0].id : null, used: [] };
    }
    default: throw new Error('No formula for ' + topic);
  }
}
