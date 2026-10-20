// Writing numbers the way nursing courses want them: always a leading zero (0.5, never .5), never a
// trailing zero (5, never 5.0), and commas in big numbers (25,000 units).
import { Q } from './frac.js';

function group(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function tidy(fixed, { comma = true } = {}) {
  let [int, frac = ''] = fixed.replace('-', '').split('.');
  frac = frac.replace(/0+$/, '');
  const neg = fixed.startsWith('-') && (int !== '0' || frac !== '');
  return (neg ? '-' : '') + (comma ? group(int) : int) + (frac ? '.' + frac : '');
}

// An exact value (it must be a decimal with up to 8 places), written out in full.
export function fmt(x, opts) {
  const v = Q.of(x);
  const p = v.places(8);
  if (p < 0) throw new Error(`fmt: ${v} is not a short decimal; round it first`);
  return tidy(v.toFixedString(p), opts);
}

// A value that may not terminate: exact if it fits in `max` places, otherwise rounded to `max`
// places and marked approximate. Returns { text, approx }.
export function fmtApprox(x, max = 2, opts) {
  const v = Q.of(x);
  const p = v.places(max);
  if (p >= 0) return { text: tidy(v.toFixedString(p), opts), approx: false };
  return { text: tidy(v.toFixedString(max), opts), approx: true };
}

// "about 66.67" style text for a possibly-repeating value.
export function fmtAbout(x, max = 2) {
  const r = fmtApprox(x, max);
  return (r.approx ? '≈ ' : '') + r.text;
}

// Clock time from minutes after midnight. clock: '24' → "07:30", '12' → "7:30 AM".
export function fmtClock(minutes, clock = '24') {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  if (clock === '12') {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  }
  return `${String(h).padStart(2, '0')}:${mm}`;
}

// "6 h 15 min" from minutes.
export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

// Unit tokens to how they're written.
const UNIT_TEXT = { tab: 'tab', cap: 'cap', gtt: 'gtt', 'm2': 'm²' };
export function unitText(u) { return UNIT_TEXT[u] ?? u; }

// A compound unit {n:[...], d:[...]} as text: mcg/kg/min, mg/dose, gtt/min.
export function unitsText(num = [], den = []) {
  const top = num.length ? num.map(unitText).join('·') : '';
  if (!den.length) return top;
  return (top || '1') + '/' + den.map(unitText).join('/');
}
