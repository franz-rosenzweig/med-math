// Reading what someone typed and deciding whether it's right.
import { Q } from './frac.js';
import { applyRule, ruleStep } from './rules.js';

// "0.5", ".5", "1,000", "1/2", "1 1/2", "1½", "10 mL", "15 mL/h" → a Q, or null.
export function parseNumber(input) {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase();
  s = s.replace(/[½]/g, (m, i) => (i > 0 && /\d/.test(s[i - 1]) ? ' 1/2' : '1/2'));
  // drop a unit written after the number (mL, tablets, mcg/kg/min, m², units/h…)
  s = s.replace(/\s*[a-zµ²][a-zµ²/·.\s]*$/i, '').trim();
  if (!s) return null;
  let m;
  if ((m = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s))) {
    if (m[3] === '0') return null;
    return Q.of(m[1]).add(Q.of(m[2]).div(m[3]));
  }
  if ((m = /^(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/.exec(s))) {
    const d = Q.of(m[2]);
    if (d.n === 0n) return null;
    return Q.of(m[1]).div(d);
  }
  if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) return Q.of(s.replace(/,/g, ''));
  if (/^(\d+\.?\d*|\.\d+)$/.test(s)) return Q.of(s.endsWith('.') ? s.slice(0, -1) : s);
  return null;
}

// "7:30", "07:30", "0730", "7:30 pm", "19:30" → minutes after midnight, or null.
// Without AM/PM it's read as 24-hour time; with the 12-hour clock setting either half of the day counts.
export function parseClock(input) {
  let s = String(input ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (!s) return null;
  let ampm = null;
  const am = /\s*(am|pm|a|p)$/.exec(s);
  if (am) { ampm = am[1][0]; s = s.slice(0, am.index).trim(); }
  let h, m;
  let r;
  if ((r = /^(\d{1,2})[:h ](\d{2})$/.exec(s))) { h = +r[1]; m = +r[2]; }
  else if ((r = /^(\d{3,4})$/.exec(s))) { h = Math.floor(+r[1] / 100); m = +r[1] % 100; }
  else if ((r = /^(\d{1,2})$/.exec(s)) && ampm) { h = +r[1]; m = 0; }
  else return null;
  if (m > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ampm === 'p' ? 12 : 0);
    return { minutes: h * 60 + m, ampm: true };
  }
  if (h === 24 && m === 0) h = 0;
  if (h > 23) return null;
  return { minutes: h * 60 + m, ampm: false };
}

function withinHalfStep(x, answer, step) {
  const h = step.div(2);
  if (answer.sqrtOf) {
    // |x − √R| ≤ h  ⇔  (x − h)² ≤ R ≤ (x + h)²
    const lo = x.sub(h), hi = x.add(h);
    const R = answer.sqrtOf;
    return (lo.lt(0) || lo.mul(lo).le(R)) && R.le(hi.mul(hi));
  }
  return x.sub(answer.exact).cmp(0) >= 0 ? x.sub(answer.exact).le(h) : answer.exact.sub(x).le(h);
}

// Judge an answer. Returns { state: 'right' | 'wrong' | 'empty' | 'unclear', note? }.
// 'right' with note 'more' means they gave more decimals than needed (it still rounds to the key);
// note 'alt' means another accepted way of working it (like not rounding the weight first).
export function judge(problem, input, settings) {
  const a = problem.answer;
  if (a.type === 'abg') {
    const d = input?.d, c = input?.c;
    const needC = !a.noComp.includes(a.key.d);
    if (!d || (needC && !a.noComp.includes(d) && !c)) return { state: 'empty' };
    if (d !== a.key.d) return { state: 'wrong' };
    return { state: !needC || c === a.key.c ? 'right' : 'wrong' };
  }
  if (a.type === 'choice') {
    if (!input) return { state: 'empty' };
    return { state: input === a.key ? 'right' : 'wrong' };
  }
  if (a.type === 'duration') {
    const h = String(input?.h ?? '').trim(), m = String(input?.m ?? '').trim();
    if (!h && !m) return { state: 'empty' };
    if ((h && !/^\d+$/.test(h)) || (m && !/^\d+$/.test(m))) return { state: 'unclear' };
    const total = (+h || 0) * 60 + (+m || 0);
    return { state: total === a.key ? 'right' : 'wrong' };
  }
  if (a.type === 'clock') {
    if (!String(input ?? '').trim()) return { state: 'empty' };
    const c = parseClock(input);
    if (!c) return { state: 'unclear' };
    if (c.minutes === a.key) return { state: 'right' };
    if (!c.ampm && settings?.clock === '12' && (c.minutes + 720) % 1440 === a.key) return { state: 'right' };
    return { state: 'wrong' };
  }
  if (!String(input ?? '').trim()) return { state: 'empty' };
  const x = parseNumber(input);
  if (!x) return { state: 'unclear' };
  if (x.eq(a.key)) return { state: 'right' };
  if (a.alts?.some((k) => k.eq(x))) return { state: 'right', note: 'alt' };
  // More decimals than needed is fine when it really is the unrounded answer (not for tablets or
  // drops, where a part tablet or part drop isn't something you can give).
  if (!['tablet', 'drops', 'exact'].includes(a.rule)) {
    const step = ruleStep(a.rule, a.exact ?? Q.of(1), settings);
    const rounded = a.sqrtOf ? x.roundTo(step) : applyRule(a.rule, x, settings);
    if (step && rounded.eq(a.key) && withinHalfStep(x, a, step)) return { state: 'right', note: 'more' };
  }
  return { state: 'wrong' };
}
