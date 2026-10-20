// Drawings for the blood gas "Show me": the tic-tac-toe board, a number line with a highlighted range,
// the anion gap as two columns of charges, and the review of a "Talk it through" card. Same notebook
// look as the trains: pencil lines, teal ink, one highlighter yellow.
import { fmt } from './fmt.js';

const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, str, cls, anchor = 'middle') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function drawFigure(fig, width = 560) {
  if (fig.kind === 'ttt') return ttt(fig, width);
  if (fig.kind === 'range') return range(fig, width);
  if (fig.kind === 'gap') return gap(fig, width);
  if (fig.kind === 'talk') return talk(fig);
  throw new Error('drawFigure ' + fig.kind);
}

// The tic-tac-toe board: columns Acid, Normal, Base; rows pH, PaCO2, HCO3.
function ttt(f, width) {
  const colW = Math.max(78, Math.min(120, Math.floor((width - 76) / 3)));
  const rowH = 48, top = 34, left = 70;
  const W = left + colW * 3 + 8, H = top + rowH * 3 + 30;
  const COLS = ['acid', 'normal', 'base'];
  const ROWS = ['ph', 'paco2', 'hco3'];
  const NAMES = { ph: 'pH', paco2: 'PaCO2', hco3: 'HCO3' };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'fig ttt', role: 'img' });
  const cx = (col) => left + colW * COLS.indexOf(col) + colW / 2;
  const cy = (row) => top + rowH * ROWS.indexOf(row) + rowH / 2;
  COLS.forEach((c) => text(svg, cx(c), 20, c === 'acid' ? 'Acid' : c === 'base' ? 'Base' : 'Normal', 'ttt-head'));
  ROWS.forEach((r) => text(svg, left - 12, cy(r) + 6, NAMES[r], 'ttt-row', 'end'));
  // the # of a tic-tac-toe board, a little wobbly like pencil
  for (let i = 1; i < 3; i++) {
    const x = left + colW * i;
    el('path', { d: `M${x + 1} ${top - 4} q2 ${rowH * 1.5} -1 ${rowH * 3 + 6}`, class: 'ttt-grid' }, svg);
    const y = top + rowH * i;
    el('path', { d: `M${left - 4} ${y + 1} q${colW * 1.5} -3 ${colW * 3 + 8} 1`, class: 'ttt-grid' }, svg);
  }
  // the line first, so the numbers sit on top of it: three in a row, or the pH with the value that caused it
  const inLine = f.line.filter((r) => f.cols[r] === f.cols[f.line[0]]);
  if (f.line.length && inLine.length === f.line.length) {
    const col = f.cols[f.line[0]];
    const ys = f.line.map(cy);
    el('path', { d: `M${cx(col) - 3} ${Math.min(...ys) - 20} L${cx(col) + 3} ${Math.max(...ys) + 20}`, class: 'ttt-win', pathLength: 1 }, svg);
  } else if (f.line.length) {
    for (const r of f.line) el('ellipse', { cx: cx(f.cols[r]), cy: cy(r) + 1, rx: colW / 2 - 10, ry: rowH / 2 - 8, class: 'ttt-ring' }, svg);
  }
  for (const r of ROWS) {
    const g = el('g', { class: 'ttt-val' + (f.comp === r ? ' comp' : '') }, svg);
    text(g, cx(f.cols[r]), cy(r) + 6, f.values[r], 'ttt-num');
  }
  if (f.side) {
    // a normal pH: an arrow toward the side of 7.40 it's on
    const x0 = cx('normal') + (f.side === 'acid' ? -24 : 24), x1 = cx(f.side) + (f.side === 'acid' ? 14 : -14), y = cy('ph') - 13;
    el('path', { d: `M${x0} ${y} Q${(x0 + x1) / 2} ${y - 12} ${x1} ${y}`, class: 'ttt-arrow' }, svg);
    el('path', { d: `M${x1} ${y} l${f.side === 'acid' ? 8 : -8} -6 M${x1} ${y} l${f.side === 'acid' ? 9 : -9} 3`, class: 'ttt-arrow' }, svg);
  }
  if (f.comp) {
    el('ellipse', { cx: cx(f.cols[f.comp]), cy: cy(f.comp) + 1, rx: colW / 2 - 12, ry: rowH / 2 - 10, class: 'ttt-comp' }, svg);
  }
  const notes = [];
  if (f.line.length) notes.push('teal: the cause');
  if (f.comp && f.cols[f.comp] !== 'normal') notes.push('dashed: making up for it');
  if (f.side) notes.push(`arrow: the ${f.side} side of 7.40`);
  if (notes.length) text(svg, left, H - 6, notes.join(' · '), 'ttt-note', 'start');
  svg.setAttribute('aria-label', `Tic-tac-toe grid: pH ${f.values.ph} in ${f.cols.ph}, PaCO2 ${f.values.paco2} in ${f.cols.paco2}, HCO3 ${f.values.hco3} in ${f.cols.hco3}.`);
  return svg;
}

