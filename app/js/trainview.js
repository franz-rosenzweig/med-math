// Drawing the fraction train as SVG: an engine that carries the unit you want, one car per fraction,
// pencil strokes through the units that cancel, and a caboose with the answer under a highlighter.
// Long trains wrap onto a second track. With animate on, the cars roll in one by one, the strokes
// are drawn, then the caboose arrives; with reduced motion it's all drawn at once.
import { Q } from './frac.js';
import { fmt, fmtApprox, unitText, unitsText } from './fmt.js';
import { solve } from './train.js';
import { amountText } from './kit.js';

const NS = 'http://www.w3.org/2000/svg';
const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
const SIZE = 17;
const UNIT_GAP = 5;
const CAR_H = 76;
const CAR_PAD = 14;
const GAP = 30;
const ROW_H = 132;
const TOP = 34; // room above the cars for smokestacks, the cupola and notes
const HOOK = 30; // room at the end of a track for the coupler and sign when the train wraps

let ctx2d = null;
function measure(text, bold = false, size = SIZE) {
  if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d');
  ctx2d.font = `${bold ? 700 : 400} ${size}px ${FONT}`;
  return ctx2d.measureText(text).width;
}

function val(v) {
  try { return fmt(v); } catch { const a = fmtApprox(v, 4); return (a.approx ? '≈' : '') + a.text; }
}

// The pieces of one line of a car: the number, then each unit as its own token (so it can be struck).
function lineParts(part) {
  const value = val(part.v);
  const tokens = part.u.map((u) => unitText(u));
  const vw = measure(value);
  const tw = tokens.map((t) => measure(t, true));
  const dot = measure('·', true);
  let w = vw + (tokens.length ? UNIT_GAP : 0);
  tw.forEach((x, i) => { w += x + (i ? dot : 0); });
  return { value, tokens, vw, tw, dot, w };
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, str, cls, anchor = 'start') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}

// Plain-words version of the train for screen readers.
export function trainSpeech(train) {
  const part = (p) => `${val(p.v)} ${p.u.map(unitText).join(' ')}`.trim();
  const cars = train.cars.map((c) => (c.d ? `${part(c.n)} over ${part(c.d)}` : part(c.n))).join(', times ');
  const result = resultText(train);
  if (train.root) return `Square root of ${cars}, equals ${result}`;
  return `${unitsText(train.want.n, train.want.d)} equals ${cars}, equals ${result}`;
}

function resultText(train) {
  const unit = train.unit;
  if (unit === 'tab' || unit === 'cap') return amountText(train.key, unit);
  return `${val(train.key)} ${unit}`.trim();
}

