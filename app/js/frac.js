// Exact fractions (BigInt numerator and denominator). Every answer key in Med Math is worked out with
// these, so there's no floating-point drift anywhere between the numbers in a problem and its key.

const abs = (a) => (a < 0n ? -a : a);
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
// floor(a / b) for BigInts, b > 0
function floorDiv(a, b) {
  const q = a / b;
  return (a % b !== 0n && a < 0n) ? q - 1n : q;
}
export function isqrt(n) {
  if (n < 0n) throw new Error('isqrt of a negative number');
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  // Newton steps to fix up any float error
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) break;
    x = y;
  }
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}

function numberToDecimal(x) {
  if (!Number.isFinite(x)) throw new Error('Not a finite number: ' + x);
  let s = String(x);
  if (/e/i.test(s)) s = x.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

export class Q {
  constructor(n, d = 1n) {
    if (typeof n !== 'bigint' || typeof d !== 'bigint') throw new Error('Q needs BigInts');
    if (d === 0n) throw new Error('Q: zero denominator');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  // From a JS number, a decimal string ("2.2046", "1,000", ".5") or another Q.
  static of(x) {
    if (x instanceof Q) return x;
    if (typeof x === 'bigint') return new Q(x, 1n);
    const s = (typeof x === 'number' ? numberToDecimal(x) : String(x)).trim().replace(/,/g, '');
    const m = /^([-+]?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || ((m[2] || '') === '' && (m[3] || '') === '')) throw new Error('Not a decimal number: ' + x);
    const frac = m[3] || '';
    const n = BigInt((m[2] || '0') + frac) * (m[1] === '-' ? -1n : 1n);
    return new Q(n, 10n ** BigInt(frac.length));
  }

  add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
  div(o) { o = Q.of(o); if (o.n === 0n) throw new Error('Q: divide by zero'); return new Q(this.n * o.d, this.d * o.n); }
  cmp(o) { o = Q.of(o); const a = this.n * o.d, b = o.n * this.d; return a < b ? -1 : a > b ? 1 : 0; }
  eq(o) { return this.cmp(o) === 0; }
  lt(o) { return this.cmp(o) < 0; }
  le(o) { return this.cmp(o) <= 0; }
  gt(o) { return this.cmp(o) > 0; }
  ge(o) { return this.cmp(o) >= 0; }
  isInt() { return this.d === 1n; }
  floor() { return floorDiv(this.n, this.d); }
  toNumber() { return Number(this.n) / Number(this.d); }

  // Round half up to a multiple of step (a positive Q). 31.25 to 1 → 31, 62.5 to 1 → 63.
  roundTo(step) {
    step = Q.of(step);
    const k = this.div(step).add(new Q(1n, 2n)).floor();
    return new Q(k, 1n).mul(step);
  }
  roundPlaces(p) { return this.roundTo(new Q(1n, 10n ** BigInt(p))); }

  // True when the value is an exact decimal with at most p places.
  terminatesWithin(p) { return this.mul(new Q(10n ** BigInt(p), 1n)).isInt(); }

  // Smallest number of decimal places that writes this exactly, up to max (or -1 if it needs more).
  places(max = 12) {
    for (let p = 0; p <= max; p++) if (this.terminatesWithin(p)) return p;
    return -1;
  }

  // √x rounded half up to a multiple of step, exactly: k = floor(√x / step + ½) = ⌊(⌊√⌊4x/step²⌋⌋ + 1) / 2⌋
  sqrtRoundTo(step) {
    step = Q.of(step);
    if (this.n < 0n) throw new Error('sqrt of a negative number');
    const y = this.mul(4).div(step.mul(step));
    const s = isqrt(y.floor());
    const k = (s + 1n) / 2n;
    return new Q(k, 1n).mul(step);
  }

  // offset + log10(this), rounded half up to p decimal places, decided exactly with whole numbers
  // (no floating point in the decision). Used for Henderson-Hasselbalch: 6.1 + log10(HCO3 / (0.03 × PaCO2)).
  offsetLog10Round(offset, p) {
    offset = Q.of(offset);
    if (this.n <= 0n) throw new Error('log10 of a number that is not positive');
    const P = 10n ** BigInt(p);
    // is offset + log10(R) ≥ a/b ?  ⇔  log10(R) ≥ E/D  ⇔  R^D ≥ 10^E, with E/D = a/b − offset
    const atLeast = (a, b) => {
      const e = new Q(a, b).sub(offset);
      const E = e.n, D = e.d;
      const lhs = this.n ** D, rhs = this.d ** D;
      return E >= 0n ? lhs >= rhs * 10n ** E : lhs * 10n ** -E >= rhs;
    };
    const est = offset.toNumber() + Math.log10(this.toNumber());
    let k = BigInt(Math.round(est * Number(P)));
    // the value rounds to k when it is ≥ (2k − 1) / 2P and < (2k + 1) / 2P
    while (!atLeast(2n * k - 1n, 2n * P)) k -= 1n;
    while (atLeast(2n * k + 1n, 2n * P)) k += 1n;
    return new Q(k, P);
  }

  // Fixed decimal string with exactly p places (rounds half up first if needed).
  toFixedString(p) {
    const r = this.roundPlaces(p);
    const scaled = r.n * (10n ** BigInt(p)) / r.d; // exact after rounding
    const neg = scaled < 0n;
    let digits = abs(scaled).toString().padStart(p + 1, '0');
    const int = digits.slice(0, digits.length - p);
    const frac = p ? digits.slice(digits.length - p) : '';
    return (neg ? '-' : '') + int + (p ? '.' + frac : '');
  }

  toString() { return `${this.n}/${this.d}`; }
}

export const q = (x) => Q.of(x);
export const ONE = new Q(1n, 1n);
export const ZERO = new Q(0n, 1n);

// The product of a list of Qs.
export function product(list) {
  return list.reduce((acc, x) => acc.mul(x), ONE);
}
