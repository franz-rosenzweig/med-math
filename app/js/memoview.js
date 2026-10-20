// The drawings on the memory-trick cards: pencil lines, teal ink and one highlighter yellow, the same as
// the trains. The curves and examples are worked out with the same functions the problems use.
import { Q } from './frac.js';
import { ABG, readTTT, expectedComp, hhExact, hhFloat, satCurve, anionGap } from './abg.js';
import { drawFigure } from './abgview.js';
import { ROUGH, TRICK } from './memo.js';

const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, str, cls = 'mv-text', anchor = 'middle') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}
// text with subscripts and superscripts: "CO_2", "H^+"
function chem(parent, x, y, str, cls = 'mv-chem', anchor = 'middle') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  // _2 is a subscript (digits only), ^+ or ^− a superscript charge
  for (const m of str.matchAll(/([^_^]+)|_(\d+)|\^([+−-])/g)) {
    const span = el('tspan', {}, t);
    if (m[1]) { span.textContent = m[1]; continue; }
    const sub = m[2] != null;
    span.textContent = sub ? m[2] : m[3];
    span.setAttribute('class', 'mv-sub');
    span.setAttribute('dy', sub ? '5' : '-9');
    const back = el('tspan', { dy: sub ? '-5' : '9' }, t);
    back.textContent = '\u200a';
  }
  return t;
}
function svg(w, h, label) {
  return el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'fig memo-fig', role: 'img', 'aria-label': label });
}
function arrow(parent, x1, y1, x2, y2, cls = 'mv-ink') {
  el('line', { x1, y1, x2, y2, class: cls }, parent);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 9;
  el('path', { d: `M${x2} ${y2} L${x2 - s * Math.cos(a - 0.45)} ${y2 - s * Math.sin(a - 0.45)} M${x2} ${y2} L${x2 - s * Math.cos(a + 0.45)} ${y2 - s * Math.sin(a + 0.45)}`, class: cls }, parent);
}
function axis(parent, x0, x1, y, min, max, ticks, fmtTick = String) {
  const x = (v) => x0 + ((v - min) / (max - min)) * (x1 - x0);
  el('line', { x1: x0 - 6, y1: y, x2: x1 + 6, y2: y, class: 'mv-line' }, parent);
  for (const t of ticks) {
    el('line', { x1: x(t), y1: y - 4, x2: x(t), y2: y + 4, class: 'mv-line thin' }, parent);
    text(parent, x(t), y + 20, fmtTick(t), 'mv-small');
  }
  return x;
}
const num = (q) => Number(Q.of(q).toFixedString(4));
const R = ABG.ranges;

