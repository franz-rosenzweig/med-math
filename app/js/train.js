// The fraction train: dimensional analysis as a chain of fractions ("cars"). Units that show up once
// on top and once on the bottom cancel, and what's left over is the answer's unit. The answer keys
// are worked out by multiplying the cars, exactly.
import { Q, product } from './frac.js';

const arr = (u) => (u == null ? [] : Array.isArray(u) ? u : [u]);

// A fraction car: nv nu over dv du. car(5, 'mL', 250, 'mg') is 5 mL / 250 mg.
export function car(nv, nu, dv = 1, du = []) {
  return { n: { v: Q.of(nv), u: arr(nu) }, d: { v: Q.of(dv), u: arr(du) } };
}
// A plain amount with nothing underneath, like the 500 mg ordered.
export function load(v, u) {
  return { n: { v: Q.of(v), u: arr(u) }, d: null };
}

export function makeTrain(want, cars, extra = {}) {
  return { want: { n: arr(want.n), d: arr(want.d) }, cars, ...extra };
}

// Multiply the cars and cancel the units. Returns the exact value, which unit tokens get struck
// (pairs of {car, side, idx}), and the units that are left over.
export function solve(cars) {
  const value = product(cars.map((c) => c.n.v)).div(product(cars.map((c) => (c.d ? c.d.v : Q.of(1)))));
  const tops = [], bottoms = [];
  cars.forEach((c, i) => {
    c.n.u.forEach((u, j) => tops.push({ car: i, side: 'n', idx: j, u, used: false }));
    if (c.d) c.d.u.forEach((u, j) => bottoms.push({ car: i, side: 'd', idx: j, u, used: false }));
  });
  const strikes = [];
  // Pair each unit on the bottom with the same unit on top in another car, nearest car first
  // (looking left before right), so the pencil strokes come in reading order.
  for (const b of bottoms) {
    const candidates = tops
      .filter((t) => !t.used && t.u === b.u && t.car !== b.car)
      .sort((x, y) => {
        const dx = Math.abs(x.car - b.car), dy = Math.abs(y.car - b.car);
        if (dx !== dy) return dx - dy;
        return x.car - y.car;
      });
    if (!candidates.length) continue;
    const t = candidates[0];
    t.used = b.used = true;
    strikes.push({ a: { car: t.car, side: 'n', idx: t.idx }, b: { car: b.car, side: 'd', idx: b.idx }, u: b.u });
  }
  strikes.sort((x, y) => Math.max(x.a.car, x.b.car) - Math.max(y.a.car, y.b.car));
  return {
    value,
    strikes,
    left: { n: tops.filter((t) => !t.used).map((t) => t.u), d: bottoms.filter((b) => !b.used).map((b) => b.u) },
  };
}

export function sameUnits(a, b) {
  const key = (x) => [...x].sort().join('|');
  return key(a.n) === key(b.n) && key(a.d) === key(b.d);
}

// Work a train out: the exact value, and a check that the leftover units are the wanted ones.
export function runTrain(train) {
  const s = solve(train.cars);
  if (train.sqrt) return { ...s, value: s.value, unitsOk: true };
  return { ...s, unitsOk: sameUnits(s.left, train.want) };
}
