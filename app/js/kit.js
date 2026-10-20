// Shared helpers for making problems: random picks, exact trains, answer keys and the words for rounding.
import { Q } from './frac.js';
import { makeTrain, runTrain } from './train.js';
import { applyRule, ruleText, ruleStep } from './rules.js';
import { fmt, fmtApprox, unitsText } from './fmt.js';

export const pick = (rng, a) => a[Math.floor(rng() * a.length)];
export const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const chance = (rng, p) => rng() < p;
export function steps(lo, hi, step) {
  const out = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) out.push(Number((lo + i * step).toFixed(6)));
  return out;
}
export const placesOf = (x) => Q.of(x).places(8);
// An exact Q as a plain JS number (only for exact short decimals).
export function num(x) {
  const v = Q.of(x);
  const p = v.places(8);
  if (p < 0) return null;
  return Number(v.toFixedString(p));
}

export const UNIT_WORD = { tab: ['tablet', 'tablets'], cap: ['capsule', 'capsules'] };
// "0.5 tablet", "2 tablets", "10 mL"
export function amountText(value, unit) {
  const w = UNIT_WORD[unit];
  const t = fmt(value);
  if (!w) return `${t} ${unit}`;
  return `${t} ${Q.of(value).gt(1) ? w[1] : w[0]}`;
}

// Build a train, multiply it out, and refuse to go on if the units don't cancel to what we want.
export function T(want, cars, rule, s, extra = {}) {
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
export function showPlaces(rule, exact, s) {
  const step = ruleStep(rule, exact, s);
  return step ? step.places(4) + 1 : 4;
}
// "31.25 gtt/min, which rounds to whole drops: 31 gtt/min."
export function roundingSay(exact, key, rule, s, unit) {
  const words = UNIT_WORD[unit];
  if (rule === 'exact' || exact.eq(key)) return `That comes out even: **${words ? amountText(key, unit) : `${fmt(key)} ${unit}`}**.`;
  const p = showPlaces(rule, exact, s);
  const a = exact.terminatesWithin(p + 1) ? { text: fmt(exact), approx: false } : fmtApprox(exact, p);
  return `That’s ${a.approx ? 'about ' : ''}${a.text} ${words ? words[1] : unit}, rounded ${ruleText(rule, exact, s)}: **${words ? amountText(key, unit) : `${fmt(key)} ${unit}`}**.`;
}

export function numberAnswer({ exact, rule, unit, s, alts = [], sqrtOf = null }) {
  const key = sqrtOf ? sqrtOf.sqrtRoundTo(ruleStep(rule, Q.of(1), s)) : applyRule(rule, exact, s);
  const altKeys = [];
  for (const a of alts) {
    const k = applyRule(rule, a, s);
    if (!k.eq(key) && !altKeys.some((x) => x.eq(k))) altKeys.push(k);
  }
  return { type: 'number', exact, sqrtOf, key, rule, unit, alts: altKeys, ruleText: ruleText(rule, exact, s) };
}