const DRAW = {
  twins() {
    const s = svg(520, 170, 'pH 7.35 to 7.45 lined up with PaCO2 35 to 45: the same digits.');
    const x0 = 100, x1 = 490;
    const xa = axis(s, x0, x1, 58, 7.3, 7.5, [7.3, 7.35, 7.4, 7.45, 7.5], (t) => t.toFixed(2));
    el('rect', { x: xa(7.35), y: 46, width: xa(7.45) - xa(7.35), height: 24, rx: 3, class: 'mv-hl' }, s);
    text(s, 20, 63, 'pH', 'mv-label', 'start');
    const xb = axis(s, x0, x1, 128, 30, 50, [30, 35, 40, 45, 50]);
    el('rect', { x: xb(35), y: 116, width: xb(45) - xb(35), height: 24, rx: 3, class: 'mv-hl' }, s);
    text(s, 20, 133, 'PaCO2', 'mv-label', 'start');
    for (const v of [35, 45]) {
      el('line', { x1: xb(v), y1: 82, x2: xb(v), y2: 112, class: 'mv-ink dashed' }, s);
      el('circle', { cx: xb(v), cy: 78, r: 15, class: 'mv-ring' }, s);
      el('circle', { cx: xb(v), cy: 148, r: 15, class: 'mv-ring' }, s);
    }
    text(s, (xb(35) + xb(45)) / 2, 100, 'same digits', 'mv-hand');
    return s;
  },
  bicarb() {
    const s = svg(520, 120, 'HCO3 22 to 26: 24 in the middle, give or take 2.');
    const x = axis(s, 40, 480, 70, 18, 30, [18, 20, 22, 24, 26, 28, 30]);
    el('rect', { x: x(22), y: 58, width: x(26) - x(22), height: 24, rx: 3, class: 'mv-hl' }, s);
    el('line', { x1: x(24), y1: 40, x2: x(24), y2: 84, class: 'mv-ink' }, s);
    text(s, x(24), 32, '24', 'mv-big');
    arrow(s, x(24) - 8, 48, x(22) + 2, 48, 'mv-ink thin');
    arrow(s, x(24) + 8, 48, x(26) - 2, 48, 'mv-ink thin');
    text(s, x(22) - 20, 46, '−2', 'mv-hand');
    text(s, x(26) + 22, 46, '+2', 'mv-hand');
    return s;
  },
  oxygen() {
    const s = svg(520, 220, 'The oxygen curve: at a PaO2 of 80, hemoglobin is about 96% full.');
    const X = (v) => 60 + (v / 120) * 430, Y = (v) => 190 - (v / 100) * 160;
    el('line', { x1: 60, y1: 190, x2: 500, y2: 190, class: 'mv-line' }, s);
    el('line', { x1: 60, y1: 190, x2: 60, y2: 24, class: 'mv-line' }, s);
    for (const v of [0, 20, 40, 60, 80, 100, 120]) text(s, X(v), 208, String(v), 'mv-small');
    for (const v of [50, 100]) text(s, 52, Y(v) + 4, `${v}%`, 'mv-small', 'end');
    el('rect', { x: X(80), y: Y(100), width: X(100) - X(80), height: Y(95) - Y(100), class: 'mv-hl' }, s);
    let d = '';
    for (let p = 1; p <= 120; p += 1) d += `${p === 1 ? 'M' : 'L'}${X(p).toFixed(1)} ${Y(satCurve(p)).toFixed(1)} `;
    el('path', { d, class: 'mv-curve' }, s);
    const at80 = satCurve(80);
    el('path', { d: `M${X(80)} 190 V${Y(at80)} H60`, class: 'mv-ink dashed' }, s);
    el('circle', { cx: X(80), cy: Y(at80), r: 4.5, class: 'mv-dot' }, s);
    text(s, X(80) - 6, Y(at80) + 40, `PaO2 80 → SaO2 about ${Math.round(at80)}%`, 'mv-hand', 'end');
    text(s, 280, 206 - 0, '', 'mv-small');
    text(s, 495, 186, 'PaO2 (mmHg)', 'mv-small', 'end');
    text(s, X(90), Y(100) - 8, 'B to A', 'mv-hand');
    return s;
  },
  'acid-base'() {
    const s = svg(540, 170, 'Carbon dioxide plus water makes carbonic acid, which splits into acid and bicarbonate.');
    const y = 92;
    chem(s, 50, y, 'CO_2'); text(s, 92, y, '+'); chem(s, 132, y, 'H_2O');
    const dbl = (x) => { arrow(s, x, y - 13, x + 42, y - 13, 'mv-line thin'); arrow(s, x + 42, y - 4, x, y - 4, 'mv-line thin'); };
    dbl(168);
    chem(s, 262, y, 'H_2CO_3');
    dbl(312);
    chem(s, 392, y, 'H^+'); text(s, 428, y, '+'); chem(s, 480, y, 'HCO_3^−');
    el('rect', { x: 222, y: y + 14, width: 80, height: 22, rx: 3, class: 'mv-hl' }, s);
    text(s, 262, y + 30, 'carbonic acid', 'mv-hand');
    text(s, 392, y + 30, 'acid', 'mv-hand');
    text(s, 480, y + 30, 'base', 'mv-hand');
    arrow(s, 40, y - 26, 20, 26);
    text(s, 30, 16, 'breathed out', 'mv-hand', 'start');
    return s;
  },
  rome() {
    const s = svg(520, 190, 'Respiratory: pH and PaCO2 go opposite ways. Metabolic: pH and HCO3 go the same way.');
    const row = (y, label, other, up, word) => {
      text(s, 20, y + 6, label, 'mv-label', 'start');
      text(s, 200, y + 6, 'pH', 'mv-label');
      arrow(s, 230, y - 14, 230, y + 16);
      text(s, 320, y + 6, other, 'mv-label');
      if (up) arrow(s, 362, y + 16, 362, y - 14); else arrow(s, 362, y - 14, 362, y + 16);
      text(s, 450, y + 8, word, 'mv-hand big');
    };
    row(60, 'Respiratory', 'PaCO2', true, 'opposite');
    row(140, 'Metabolic', 'HCO3', false, 'equal');
    el('text', { x: 20, y: 30, class: 'mv-big' }, s).textContent = 'R';
    el('text', { x: 20, y: 110, class: 'mv-big' }, s).textContent = 'M';
    return s;
  },
  tictactoe(width) {
    const v = { ph: 7.33, paco2: 30, hco3: 16 };
    const r = readTTT(v);
    return drawFigure({ kind: 'ttt', values: { ph: '7.33', paco2: '30', hco3: '16' }, cols: r.cols, line: r.line, comp: r.comp, side: r.side || null }, width);
  },
  compensation() {
    const s = svg(520, 200, 'The pH moves back toward 7.40 but stops before it crosses.');
    const x = axis(s, 40, 480, 150, 7.25, 7.55, [7.25, 7.3, 7.35, 7.4, 7.45, 7.5, 7.55], (t) => t.toFixed(2));
    el('rect', { x: x(7.35), y: 138, width: x(7.45) - x(7.35), height: 24, rx: 3, class: 'mv-hl soft' }, s);
    el('line', { x1: x(7.4), y1: 104, x2: x(7.4), y2: 162, class: 'mv-line dashed' }, s);
    arrow(s, x(7.28), 124, x(7.38), 124);
    el('line', { x1: x(7.385) + 6, y1: 112, x2: x(7.385) + 6, y2: 136, class: 'mv-stop' }, s);
    text(s, x(7.28), 112, 'acidosis', 'mv-hand');
    text(s, x(7.47), 112, 'never past 7.40', 'mv-hand');
    // lungs: fast, kidneys: slow
    el('path', { d: 'M70 30 q-18 6 -16 34 q2 14 14 8 q6 -4 6 -18 z M84 30 q18 6 16 34 q-2 14 -14 8 q-6 -4 -6 -18 z', class: 'mv-organ' }, s);
    el('line', { x1: 77, y1: 14, x2: 77, y2: 32, class: 'mv-line' }, s);
    text(s, 112, 50, 'lungs: minutes', 'mv-label', 'start');
    el('path', { d: 'M310 26 q22 -10 32 10 q8 18 -6 34 q-12 12 -24 2 q8 -8 2 -18 q-10 -6 -4 -28 z', class: 'mv-organ' }, s);
    text(s, 356, 50, 'kidneys: days', 'mv-label', 'start');
    return s;
  },
  hh() {
    const s = svg(540, 190, 'pH equals 6.1 plus log of HCO3, the kidneys, over 0.03 times PaCO2, the lungs.');
    text(s, 20, 74, `pH = ${Number(ABG.hh.pK)} + log`, 'mv-formula', 'start');
    text(s, 245, 58, 'HCO3', 'mv-formula');
    el('line', { x1: 180, y1: 68, x2: 310, y2: 68, class: 'mv-line' }, s);
    text(s, 245, 94, `${Number(ABG.hh.sol)} × PaCO2`, 'mv-formula');
    text(s, 245, 26, 'kidneys', 'mv-hand');
    text(s, 245, 120, 'lungs', 'mv-hand');
    const ratio = Number(ABG.mid.hco3) / (Number(ABG.hh.sol) * Number(ABG.mid.paco2));
    const ph = hhExact(ABG.mid.hco3, ABG.mid.paco2).toFixedString(2);
    text(s, 340, 50, `${ABG.mid.hco3} ÷ (${Number(ABG.hh.sol)} × ${ABG.mid.paco2}) = ${ratio}`, 'mv-label', 'start');
    text(s, 340, 80, `log ${ratio} ≈ ${Math.log10(ratio).toFixed(1)}`, 'mv-label', 'start');
    text(s, 340, 110, `${Number(ABG.hh.pK)} + ${Math.log10(ratio).toFixed(1)} = ${ph}`, 'mv-label', 'start');
    el('rect', { x: 336, y: 94, width: 160, height: 24, rx: 3, class: 'mv-hl' }, s);
    text(s, 270, 168, '20 to 1 is normal', 'mv-hand big');
    return s;
  },
  winters() {
    const s = svg(520, 170, 'One and a half bicarb plus eight, give or take two. HCO3 12 gives 26, so 24 to 28.');
    text(s, 260, 50, `${Number(ABG.winters.a)} × HCO3 + ${ABG.winters.b} ± ${ABG.winters.tol}`, 'mv-formula big');
    text(s, 260, 84, 'one and a half bicarb, plus eight, give or take two', 'mv-hand');
    const e = num(expectedComp({ kind: 'met-acid', hco3: 12 }));
    const x = axis(s, 90, 430, 128, 18, 34, [18, 22, 26, 30, 34]);
    el('rect', { x: x(e - 2), y: 116, width: x(e + 2) - x(e - 2), height: 24, rx: 3, class: 'mv-hl' }, s);
    text(s, 40, 133, 'HCO3 12', 'mv-label', 'start');
    text(s, x(e), 110, `${e}`, 'mv-label');
    return s;
  },
  rough() {
    const s = svg(520, 230, 'Winters’ expected PaCO2 against the last two digits of the pH: close from 7.15 to 7.34.');
    const X = (ph) => 60 + ((ph - 7.05) / 0.35) * 430, Y = (p) => 190 - ((p - 5) / 40) * 160;
    el('rect', { x: X(Number(ROUGH.from)), y: 24, width: X(Number(ROUGH.to)) - X(Number(ROUGH.from)), height: 166, class: 'mv-hl soft' }, s);
    el('line', { x1: 60, y1: 190, x2: 500, y2: 190, class: 'mv-line' }, s);
    el('line', { x1: 60, y1: 190, x2: 60, y2: 24, class: 'mv-line' }, s);
    for (const t of [7.1, 7.2, 7.3, 7.4]) text(s, X(t), 208, t.toFixed(2), 'mv-small');
    for (const p of [10, 20, 30, 40]) text(s, 52, Y(p) + 4, String(p), 'mv-small', 'end');
    let d = '';
    for (let h = 3; h <= 24; h += 0.25) {
      const p = num(expectedComp({ kind: 'met-acid', hco3: h }));
      const ph = hhFloat(h, p);
      if (ph < 7.05 || ph > 7.4) continue;
      d += `${d ? 'L' : 'M'}${X(ph).toFixed(1)} ${Y(p).toFixed(1)} `;
    }
    el('path', { d, class: 'mv-curve' }, s);
    el('line', { x1: X(7.05), y1: Y(5), x2: X(7.4), y2: Y(40), class: 'mv-line dashed' }, s);
    text(s, X(7.4), Y(30), 'last two digits', 'mv-hand', 'end');
    text(s, X(7.12), Y(30), 'Winters’', 'mv-hand ink');
    text(s, X(Number(ROUGH.from)) + 8, 42, `within about ${ROUGH.within} here`, 'mv-hand', 'start');
    text(s, X(Number(ROUGH.to)) - 4, 186, `${ROUGH.from}–${ROUGH.to}`, 'mv-small', 'end');
    text(s, 495, 186, 'pH', 'mv-small', 'end');
    return s;
  },
  metalk() {
    const s = svg(520, 170, 'Start at 40, add 0.7 for every 1 of extra bicarb: HCO3 34 gives 47.');
    const e = num(expectedComp({ kind: 'met-alk', hco3: 34 }));
    text(s, 260, 42, `${ABG.metAlk.base} + ${Number(ABG.metAlk.k)} × (HCO3 − ${ABG.metAlk.ref}) ± ${ABG.metAlk.tol}`, 'mv-formula big');
    el('path', { d: 'M110 140 H230 L390 90 H450', class: 'mv-curve' }, s);
    text(s, 110, 160, `HCO3 ${ABG.metAlk.ref} → PaCO2 ${ABG.metAlk.base}`, 'mv-label', 'start');
    text(s, 450, 82, `HCO3 34 → ${e}`, 'mv-label', 'end');
    text(s, 250, 104, '+10 bicarb, +7 CO2', 'mv-hand');
    return s;
  },
  respcomp() {
    const P = ABG.resp;
    const s = svg(520, 200, 'Per 10 mmHg of PaCO2: acidosis 1 acute, 3.5 chronic; alkalosis 2 acute, about 4 chronic.');
    text(s, 250, 30, 'acute', 'mv-label'); text(s, 400, 30, 'chronic', 'mv-label');
    text(s, 20, 88, 'Acidosis', 'mv-label', 'start'); text(s, 20, 108, 'HCO3 up', 'mv-small', 'start');
    text(s, 20, 158, 'Alkalosis', 'mv-label', 'start'); text(s, 20, 178, 'HCO3 down', 'mv-small', 'start');
    el('path', { d: 'M180 52 H470 M180 122 H470 M180 192 H470 M180 52 V192 M325 52 V192 M470 52 V192', class: 'mv-line thin' }, s);
    text(s, 252, 100, P.acidAcute, 'mv-big'); text(s, 398, 100, P.acidChronic, 'mv-big');
    text(s, 252, 170, P.alkAcute, 'mv-big'); text(s, 398, 170, `≈${P.alkChronic}`, 'mv-big');
    text(s, 252, 70, 'small', 'mv-hand'); text(s, 398, 70, 'big', 'mv-hand');
    arrow(s, 282, 98, 282, 152, 'mv-ink thin');
    text(s, 300, 130, '×2', 'mv-hand ink', 'start');
    return s;
  },
  gap(width) {
    return drawFigure({ kind: 'gap', na: 140, cl: 104, hco3: 12, ag: num(anionGap(140, 104, 12)) }, width);
  },
  albumin() {
    const s = svg(520, 160, 'Albumin 2 is 2 below 4; 2 times 2.5 is 5 to add back to the gap.');
    const k = Number(ABG.gap.alb), ref = Number(ABG.gap.albRef);
    const x = axis(s, 60, 460, 110, 1, 5, [1, 2, 3, 4, 5]);
    text(s, 30, 115, 'albumin', 'mv-small', 'start');
    el('circle', { cx: x(ref), cy: 110, r: 6, class: 'mv-dot' }, s);
    el('circle', { cx: x(2), cy: 110, r: 6, class: 'mv-dot open' }, s);
    arrow(s, x(ref) - 6, 88, x(2) + 6, 88, 'mv-line');
    text(s, (x(ref) + x(2)) / 2, 78, `${ref - 2} g/dL low`, 'mv-hand');
    text(s, 260, 40, `${ref - 2} × ${k} = add ${(ref - 2) * k} to the gap`, 'mv-formula');
    return s;
  },
  letters(_w, t) {
    const L = t.letters;
    const s = svg(520, 34 * L.length + 16, `${t.title}: ${L.map(([l, w]) => `${l}, ${w}`).join('; ')}`);
    L.forEach(([l, w], i) => {
      text(s, 30, 36 + i * 34, l, 'mv-letter');
      text(s, 60, 34 + i * 34, w, 'mv-label', 'start');
    });
    return s;
  },
  pf() {
    const s = svg(520, 190, 'P over F: PaO2 divided by FiO2 as a fraction. Room air: 100 ÷ 0.21 is about 476.');
    text(s, 70, 50, 'PaO2', 'mv-formula'); el('line', { x1: 30, y1: 60, x2: 110, y2: 60, class: 'mv-line' }, s); text(s, 70, 84, 'FiO2', 'mv-formula');
    text(s, 140, 54, '100 ÷ 0.21 ≈ ' + Math.round(100 / 0.21), 'mv-label', 'start');
    text(s, 140, 82, '40% oxygen → 0.40', 'mv-hand', 'start');
    const x = axis(s, 40, 480, 150, 0, 600, [0, 100, 200, 300, 400, 500, 600]);
    el('rect', { x: x(400), y: 138, width: x(500) - x(400), height: 24, rx: 3, class: 'mv-hl' }, s);
    el('line', { x1: x(300), y1: 126, x2: x(300), y2: 162, class: 'mv-ink' }, s);
    text(s, x(300), 120, '300: Berlin', 'mv-hand');
    text(s, x(450), 130, 'healthy', 'mv-hand');
    return s;
  },
  allen() {
    const s = svg(540, 200, 'Three steps: press both arteries with a fist, open the hand, release the ulnar side and watch the color come back.');
    const hand = (x0, fill, label, step, pressed, fist = false) => {
      const g = el('g', {}, s);
      el('path', { d: `M${x0 + 30} 160 v-50 q0 -10 10 -10 h60 q10 0 10 10 v50 z`, class: `mv-hand-shape ${fill}` }, g);
      // fingers: straight up for an open hand, curled into knuckles for a fist
      for (let i = 0; i < 4; i++) {
        if (fist) el('rect', { x: x0 + 33 + i * 19, y: 88, width: 15, height: 20, rx: 7, class: `mv-hand-shape ${fill}` }, g);
        else el('rect', { x: x0 + 33 + i * 19, y: 52 + (i === 0 || i === 3 ? 10 : 0), width: 15, height: 52 - (i === 0 || i === 3 ? 10 : 0), rx: 7, class: `mv-hand-shape ${fill}` }, g);
      }
      el('rect', { x: x0 + 10, y: 108, width: 16, height: 40, rx: 8, transform: `rotate(-30 ${x0 + 18} 128)`, class: `mv-hand-shape ${fill}` }, g);
      el('line', { x1: x0 + 44, y1: 160, x2: x0 + 44, y2: 186, class: 'mv-artery' }, g);
      el('line', { x1: x0 + 96, y1: 160, x2: x0 + 96, y2: 186, class: 'mv-artery' }, g);
      for (const [px, on] of [[44, pressed[0]], [96, pressed[1]]]) if (on) el('circle', { cx: x0 + px, cy: 176, r: 8, class: 'mv-press' }, g);
      text(s, x0 + 70, 26, step, 'mv-step');
      text(s, x0 + 70, 46, label, 'mv-hand');
      return g;
    };
    hand(10, 'pink', 'fist, press both', '1', [true, true], true);
    hand(190, 'pale', 'open: pale', '2', [true, true]);
    hand(370, 'pink', 'let go ulnar', '3', [true, false]);
    text(s, 466, 198, 'about 5–15 s', 'mv-small');
    text(s, 56, 198, 'radial', 'mv-small'); text(s, 110, 198, 'ulnar', 'mv-small');
    return s;
  },
};
DRAW.mudpiles = DRAW.letters;
DRAW.goldmark = DRAW.letters;

export function drawTrick(id, width = 520) {
  const fn = DRAW[id];
  if (!fn) return null;
  return fn(width, TRICK[id]);
}