// Build the SVG. opts: { width, animate }. Returns { svg, duration } (duration in ms of the animation).
export function drawTrain(train, { width = 640, animate = false, engineOnly = false } = {}) {
  const sol = train.root ? { strikes: [], left: { n: [], d: [] } } : solve(train.cars);
  const struck = new Set();
  sol.strikes.forEach((s) => { struck.add(`${s.a.car}:n:${s.a.idx}`); struck.add(`${s.b.car}:d:${s.b.idx}`); });

  // --- sizes ---
  const wantText = '? ' + (train.engine || train.unit || unitsText(train.want.n, train.want.d));
  const engineW = Math.max(108, measure(wantText, true) + 62);
  const cars = train.cars.map((c) => {
    const n = lineParts(c.n);
    const d = c.d ? lineParts(c.d) : null;
    return { c, n, d, w: Math.max(64, Math.max(n.w, d ? d.w : 0) + CAR_PAD * 2) };
  });
  const result = engineOnly ? '' : resultText(train);
  const cabooseW = Math.max(108, measure(result, true) + 40);
  const items = engineOnly ? [{ kind: 'engine', w: engineW }]
    : [{ kind: 'engine', w: engineW }, ...cars.map((c, i) => ({ kind: 'car', i, w: c.w, car: c })), { kind: 'caboose', w: cabooseW }];

  // --- wrap into rows ---
  const rows = [[]];
  let x = 0;
  for (const it of items) {
    const gap = it.kind === 'car' && it.i === 0 && train.root ? GAP + 52 : GAP;
    const need = (rows[rows.length - 1].length ? gap : 0) + it.w;
    const limit = it === items[items.length - 1] ? width : width - HOOK;
    if (rows[rows.length - 1].length && x + need > limit) { rows.push([]); x = 0; }
    const row = rows[rows.length - 1];
    x += row.length ? gap : 0;
    it.x = x;
    it.row = rows.length - 1;
    row.push(it);
    x += it.w;
  }
  const contentW = Math.max(...rows.map((r, ri) => r[r.length - 1].x + r[r.length - 1].w + (ri < rows.length - 1 ? HOOK : 0))) + 4;
  const H = rows.length * ROW_H + 6;

  const svg = el('svg', { viewBox: `0 0 ${contentW} ${H}`, width: contentW, height: H, class: 'train' + (animate ? ' anim' : ''), role: 'img', 'aria-label': engineOnly ? `An engine waiting, marked ${wantText}` : trainSpeech(train) });
  const rails = el('g', { class: 't-rails' }, svg);
  rows.forEach((r, ri) => {
    const y = ri * ROW_H + TOP + CAR_H + 18;
    const x1 = r[0].x - 6, x2 = r[r.length - 1].x + r[r.length - 1].w + 6;
    el('line', { x1, y1: y, x2, y2: y, class: 'rail' }, rails);
    for (let tx = x1 + 4; tx < x2; tx += 13) el('line', { x1: tx, y1: y + 1, x2: tx - 3, y2: y + 7, class: 'tie' }, rails);
  });

  // --- timing ---
  const T = { engine: 0, car: (i) => 300 + i * 340 };
  const carsDone = T.car(Math.max(0, cars.length - 1)) + 450;
  const strikeAt = (j) => carsDone + 150 + j * 300;
  const leftAt = strikeAt(sol.strikes.length) + 100;
  const cabooseAt = leftAt + 350;
  const duration = animate ? cabooseAt + 900 : 0;

  const tokenBoxes = {}; // "car:side:idx" → {x0, x1, y}

  const yTop = (it) => it.row * ROW_H + TOP;
  const wheel = (g, cx, cy) => {
    el('circle', { cx, cy, r: 8, class: 'wheel' }, g);
    el('circle', { cx, cy, r: 1.8, class: 'hub' }, g);
  };
  const delay = (g, ms) => { if (animate) g.setAttribute('style', `animation-delay:${ms}ms`); };

  // couplers and the × / = signs between items
  items.forEach((it, k) => {
    if (!k) return;
    const prev = items[k - 1];
    if (prev.row !== it.row) {
      // the train goes on to the next track: a small hook at the end of the row
      const y = yTop(prev) + CAR_H - 14;
      const g = el('g', { class: 't-item' }, svg); delay(g, it.kind === 'car' ? T.car(it.i) : cabooseAt);
      el('path', { d: `M${prev.x + prev.w} ${y} h10`, class: 'coupler' }, g);
      text(g, prev.x + prev.w + 16, y + 5, it.kind === 'caboose' ? '=' : '×', 'sign', 'start');
      el('path', { d: `M${it.x - 12} ${yTop(it) + CAR_H - 14} h12`, class: 'coupler' }, g);
      return;
    }
    const y = yTop(it) + CAR_H - 14;
    const g = el('g', { class: 't-item' }, svg); delay(g, it.kind === 'car' ? T.car(it.i) : cabooseAt);
    el('line', { x1: prev.x + prev.w, y1: y, x2: it.x, y2: y, class: 'coupler' }, g);
    const sign = k === 1 ? '=' : it.kind === 'caboose' ? '=' : '×';
    text(g, (prev.x + prev.w + it.x) / 2, y - 12, sign, 'sign', 'middle');
  });

  for (const it of items) {
    const y0 = yTop(it);
    if (it.kind === 'engine') {
      const g = el('g', { class: 't-item engine' }, svg); delay(g, T.engine);
      const x0 = it.x, w = it.w;
      const cabW = 34;
      // boiler, cab (at the back, on the right), smokestack and cowcatcher (at the front, on the left)
      el('path', { d: `M${x0 + 10} ${y0 + 22} h${w - cabW - 10} v${CAR_H - 22} h-${w - cabW} l-10 -8 v-${CAR_H - 44} q0 -14 10 -14z`, class: 'body ink' }, g);
      el('rect', { x: x0 + w - cabW, y: y0 + 4, width: cabW, height: CAR_H - 4, rx: 4, class: 'body ink' }, g);
      el('rect', { x: x0 + w - cabW + 8, y: y0 + 12, width: cabW - 16, height: 16, rx: 2, class: 'window' }, g);
      el('path', { d: `M${x0 + 20} ${y0 + 22} v-16 h-5 v-6 h20 v6 h-5 v16`, class: 'body ink' }, g);
      el('path', { d: `M${x0} ${y0 + CAR_H} l-8 0 l8 -16z`, class: 'body ink' }, g);
      text(g, x0 + (w - cabW) / 2 + 3, y0 + 22 + (CAR_H - 22) / 2 + 6, wantText, 'want', 'middle');
      wheel(g, x0 + 22, y0 + CAR_H + 4); wheel(g, x0 + (w - cabW) / 2 + 6, y0 + CAR_H + 4); wheel(g, x0 + w - 16, y0 + CAR_H + 4);
      if (animate) {
        const puff = el('g', { class: 'puffs' }, g);
        [0, 1, 2].forEach((p) => el('circle', { cx: x0 + 27, cy: y0 - 2, r: 5 + p, class: 'puff', style: `animation-delay:${200 + p * 380}ms` }, puff));
      }
      continue;
    }
    if (it.kind === 'caboose') {
      const g = el('g', { class: 't-item caboose' }, svg); delay(g, cabooseAt);
      const x0 = it.x, w = it.w;
      el('rect', { x: x0 + w / 2 - 22, y: y0 + 2, width: 44, height: 22, rx: 3, class: 'body' }, g);
      el('rect', { x: x0, y: y0 + 22, width: w, height: CAR_H - 22, rx: 6, class: 'body' }, g);
      const tw = measure(result, true);
      const hl = el('path', { d: `M${x0 + w / 2 - tw / 2 - 8} ${y0 + 41} l${tw + 16} -3 l1 26 l-${tw + 16} 3z`, class: 'hl' }, g);
      if (animate) hl.setAttribute('style', `animation-delay:${cabooseAt + 450}ms`);
      text(g, x0 + w / 2, y0 + 59, result, 'result', 'middle');
      wheel(g, x0 + 18, y0 + CAR_H + 4); wheel(g, x0 + w - 18, y0 + CAR_H + 4);
      if (train.exact && train.key && !(train.exact instanceof Q && train.exact.eq(train.key)) && !train.root) {
        const a = train.exact.terminatesWithin(4) ? fmt(train.exact) : '≈ ' + fmtApprox(train.exact, 2).text;
        text(g, x0 + w / 2, y0 - 2, `${a}, rounded`, 'note', 'middle');
      }
      if (train.root) {
        text(g, x0 + w / 2, y0 - 2, `≈ ${Math.sqrt(train.exact.toNumber()).toFixed(3)}, rounded`, 'note', 'middle');
      }
      continue;
    }
    // a car
    const c = it.car;
    const g = el('g', { class: 't-item car' }, svg); delay(g, T.car(it.i));
    const x0 = it.x, w = it.w;
    el('rect', { x: x0, y: y0, width: w, height: CAR_H, rx: 6, class: 'body' }, g);
    el('line', { x1: x0 + 6, y1: y0 + 5, x2: x0 + w - 6, y2: y0 + 5, class: 'roofline' }, g);
    wheel(g, x0 + 16, y0 + CAR_H + 4); wheel(g, x0 + w - 16, y0 + CAR_H + 4);
    const drawLine = (parts, side, baseY) => {
      let tx = x0 + (w - parts.w) / 2;
      text(g, tx, baseY, parts.value, 'v');
      tx += parts.vw + (parts.tokens.length ? UNIT_GAP : 0);
      parts.tokens.forEach((t, j) => {
        if (j) { text(g, tx, baseY, '·', 'u'); tx += parts.dot; }
        const key = `${it.i}:${side}:${j}`;
        text(g, tx, baseY, t, 'u' + (struck.has(key) ? ' gone' : ''));
        tokenBoxes[key] = { x0: tx, x1: tx + parts.tw[j], y: baseY };
        tx += parts.tw[j];
      });
    };
    if (c.d) {
      drawLine(c.n, 'n', y0 + 30);
      el('line', { x1: x0 + 10, y1: y0 + 40, x2: x0 + w - 10, y2: y0 + 40, class: 'bar' }, g);
      drawLine(c.d, 'd', y0 + 63);
    } else {
      drawLine(c.n, 'n', y0 + 46);
    }
  }

  // pencil strokes through what cancels
  const strikes = el('g', { class: 'strikes' }, svg);
  sol.strikes.forEach((s, j) => {
    for (const end of [s.a, s.b]) {
      const b = tokenBoxes[`${end.car}:${end.side}:${end.idx}`];
      if (!b) continue;
      const len = Math.hypot(b.x1 - b.x0 + 8, 15);
      const p = el('line', { x1: b.x0 - 4, y1: b.y + 3, x2: b.x1 + 4, y2: b.y - 12, class: 'strike', pathLength: 1 }, strikes);
      if (animate) p.setAttribute('style', `animation-delay:${strikeAt(j)}ms`);
      p.dataset.len = len.toFixed(1);
    }
  });
  // a teal underline under what's left: the answer's unit
  if (!train.root) {
    const leftG = el('g', { class: 'leftover' }, svg);
    train.cars.forEach((c, i) => {
      for (const side of ['n', 'd']) {
        const part = side === 'n' ? c.n : c.d;
        if (!part) continue;
        part.u.forEach((u, j) => {
          const key = `${i}:${side}:${j}`;
          if (struck.has(key)) return;
          const b = tokenBoxes[key];
          if (!b) return;
          const p = el('path', { d: `M${b.x0 - 1} ${b.y + 5} q${(b.x1 - b.x0) / 2} 3 ${b.x1 - b.x0 + 2} -1`, class: 'keep', pathLength: 1 }, leftG);
          if (animate) p.setAttribute('style', `animation-delay:${leftAt}ms`);
        });
      }
    });
  }
  // the square root over a Mosteller train
  if (train.root && !engineOnly) {
    const first = items[1], last = items[items.length - 2];
    if (first.row === last.row) {
      const yt = yTop(first) - 12, yb = yTop(first) + CAR_H - 6;
      const vx = first.x - 14, xe = last.x + last.w + 6;
      const g = el('g', { class: 't-item' }, svg); delay(g, T.car(0));
      el('path', { d: `M${vx - 18} ${yTop(first) + 40} l6 -5 L${vx} ${yb} L${vx + 12} ${yt} H${xe}`, class: 'root' }, g);
    }
  }
  return { svg, duration };
}