// A number line with a highlighted range, the middle of it, and the actual value.
function range(f, width) {
  const W = Math.max(280, Math.min(width, 620)), H = 96;
  const pad = 22;
  const x = (v) => pad + ((v - f.min) / (f.max - f.min)) * (W - 2 * pad);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'fig range', role: 'img' });
  const y = 58;
  el('rect', { x: x(f.lo), y: y - 14, width: Math.max(4, x(f.hi) - x(f.lo)), height: 22, rx: 3, class: 'rng-band' }, svg);
  text(svg, (x(f.lo) + x(f.hi)) / 2, y - 20, `${f.band} ${fmtN(f.lo)}–${fmtN(f.hi)}`, 'rng-label');
  el('line', { x1: pad - 6, y1: y, x2: W - pad + 6, y2: y, class: 'rng-axis' }, svg);
  const span = f.max - f.min;
  const step = span > 120 ? 20 : span > 50 ? 10 : span > 20 ? 5 : 2;
  for (let v = Math.ceil(f.min / step) * step; v <= f.max; v += step) {
    el('line', { x1: x(v), y1: y - 4, x2: x(v), y2: y + 4, class: 'rng-tick' }, svg);
    text(svg, x(v), y + 20, String(v), 'rng-num');
  }
  if (f.mid != null) el('line', { x1: x(f.mid), y1: y - 14, x2: x(f.mid), y2: y + 8, class: 'rng-mid' }, svg);
  if (f.mark != null) {
    const mx = x(f.mark);
    el('path', { d: `M${mx} ${y - 2} l-7 -12 h14 z`, class: 'rng-mark' }, svg);
    text(svg, mx, y - 30 > 12 ? y - 32 : 12, `${f.label} ${fmtN(f.mark)}`, 'rng-marklabel');
  }
  svg.setAttribute('aria-label', `${f.band} range ${fmtN(f.lo)} to ${fmtN(f.hi)} ${f.unit}${f.mark != null ? `, actual ${fmtN(f.mark)}` : ''}`);
  return svg;
}
const fmtN = (v) => fmt(Number(v.toFixed(4)));

// The anion gap as two columns of charges: sodium on one side, chloride + bicarbonate + the gap on the other.
function gap(f, width) {
  const W = Math.max(260, Math.min(width, 380)), H = 270;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'fig gapfig', role: 'img' });
  // only the top of the columns is drawn, so the gap is big enough to see
  const cut = Math.max(0, Math.floor((f.cl - 25) / 10) * 10);
  const base = H - 30, scale = 200 / (f.na - cut);
  const colW = Math.min(110, (W - 60) / 2);
  const xL = 30, xR = W - 30 - colW;
  text(svg, xL + colW / 2, 16, '+ charges', 'gap-head');
  text(svg, xR + colW / 2, 16, '− charges', 'gap-head');
  const box = (x, y0, h, label, cls) => {
    el('rect', { x, y: y0 - h, width: colW, height: h, class: `gap-box ${cls}` }, svg);
    if (h >= 18) text(svg, x + colW / 2, y0 - h / 2 + 6, label, 'gap-text');
    else text(svg, x - 6, y0 - h / 2 + 5, label, 'gap-text', 'end');
  };
  box(xL, base, (f.na - cut) * scale, `Na ${f.na}`, 'na');
  box(xR, base, (f.cl - cut) * scale, `Cl ${f.cl}`, 'cl');
  box(xR, base - (f.cl - cut) * scale, f.hco3 * scale, `HCO3 ${f.hco3}`, 'hco3');
  box(xR, base - (f.cl - cut + f.hco3) * scale, f.ag * scale, `gap ${fmtN(f.ag)}`, 'ag');
  if (cut) for (const x of [xL, xR]) el('path', { d: `M${x - 4} ${base - 6} l${colW / 4} -6 l${colW / 4} 6 l${colW / 4} -6 l${colW / 4 + 8} 6`, class: 'gap-break' }, svg);
  el('line', { x1: 10, y1: base, x2: W - 10, y2: base, class: 'gap-floor' }, svg);
  text(svg, W / 2, H - 8, cut ? `mEq/L, to scale above ${cut}` : 'mEq/L, to scale', 'gap-note');
  svg.setAttribute('aria-label', `Sodium ${f.na} on one side; chloride ${f.cl}, bicarbonate ${f.hco3} and a gap of ${fmtN(f.ag)} on the other.`);
  return svg;
}

// The options of a talk card, each with what's good or wrong about it.
function talk(f) {
  const ul = document.createElement('ul');
  ul.className = 'talk-review';
  ul.innerHTML = f.options.map((o) => `<li class="${o.best ? 'best' : ''}">
      <span class="talk-kind">${esc(o.kind)}</span>
      <p class="talk-said">${esc(o.text)}</p>
      <p class="talk-why">${esc(o.why)}</p>
    </li>`).join('');
  return ul;
}
