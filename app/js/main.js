// Med Math: screens, practice, quiz, formula sheet and settings. Plain ES modules, no build step.
import { TOPICS, TOPIC, GROUPS, generateProblem, buildProblem, seeded, amountText, ABG_IDS, DOSAGE_IDS } from './topics.js';
import { RANGE_TEXT, abgLabel, VARY } from './abg.js';
import { GLOSSARY } from './talk.js';
import { drawFigure } from './abgview.js';
import { judge } from './answer.js';
import { drawTrain } from './trainview.js';
import { fmt, fmtClock, fmtDuration } from './fmt.js';
import { loadSettings, saveSettings, loadProgress, record, resetProgress, storageWorks, loadMemo, saveMemo, resetMemo } from './store.js';
import { showMemorize, memoEntryHTML, speedKey, cardKey } from './memoui.js';
import { TRICK } from './memo.js';
import { ruleText } from './rules.js';
import { Q } from './frac.js';

const view = document.getElementById('view');
const TOPIC_IDS = TOPICS.map((t) => t.id);
const state = {
  settings: loadSettings(TOPIC_IDS),
  progress: loadProgress(),
  memo: loadMemo(),
  storage: storageWorks(),
  practice: null,
  quiz: null,
  timers: [],
};
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- little helpers ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
function clearTimers() { state.timers.forEach(clearTimeout); state.timers = []; }
function later(fn, ms) { const t = setTimeout(fn, ms); state.timers.push(t); return t; }
// ?seed=123 in the address makes the problems repeatable (for checks and screenshots)
let fixedSeed = Number(new URLSearchParams(location.search).get('seed')) || 0;
function randomSeed() {
  if (fixedSeed) return fixedSeed++;
  try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch { return Math.floor(Math.random() * 2 ** 32); }
}

const ICONS = {
  back: '<path d="M14 6l-6 6 6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>',
  sheet: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 15.5h5M10 9h2"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M15 6v12" stroke-dasharray="2 2.5"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  next: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  train: '<path d="M4 15V8h9v7M13 11h5l2 4H4"/><path d="M6 8V5h3v3"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

function unitLabel(a) {
  if (a.unit === 'tab') return 'tablets';
  if (a.unit === 'cap') return 'capsules';
  return a.unit;
}
function keyText(p) {
  const a = p.answer;
  if (a.type === 'number') return a.unit === 'tab' || a.unit === 'cap' ? amountText(a.key, a.unit) : `${a.fixed ? a.key.toFixedString(a.fixed) : fmt(a.key)} ${a.unit}`.trim();
  if (a.type === 'abg') return abgLabel(a.key);
  if (a.type === 'clock') return fmtClock(a.key, state.settings.clock) + (a.nextDay ? ' (the next day)' : '');
  if (a.type === 'duration') return fmtDuration(a.key);
  return a.options.find((o) => o.id === a.key).label;
}
function inputText(p, input) {
  const a = p.answer;
  if (input == null || input === '') return 'no answer';
  if (a.type === 'abg') return input.d ? abgLabel({ d: input.d, c: input.c || 'uncomp' }).replace(/, uncompensated$/, input.c ? ', uncompensated' : '') : 'no answer';
  if (a.type === 'choice') return a.options.find((o) => o.id === input)?.label ?? input;
  if (a.type === 'duration') {
    if (!input.h && !input.m) return 'no answer';
    return `${input.h || 0} h ${input.m || 0} min`;
  }
  if (a.type === 'number') return `${String(input).trim()} ${/[a-z]/i.test(input) ? '' : unitLabel(a)}`.trim();
  return String(input).trim();
}

function topicStats(id) {
  const t = state.progress.topics[id];
  return t && t.total ? t : { right: 0, total: 0 };
}

function ring(id, size = 48) {
  const { right, total } = topicStats(id);
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  const frac = total ? right / total : 0;
  const label = total ? `${Math.round(frac * 100)}` : '';
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
    ${total ? `<circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${(frac * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    ${total ? `<text x="50%" y="50%" dy=".36em" text-anchor="middle" class="ring-num">${label}<tspan class="ring-pct">%</tspan></text>` : '<circle class="ring-dot" cx="50%" cy="50%" r="3"/>'}
  </svg>`;
}

function setTitle(t) { document.title = t ? `${t} · Med Math` : 'Med Math · dosage calculation practice'; }

// ---------- routing ----------

function route() {
  clearTimers();
  const h = location.hash.replace(/^#\/?/, '');
  const [screen, arg, arg2] = h.split('/');
  document.body.dataset.screen = screen || 'home';
  if (screen === 'practice' && TOPIC[arg]) return showPractice(arg);
  if (screen === 'quiz') return showQuiz(arg === 'abg' ? 'abg' : 'mixed');
  if (screen === 'formulas') return showFormulas();
  if (screen === 'settings') return showSettings();
  if (screen === 'memorize') return showMemorize(memoCtx, arg, arg2);
  return showHome();
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

// what the Memorize screens need from here
const memoCtx = {
  view, esc, rich, icon: (n, c) => icon(n, c), $: (sel) => $(sel, view), later, clearTimers, reduced,
  setTitle: (t) => setTitle(t), focusHeading: () => focusHeading(), whenFonts: (fn) => whenFonts(fn),
  memo: () => state.memo, saveMemo: (m) => { state.memo = m; saveMemo(m); },
  seed: () => randomSeed(), seconds: () => (window.__medmath && window.__medmath.speedSeconds) || 60,
};

function focusHeading() {
  const h = $('h1', view);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

// ---------- the train drawings ----------

function trainWidth(box) {
  return Math.max(260, Math.floor(box.getBoundingClientRect().width) - 4);
}

// Render a problem's worked steps into box. Returns nothing; animation timers go in state.timers.
function renderSteps(box, p, { animate = true } = {}) {
  const anim = animate && !reduced();
  box.innerHTML = '';
  const ol = document.createElement('ol');
  ol.className = 'steps';
  box.append(ol);
  const items = p.steps.map((st, i) => {
    const li = document.createElement('li');
    li.className = 'step';
    li.innerHTML = `<span class="step-n" aria-hidden="true">${i + 1}</span><div class="step-body"><p>${rich(st.say)}</p>${st.train || st.fig ? `<div class="figure${st.fig ? ' fig-' + st.fig.kind : ''}"></div>` : ''}</div>`;
    ol.append(li);
    return { li, st };
  });
  const formula = document.createElement('div');
  formula.className = 'formula-way';
  formula.innerHTML = `<span class="fw-label">${esc(p.formulaLabel || 'The formula way')}</span><p>${esc(p.formula)}</p>`;
  if (p.trick && TRICK[p.trick]) formula.insertAdjacentHTML('beforeend', `<a class="trick-link" href="#/memorize/trick/${p.trick}">How to remember this: ${esc(TRICK[p.trick].title)} →</a>`);
  box.append(formula);

  const drawInto = (it, animateIt) => {
    const fig = $('.figure', it.li);
    if (!fig) return 0;
    fig.innerHTML = '';
    if (it.st.fig) {
      fig.append(drawFigure(it.st.fig, trainWidth(fig)));
      fig.dataset.w = trainWidth(fig);
      return 900;
    }
    const { svg, duration } = drawTrain(it.st.train, { width: trainWidth(fig), animate: animateIt });
    fig.append(svg);
    fig.dataset.w = trainWidth(fig);
    return duration;
  };
  box._redraw = () => items.forEach((it) => { if (!it.li.hidden) drawInto(it, false); });

  if (!anim) { items.forEach((it) => drawInto(it, false)); return; }
  items.forEach((it) => { it.li.hidden = true; });
  formula.hidden = true;
  // one step at a time: each train finishes rolling in before the next step shows
  const reveal = (i) => {
    if (i >= items.length) { formula.hidden = false; formula.classList.add('arrive'); return; }
    const it = items[i];
    it.li.hidden = false;
    it.li.classList.add('arrive');
    const d = drawInto(it, true);
    later(() => reveal(i + 1), it.st.train || it.st.fig ? d + 150 : 650);
  };
  reveal(0);
}

// keep the drawings fitted to their box when the window changes size
const resizer = new ResizeObserver((entries) => {
  for (const e of entries) {
    const box = e.target;
    const fig = $('.figure', box);
    if (box._redraw && fig && Math.abs(trainWidth(fig) - Number(fig.dataset.w || 0)) > 16) box._redraw();
  }
});

// ---------- home ----------

function showHome() {
  setTitle('');
  const sample = buildProblem('liquids', { drug: 'amoxicillin', form: 'oral suspension', order: { v: 500, u: 'mg' }, have: { v: 250, u: 'mg' }, per: { v: 5, u: 'mL' }, route: 'PO', how: 'every 8 hours' });
  const recent = state.progress.recent;
  const totalRight = recent.filter((r) => r.ok).length;
  view.innerHTML = `
    <section class="hero">
      <div class="hero-words">
        <h1>Dosage math, worked out <span class="hand">car by car</span>.</h1>
        <p class="lede">Free practice for nursing students, from dosage calculations to blood gases. Every problem reads like the real thing, and every answer comes with the working, as a train where the units cancel.</p>
        <div class="hero-actions">
          <a class="btn primary big ticket" href="#/quiz">${icon('ticket')}<span>Mixed quiz<small>10 problems</small></span></a>
          <a class="btn big" href="#/memorize">${icon('bulb')}<span>Memorize it<small>blood gases</small></span></a>
          <a class="btn big" href="#/formulas">${icon('sheet')}<span>Formula sheet<small>to print</small></span></a>
        </div>
      </div>
      <figure class="hero-train" aria-label="An example train">
        <div class="hero-slip"><span>Order</span> amoxicillin 500 mg PO every 8 hours<br><span>Available</span> 250 mg/5 mL</div>
        <div class="figure" id="hero-fig"></div>
      </figure>
    </section>

    <section class="lines" aria-labelledby="lines-h">
      <h2 id="lines-h">Pick a topic</h2>
      <div class="line-grid">
        ${GROUPS.filter((g) => g.id !== 'abg').map((g) => `
          <div class="line">
            <h3><span class="line-cap" aria-hidden="true"></span>${esc(g.name)}</h3>
            <ul class="stations">
              ${g.topics.map((id) => {
                const t = TOPIC[id], st = topicStats(id);
                return `<li><a class="station" href="#/practice/${id}">
                  ${ring(id)}
                  <span class="st-words"><span class="st-name">${esc(t.name)}</span><span class="st-hint">${esc(t.hint)}</span></span>
                  <span class="st-score">${st.total ? `${st.right} of ${st.total}` : 'new'}</span>
                </a></li>`;
              }).join('')}
            </ul>
          </div>`).join('')}
      </div>
    </section>

    <section class="abg-home" aria-labelledby="abg-h">
      <div class="abg-head">
        <div>
          <h2 id="abg-h"><span class="line-cap" aria-hidden="true"></span>Blood gases</h2>
          <p>Reading an ABG with ROME and tic-tac-toe, oxygen, the Henderson-Hasselbalch equation, compensation, the anion gap, and how to explain it all to a patient.</p>
        </div>
        <a class="btn big ticket" href="#/quiz/abg">${icon('ticket')}<span>Blood gas quiz<small>10 problems</small></span></a>
      </div>
      ${memoEntryHTML(state.memo)}
      <ul class="stations abg-stations">
        ${GROUPS.find((g) => g.id === 'abg').topics.map((id) => {
          const t = TOPIC[id], st = topicStats(id);
          return `<li><a class="station" href="#/practice/${id}">
            ${ring(id)}
            <span class="st-words"><span class="st-name">${esc(t.name)}</span><span class="st-hint">${esc(t.hint)}</span></span>
            <span class="st-score">${st.total ? `${st.right} of ${st.total}` : 'new'}</span>
          </a></li>`;
        }).join('')}
      </ul>
    </section>

    <section class="recent" aria-labelledby="recent-h">
      <h2 id="recent-h">Your last 50</h2>
      ${recent.length ? `<p class="recent-sum">${totalRight} right out of ${recent.length}</p>` : '<p class="recent-sum">Nothing yet. Your answers show up here as you go.</p>'}
      <ol class="tally" aria-label="${recent.length ? `${totalRight} right out of the last ${recent.length}` : 'No answers yet'}">
        ${Array.from({ length: 50 }, (_, i) => {
          const r = recent[i];
          if (!r) return '<li class="empty"></li>';
          return `<li class="${r.ok ? 'ok' : 'miss'}" title="${esc(TOPIC[r.topic]?.name || '')}: ${r.ok ? 'right' : 'missed'}">${r.ok ? '' : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5"/></svg>'}</li>`;
        }).join('')}
      </ol>
    </section>`;
  const fig = $('#hero-fig');
  const draw = (animate) => {
    fig.innerHTML = '';
    const w = Math.floor(fig.getBoundingClientRect().width);
    // on wider screens lay the train out on one track and let it scale down a little; phones keep two tracks
    const { svg } = drawTrain(sample.steps[0].train, { width: w >= 420 ? Math.max(w, 580) : Math.max(300, w), animate: animate && !reduced() });
    fig.append(svg);
    fig.dataset.w = fig.getBoundingClientRect().width;
  };
  const hero = $('.hero-train');
  hero._redraw = () => draw(false);
  resizer.observe(hero);
  whenFonts(() => draw(!state.heroShown));
  state.heroShown = true;
  focusHeading();
}

function whenFonts(fn) {
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(fn, fn);
  else fn();
}

// ---------- the problem card (shared by practice and quiz) ----------

function slipHTML(p, { mode }) {
  const a = p.answer;
  let field;
  if (a.type === 'number') {
    field = `<label class="field"><span class="sr">Your answer, in ${esc(unitLabel(a))}</span>
      <input id="ans" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
      <span class="unit" aria-hidden="true">${esc(unitLabel(a))}</span></label>`;
  } else if (a.type === 'clock') {
    field = `<label class="field"><span class="sr">Your answer, a time of day</span>
      <input id="ans" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${state.settings.clock === '12' ? 'h:mm PM' : 'hh:mm'}" enterkeyhint="done">
      <span class="unit" aria-hidden="true">${state.settings.clock === '12' ? '' : '24-hour'}</span></label>`;
  } else if (a.type === 'duration') {
    field = `<div class="field-pair">
      <label class="field small"><span class="sr">Hours</span><input id="ans" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="next"><span class="unit" aria-hidden="true">h</span></label>
      <label class="field small"><span class="sr">Minutes</span><input id="ans-m" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done"><span class="unit" aria-hidden="true">min</span></label>
    </div>`;
  } else if (a.type === 'abg') {
    const group = (name, label, opts) => `<div class="abg-group" data-name="${name}"><span class="abg-q" id="abg-${name}">${label}</span>
      <div class="choices seg3" role="radiogroup" aria-labelledby="abg-${name}" data-group="${name}">
        ${opts.map((o, i) => `<button type="button" class="choice" role="radio" aria-checked="false" data-id="${o.id}" ${i ? 'tabindex="-1"' : ''}>${esc(o.label)}</button>`).join('')}
      </div></div>`;
    field = `<div class="abg-answer">
      ${group('s', 'The blood is', [{ id: 'normal', label: 'Normal' }, { id: 'acid', label: 'Acidosis' }, { id: 'alk', label: 'Alkalosis' }])}
      ${group('k', 'Caused by', [{ id: 'resp', label: 'Respiratory' }, { id: 'met', label: 'Metabolic' }, { id: 'mixed', label: 'Both (mixed)' }])}
      ${group('c', 'Compensation', [{ id: 'uncomp', label: 'None' }, { id: 'partial', label: 'Partial' }, { id: 'full', label: 'Full' }])}
    </div>`;
  } else {
    field = `<div class="choices${a.options.some((o) => o.label.length > 60) ? ' long' : ''}" role="radiogroup" aria-label="Your answer">
      ${a.options.map((o, i) => `<button type="button" class="choice" role="radio" aria-checked="false" data-id="${o.id}" ${i ? 'tabindex="-1"' : ''}>${esc(o.label)}</button>`).join('')}
    </div>`;
  }
  const buttons = mode === 'practice'
    ? `<button type="submit" class="btn primary" id="check">${icon('check')}Check</button>
       <button type="button" class="btn" id="showme">${icon('eye')}Show me</button>
       <button type="button" class="btn" id="next">Next${icon('next')}</button>`
    : `<button type="submit" class="btn primary" id="qnext">${state.quiz.i === state.quiz.problems.length - 1 ? 'Finish' : 'Next'}${icon('next')}</button>
       <button type="button" class="btn quiet" id="skip">Skip</button>`;
  return `<article class="slip">
    <header class="slip-head"><span class="slip-tag">${esc(TOPIC[p.topic].name)}</span></header>
    <dl class="slip-lines${p.lines.some((l) => l.text.length > 70) ? ' stacked' : ''}">${p.lines.map((l) => `<div><dt>${esc(l.label)}</dt><dd>${esc(l.text)}</dd></div>`).join('')}</dl>
    ${p.ranges ? `<div class="ranges" aria-label="Normal ranges"><span class="ranges-h">Normal</span>${RANGE_TEXT.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('')}</div>` : ''}
    <p class="slip-ask" id="ask">${esc(p.ask)}</p>
    <form class="answer" id="answer-form" aria-labelledby="ask">
      <div class="answer-row">${field}</div>
      <div class="answer-buttons">${buttons}</div>
      <div class="feedback" id="feedback" aria-live="polite"></div>
      <p class="kbd-hint">${mode === 'practice' ? 'Enter checks, and Enter again goes on.' : 'Enter goes on to the next one.'}</p>
    </form>
    ${p.note ? `<p class="slip-note">${esc(p.note)}</p>` : ''}
  </article>`;
}

function readInput(p) {
  const a = p.answer;
  if (a.type === 'choice') return $('.choice[aria-checked="true"]', view)?.dataset.id ?? '';
  if (a.type === 'abg') {
    const pickOf = (g) => $(`[data-group="${g}"] .choice[aria-checked="true"]`, view)?.dataset.id ?? '';
    const st = pickOf('s'), k = pickOf('k');
    const d = st === 'normal' ? 'normal' : st && k ? (k === 'mixed' ? `mixed-${st}` : `${k}-${st}`) : '';
    return { d, c: pickOf('c') };
  }
  if (a.type === 'duration') return { h: $('#ans', view).value, m: $('#ans-m', view).value };
  return $('#ans', view).value;
}

function bindChoices(p) {
  for (const group of $$('.choices', view)) {
    const choices = $$('.choice', group);
    const pickOne = (btn) => {
      choices.forEach((c) => { c.setAttribute('aria-checked', c === btn ? 'true' : 'false'); c.tabIndex = c === btn ? 0 : -1; });
      // a normal reading has no cause or compensation to pick, and a mixed one no compensation
      if (p && p.answer.type === 'abg') {
        const picked = (g) => $(`[data-group="${g}"] .choice[aria-checked="true"]`, view)?.dataset.id;
        const normal = picked('s') === 'normal';
        const setOff = (g, off) => {
          const box = $(`[data-group="${g}"]`, view);
          box.closest('.abg-group').classList.toggle('off', off);
          $$('.choice', box).forEach((c) => { c.disabled = off; if (off) c.setAttribute('aria-checked', 'false'); });
        };
        setOff('k', normal);
        setOff('c', normal || picked('k') === 'mixed');
      }
    };
    choices.forEach((c, i) => {
      c.addEventListener('click', () => pickOne(c));
      c.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { e.preventDefault(); const n = choices[(i + d + choices.length) % choices.length]; if (n.disabled) return; pickOne(n); n.focus(); }
      });
    });
  }
}

function lockInputs() {
  $$('#answer-form input', view).forEach((i) => { i.readOnly = true; });
  $$('.choice', view).forEach((c) => { c.disabled = true; });
}

function emptyMessage(p, state_) {
  if (state_ === 'unclear') {
    if (p.answer.type === 'clock') return state.settings.clock === '12' ? 'Write the time like 3:45 PM.' : 'Write the time like 15:45.';
    return 'That doesn’t look like a number. Try something like 2.5 or 0.75.';
  }
  if (p.answer.type === 'abg') return 'Pick one in each list.';
  return p.answer.type === 'choice' ? 'Pick one first.' : 'Type your answer first.';
}

// ---------- practice ----------

function newPractice(topic) {
  const recent = state.practice && state.practice.topic === topic ? state.practice.recentSigs : [];
  let p;
  for (let tries = 0; tries < 20; tries++) {
    p = generateProblem(topic, seeded(randomSeed()), state.settings);
    if (!recent.includes(p.sig)) break;
  }
  const session = state.practice && state.practice.topic === topic ? state.practice.session : { right: 0, total: 0 };
  state.practice = { topic, problem: p, checked: false, peeked: false, session, recentSigs: [...recent.slice(-8), p.sig] };
}

function showPractice(topic) {
  if (!state.practice || state.practice.topic !== topic) newPractice(topic);
  const t = TOPIC[topic];
  setTitle(t.name);
  renderPractice();
  focusHeading();
}

function renderPractice() {
  clearTimers();
  const pr = state.practice, p = pr.problem, t = TOPIC[pr.topic];
  const st = topicStats(pr.topic);
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">${icon('back')}All topics</a></nav>
    <header class="screen-head">
      <div><h1>${esc(t.name)}</h1><p class="sub">${pr.session.total ? `This round: ${pr.session.right} of ${pr.session.total} right` : 'A new problem every time, as many as you like.'}</p></div>
      <div class="head-ring" title="All time: ${st.right} of ${st.total}">${ring(pr.topic, 56)}<span>${st.total ? `${st.right} of ${st.total}` : 'new'}</span></div>
    </header>
    <div class="practice">
      <div class="practice-left">${slipHTML(p, { mode: 'practice' })}</div>
      <section class="showme" id="showme-panel" aria-label="Show me">
        <div class="showme-head"><h2>Show me</h2><button type="button" class="btn quiet small" id="replay" hidden>${icon('replay')}Play again</button></div>
        <div class="showme-body" id="showme-body">
          <div class="waiting"><div class="figure" id="wait-fig"></div><p>The train for this one shows up here.</p></div>
        </div>
      </section>
    </div>`;
  const body = $('#showme-body');
  resizer.observe(body);
  if (p.topic === 'talk') {
    $('.waiting', body).innerHTML = `<h3 class="gloss-h">Plain words</h3><dl class="glossary">${GLOSSARY.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  }
  const waitFig = $('#wait-fig');
  const waitDraw = () => {
    if (!waitFig) return;
    waitFig.innerHTML = '';
    const a = p.answer;
    const LABEL = { abg: 'ABG', hh: 'pH', oxygen: a.type === 'number' ? 'P/F' : 'O2', comp: a.type === 'number' ? a.unit : '2nd?', gap: a.type === 'number' ? 'gap' : 'gap?', safe: 'safe?' };
    const unit = LABEL[p.topic] || (a.type === 'number' ? a.unit : a.type === 'clock' ? 'time' : a.type === 'duration' ? 'h, min' : '?');
    const { svg } = drawTrain({ want: { n: [], d: [] }, cars: [], unit: unit }, { width: trainWidth(waitFig), engineOnly: true });
    waitFig.append(svg);
  };
  whenFonts(waitDraw);

  const form = $('#answer-form');
  form.addEventListener('submit', (e) => { e.preventDefault(); if (!pr.checked) checkPractice(); else nextPractice(); });
  $('#showme').addEventListener('click', showMePractice);
  $('#next').addEventListener('click', nextPractice);
  $('#replay').addEventListener('click', () => { renderSteps(body, p, { animate: true }); });
  if (p.answer.type === 'choice' || p.answer.type === 'abg') bindChoices(p);
  if (p.answer.type === 'duration') {
    $('#ans').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#ans-m').value && !pr.checked) { e.preventDefault(); $('#ans-m').focus(); } });
  }
  const first = $('#ans') || $('.choice');
  if (first && !matchMedia('(hover: none)').matches) first.focus({ preventScroll: true });
}

function checkPractice() {
  const pr = state.practice, p = pr.problem;
  const input = readInput(p);
  const r = judge(p, input, state.settings);
  const fb = $('#feedback');
  if (r.state === 'empty' || r.state === 'unclear') {
    fb.className = 'feedback hint';
    fb.textContent = emptyMessage(p, r.state);
    return;
  }
  pr.checked = true;
  pr.input = input;
  const ok = r.state === 'right';
  if (!pr.peeked) {
    state.progress = record(state.progress, pr.topic, ok);
    pr.session.total += 1;
    if (ok) pr.session.right += 1;
  }
  lockInputs();
  let msg;
  if (ok) {
    msg = `<strong>Right.</strong> ${esc(keyText(p))}.`;
    if (r.note === 'more') msg = `<strong>Right.</strong> Rounded ${esc(p.answer.ruleText)}, that’s ${esc(keyText(p))}.`;
    if (r.note === 'alt') msg = `<strong>That works.</strong> Rounding along the way the usual way gives ${esc(keyText(p))}, and both count.`;
  } else {
    msg = p.answer.type === 'choice' && p.answer.options.some((o) => o.why) ? '' : `<strong>Not quite.</strong> It’s ${esc(keyText(p))}.`;
  }
  if (pr.peeked) msg += ' <span class="muted">(Not counted, since you looked first.)</span>';
  const chosen = p.answer.type === 'choice' && p.answer.options.find((o) => o.id === input);
  if (chosen && chosen.why) msg = `<strong>${ok ? 'Right.' : 'Not the best one.'}</strong> <span class="why-kind">${esc(chosen.kind)}:</span> ${esc(chosen.why)}${ok ? '' : ' Show me has the best one, and why.'}${pr.peeked ? ' <span class="muted">(Not counted, since you looked first.)</span>' : ''}`;
  fb.className = 'feedback ' + (ok ? 'right' : 'wrong');
  fb.innerHTML = `${icon(ok ? 'check' : 'cross', 'mark')}<span>${msg}</span>`;
  $('#check').hidden = true;
  $('#next').classList.add('primary');
  const all = topicStats(pr.topic);
  $('.head-ring').outerHTML = `<div class="head-ring" title="All time: ${all.right} of ${all.total}">${ring(pr.topic, 56)}<span>${all.total ? `${all.right} of ${all.total}` : 'new'}</span></div>`;
  $('.screen-head .sub').textContent = `This round: ${pr.session.right} of ${pr.session.total} right`;
  if (!ok) $('#showme').classList.add('nudge');
  $('#next').focus({ preventScroll: true });
}

function showMePractice() {
  const pr = state.practice;
  if (!pr.checked) pr.peeked = true;
  const body = $('#showme-body');
  $('#replay').hidden = false;
  renderSteps(body, pr.problem, { animate: true });
  const panel = $('#showme-panel');
  if (panel.getBoundingClientRect().top > window.innerHeight * 0.7) panel.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

function nextPractice() {
  newPractice(state.practice.topic);
  renderPractice();
  window.scrollTo(0, 0);
}

// global keys: Enter goes on to the next problem once this one is checked
document.addEventListener('keydown', (e) => {
  if (document.body.dataset.screen === 'memorize' && !e.defaultPrevented && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey
    && !/^(input|textarea|select)$/i.test(e.target.tagName || '') && (speedKey(e) || cardKey(e))) return;
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'button' || tag === 'a' || tag === 'textarea' || tag === 'select') return;
  if (document.body.dataset.screen === 'practice' && state.practice && state.practice.checked && !e.target.closest('form')) { e.preventDefault(); nextPractice(); }
});

// ---------- quiz ----------

function quizTopics(scope = 'mixed') {
  if (scope === 'abg') return ABG_IDS;
  const list = state.settings.quizTopics;
  return list && list.length ? list : DOSAGE_IDS;
}

function makeQuiz(problems = null, retry = false, scope = 'mixed') {
  if (!problems) {
    const ids = [...quizTopics(scope)];
    const rng = seeded(randomSeed());
    const order = [];
    while (order.length < 10) {
      const round = [...ids];
      for (let i = round.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [round[i], round[j]] = [round[j], round[i]]; }
      order.push(...round);
    }
    const seen = new Set();
    problems = order.slice(0, 10).map((id) => {
      let p;
      for (let k = 0; k < 10; k++) { p = generateProblem(id, seeded(randomSeed()), state.settings); if (!seen.has(p.sig)) break; }
      seen.add(p.sig);
      return p;
    });
  }
  state.quiz = { problems, i: 0, answers: [], done: false, retry, scope };
}

const quizName = (q) => (q.retry ? 'Retry the misses' : q.scope === 'abg' ? 'Blood gas quiz' : 'Mixed quiz');
function showQuiz(scope = 'mixed') {
  if (!state.quiz || state.quiz.scope !== scope) makeQuiz(null, false, scope);
  setTitle(quizName(state.quiz));
  if (state.quiz.done) renderResults(); else renderQuizQuestion();
  focusHeading();
}

function renderQuizQuestion() {
  const qz = state.quiz, p = qz.problems[qz.i];
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">${icon('back')}All topics</a></nav>
    <header class="screen-head">
      <div><h1>${quizName(qz)}</h1><p class="sub">Problem ${qz.i + 1} of ${qz.problems.length}. You’ll see how you did at the end.</p></div>
    </header>
    <ol class="punches" aria-hidden="true">${qz.problems.map((_, i) => `<li class="${i < qz.i ? 'done' : i === qz.i ? 'now' : ''}"></li>`).join('')}</ol>
    <div class="quiz-card">${slipHTML(p, { mode: 'quiz' })}</div>`;
  const form = $('#answer-form');
  const go = (skip) => {
    const input = skip ? '' : readInput(p);
    const r = judge(p, input, state.settings);
    if (!skip && (r.state === 'empty' || r.state === 'unclear')) {
      const fb = $('#feedback');
      fb.className = 'feedback hint';
      fb.textContent = emptyMessage(p, r.state) + (r.state === 'empty' ? ' Or press Skip.' : '');
      return;
    }
    const ok = r.state === 'right';
    qz.answers[qz.i] = { input, ok, note: r.note };
    state.progress = record(state.progress, p.topic, ok);
    qz.i += 1;
    if (qz.i >= qz.problems.length) { qz.done = true; renderResults(); focusHeading(); window.scrollTo(0, 0); }
    else { renderQuizQuestion(); window.scrollTo(0, 0); }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); go(false); });
  $('#skip').addEventListener('click', () => go(true));
  if (p.answer.type === 'choice' || p.answer.type === 'abg') bindChoices(p);
  if (p.answer.type === 'duration') {
    $('#ans').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#ans-m').value) { e.preventDefault(); $('#ans-m').focus(); } });
  }
  const first = $('#ans') || $('.choice');
  if (first && !matchMedia('(hover: none)').matches) first.focus({ preventScroll: true });
}

function renderResults() {
  const qz = state.quiz;
  const n = qz.problems.length;
  const right = qz.answers.filter((a) => a && a.ok).length;
  const misses = qz.problems.filter((_, i) => !qz.answers[i]?.ok);
  const msg = right === n ? 'Every one. Nicely done.' : right >= n - 1 ? 'Just one to look at.' : right >= Math.ceil(n * 0.7) ? 'Close. The misses are below, with their trains.' : 'Worth another go. Open a train below to see how each one works.';
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">${icon('back')}All topics</a></nav>
    <header class="screen-head results-head">
      <div>
        <h1>${qz.retry ? 'Misses, again' : 'Quiz done'}</h1>
        <p class="sub">${esc(msg)}</p>
      </div>
      <div class="score" aria-label="${right} out of ${n}">
        <svg viewBox="0 0 140 100" aria-hidden="true"><path class="score-circle" d="M24 56c-6-28 30-46 62-42 30 4 44 24 36 46-8 22-44 32-74 22C30 76 18 60 28 40"/></svg>
        <span class="score-num">${right}<span>/${n}</span></span>
      </div>
    </header>
    <div class="results-actions">
      ${misses.length ? `<button type="button" class="btn primary" id="retry">${icon('replay')}Retry the misses (${misses.length})</button>` : ''}
      <button type="button" class="btn ${misses.length ? '' : 'primary'}" id="newquiz">${icon('ticket')}New quiz</button>
    </div>
    <ol class="review">
      ${qz.problems.map((p, i) => {
        const a = qz.answers[i] || { input: '', ok: false };
        return `<li class="review-item ${a.ok ? 'ok' : 'miss'}">
          <div class="review-row">
            <span class="review-mark">${icon(a.ok ? 'check' : 'cross', 'mark')}<span class="sr">${a.ok ? 'Right' : 'Missed'}</span></span>
            <div class="review-words">
              <span class="review-topic">${esc(TOPIC[p.topic].name)}</span>
              <span class="review-q">${p.lines.map((l) => `<span class="rq-label">${esc(l.label)}</span> ${esc(l.text)}`).join(' · ')}${p.lines.length ? ' · ' : ''}<b>${esc(p.ask)}</b></span>
              <span class="review-a">You: ${esc(inputText(p, a.input))}${a.ok ? '' : ` · Answer: <mark>${esc(keyText(p))}</mark>`}${a.ok && a.note ? ` · Key: ${esc(keyText(p))}` : ''}</span>
            </div>
            <button type="button" class="btn quiet small review-show" aria-expanded="false" data-i="${i}">${icon('eye')}Show me</button>
          </div>
          <div class="review-steps" hidden></div>
        </li>`;
      }).join('')}
    </ol>`;
  $('#retry')?.addEventListener('click', () => { makeQuiz(misses, true, qz.scope); renderQuizQuestion(); focusHeading(); window.scrollTo(0, 0); });
  $('#newquiz').addEventListener('click', () => { makeQuiz(null, false, qz.scope); renderQuizQuestion(); focusHeading(); window.scrollTo(0, 0); });
  $$('.review-show').forEach((b) => b.addEventListener('click', () => {
    const li = b.closest('.review-item');
    const box = $('.review-steps', li);
    const open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', open ? 'false' : 'true');
    box.hidden = open;
    if (!open) { renderSteps(box, qz.problems[+b.dataset.i], { animate: true }); resizer.observe(box); }
  }));
}

// ---------- formula sheet ----------

const fr = (top, bottom) => `<span class="frac"><span>${top}</span><span>${bottom}</span></span>`;
// a memory hook on the formula sheet, linking to its trick card
const hook = (id, words) => `<a class="hook-link" href="#/memorize/trick/${id}">${esc(words)}</a>`;

function showFormulas() {
  setTitle('Formula sheet');
  const s = state.settings;
  const F = s.lbPerKg;
  const exampleTrain = buildProblem('drip', { kind: 'vt', fluid: 'D5W', vol: 1000, t: { v: 8, u: 'h' }, df: 15 }, s).steps[0].train;
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">${icon('back')}All topics</a></nav>
    <header class="screen-head">
      <div><h1>Formula sheet</h1><p class="sub">Everything on one card, dosage and blood gases. It prints on a few pages.</p></div>
      <button type="button" class="btn" id="print">${icon('print')}Print</button>
    </header>
    <div class="sheet">
      <section class="card wide">
        <h2>The train (dimensional analysis)</h2>
        <p>Start with the unit you want. Line up fractions so every unit you don’t want shows up once on top and once underneath, and it cancels. Multiply across the top, divide by the bottom, and what’s left is the answer’s unit.</p>
        <div class="figure" id="sheet-fig"></div>
        <p class="small">1,000 mL over 8 h with 15 gtt/mL tubing: 15 × 1,000 ÷ 8 ÷ 60 = 31.25, which rounds to 31 gtt/min.</p>
      </section>
      <section class="card">
        <h2>Desired over have</h2>
        <p class="eq">${fr('D', 'H')} × Q = amount to give</p>
        <p><b>D</b> is the dose ordered, <b>H</b> what you have (on the label), <b>Q</b> the quantity it comes in (1 tablet, 5 mL). Make D and H the same unit first.</p>
      </section>
      <section class="card">
        <h2>IV pump</h2>
        <p class="eq">mL/h = ${fr('total mL', 'hours')}</p>
        <p class="eq">mL/h = ${fr('dose per hour', 'amount per mL')}</p>
        <p>Minutes into hours: mL ÷ minutes × 60.</p>
      </section>
      <section class="card">
        <h2>Gravity drip</h2>
        <p class="eq">gtt/min = ${fr('mL × drop factor', 'minutes')}</p>
        <p>Drop factors: 10, 15 or 20 gtt/mL (macro), 60 gtt/mL (micro, where gtt/min equals mL/h). Always round to a whole drop.</p>
      </section>
      <section class="card">
        <h2>Infusion time</h2>
        <p class="eq">hours = ${fr('total mL', 'mL/h')}</p>
        <p class="eq">minutes = ${fr('mL × drop factor', 'gtt/min')}</p>
        <p>The part after the point is a part of an hour: 0.25 h × 60 = 15 min. Finish time = start + time.</p>
      </section>
      <section class="card">
        <h2>By weight</h2>
        <p class="eq">kg = ${fr('lb', fmt(F))}</p>
        <p class="eq">dose = mg/kg × kg</p>
        <p>Per day, divided: daily dose ÷ doses a day (every 6 h is 4, every 8 h is 3, every 12 h is 2).</p>
      </section>
      <section class="card">
        <h2>Safe-dose check</h2>
        <p>Low end = low mg/kg × kg. High end = high mg/kg × kg. Work out the ordered amount the same way (per day or per dose) and see whether it’s inside. Outside the range, hold it and check with the prescriber.</p>
      </section>
      <section class="card">
        <h2>Reconstitution</h2>
        <p class="eq">concentration = ${fr('drug in the vial', 'total mL after mixing')}</p>
        <p>Use the total volume on the label, not the water you add. Then D/H × Q.</p>
      </section>
      <section class="card">
        <h2>Heparin</h2>
        <p class="eq">units/mL = ${fr('units in bag', 'mL in bag')}</p>
        <p class="eq">mL/h = ${fr('units/h', 'units/mL')}  &nbsp; units/h = mL/h × units/mL</p>
        <p>Weight-based: bolus = units/kg × kg; infusion = units/kg/h × kg.</p>
      </section>
      <section class="card">
        <h2>Titrations</h2>
        <p class="eq">mcg/mL = ${fr('mg × 1,000', 'mL')}</p>
        <p class="eq">mL/h = ${fr('mcg/kg/min × kg × 60', 'mcg/mL')}</p>
        <p>Without weight (mcg/min), leave out the kg. Going back: mcg/kg/min = mL/h × mcg/mL ÷ 60 ÷ kg.</p>
      </section>
      <section class="card">
        <h2>BSA (Mosteller)</h2>
        <p class="eq">m² = √ ${fr('cm × kg', '3,600')}</p>
        <p class="eq">dose = mg/m² × m²</p>
        <p>Round the BSA to hundredths before working out the dose.</p>
      </section>
      <section class="card">
        <h2>Conversions</h2>
        <table class="conv">
          <tr><td>1 g</td><td>1,000 mg</td></tr>
          <tr><td>1 mg</td><td>1,000 mcg</td></tr>
          <tr><td>1 L</td><td>1,000 mL</td></tr>
          <tr><td>1 kg</td><td>${fmt(F)} lb</td></tr>
          <tr><td>1 tsp</td><td>5 mL</td></tr>
          <tr><td>1 tbsp</td><td>15 mL</td></tr>
          <tr><td>1 oz</td><td>30 mL</td></tr>
          <tr><td>1 in</td><td>2.54 cm</td></tr>
          <tr><td>1 h</td><td>60 min</td></tr>
        </table>
      </section>
      <section class="card">
        <h2>Rounding (your settings)</h2>
        <ul class="plain">
          <li>Tablets: nearest half</li>
          <li>Liquids: ${s.volume === 'auto' ? 'tenths, or hundredths under 1 mL' : s.volume}</li>
          <li>Drip rates: whole drops</li>
          <li>Pump rates: ${s.pump === 'whole' ? 'whole mL/h' : 'tenths'}</li>
          <li>Weight in kg: ${s.kg}</li>
          <li>Doses in mg, mcg/kg/min: tenths</li>
          <li>Heparin units: whole units</li>
          <li>BSA: hundredths</li>
        </ul>
        <p>Round half up (31.25 → 31, 62.5 → 63), and only at the end unless a step says so.</p>
      </section>
      <section class="card wide abg-card">
        <h2>Blood gases: normal ranges</h2>
        <div class="ranges big">${RANGE_TEXT.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('')}</div>
        <p class="hook">${hook('twins', 'The 35–45 twins: pH and PaCO2 share 35 and 45.')} ${hook('bicarb', 'HCO3: 24, give or take 2.')} ${hook('oxygen', 'PaO2 needs a B (80–100), SaO2 an A (95–100).')}</p>
        <p class="small">${esc(VARY)}</p>
      </section>
      <section class="card">
        <h2>Reading an ABG</h2>
        <ol class="plain">
          <li><b>pH:</b> under 7.35 is acidosis, over 7.45 alkalosis.</li>
          <li><b>PaCO2</b> acts like an acid (high = acid), <b>HCO3</b> like a base (low = acid).</li>
          <li><b>Tic-tac-toe:</b> put all three in Acid, Normal or Base. The one in the pH’s column is the cause. Three in a row is mixed.</li>
          <li><b>ROME:</b> Respiratory Opposite (pH and PaCO2), Metabolic Equal (pH and HCO3).</li>
          <li><b>Compensation:</b> the other value normal is uncompensated; moved the other way with the pH still out is partial; pH back in range is full (its side of 7.40 tells you the cause).</li>
        </ol>
        <p class="hook">${hook('acid-base', 'CO2 is an acid: you breathe acid out.')} ${hook('compensation', 'Lungs fast, kidneys slow, never past 7.40.')}</p>
      </section>
      <section class="card">
        <h2>Henderson-Hasselbalch</h2>
        <p class="eq">pH = 6.1 + log10 ${fr('HCO3', '0.03 × PaCO2')}</p>
        <p>HCO3 24 and PaCO2 40 give a ratio of 20 to 1, and 6.1 + log10(20) = 7.40. A lower ratio is more acidic.</p>
        <p class="hook">${hook('hh', 'Kidneys over lungs. 20 to 1, log 20 ≈ 1.3, 6.1 + 1.3 = 7.4.')}</p>
      </section>
      <section class="card">
        <h2>Expected compensation</h2>
        <ul class="plain">
          <li>Metabolic acidosis (Winters’): PaCO2 = 1.5 × HCO3 + 8, ±2</li>
          <li>Metabolic alkalosis: PaCO2 = 40 + 0.7 × (HCO3 − 24), ±2</li>
          <li>Respiratory acidosis: HCO3 up about 1 (acute) or 3.5 (chronic) per 10 mmHg PaCO2 above 40</li>
          <li>Respiratory alkalosis: HCO3 down about 2 (acute) or 4 (chronic) per 10 mmHg PaCO2 below 40</li>
        </ul>
        <p>Outside the expected range means a second disorder. Sources differ a little on these numbers.</p>
        <p class="hook">${hook('winters', 'One and a half bicarb plus eight, give or take two.')} ${hook('rough', 'Rough check: about the last two digits of the pH (7.13–7.33).')} ${hook('metalk', 'Point seven.')} ${hook('respcomp', '1, 3.5, 2, 4: acute small, chronic big, alkalosis doubles the acute.')}</p>
      </section>
      <section class="card">
        <h2>Anion gap</h2>
        <p class="eq">AG = Na − (Cl + HCO3)</p>
        <p class="eq">corrected = AG + 2.5 × (4 − albumin g/dL)</p>
        <p>Normal is about 8 to 12 mEq/L, and labs vary.</p>
        <p class="hook">${hook('gap', 'The big positive minus the two big negatives, about 10 ± 2.')} ${hook('albumin', 'Add 2.5 per g/dL below 4.')} ${hook('goldmark', 'High gap causes: GOLDMARK (newer), MUDPILES (older).')}</p>
      </section>
      <section class="card">
        <h2>Oxygenation</h2>
        <p class="eq">P/F = ${fr('PaO2', 'FiO2 (a fraction)')}</p>
        <p>PaO2 80–100 mmHg and SaO2 95–100% are normal. FiO2 40% goes in as 0.40. On room air a healthy P/F is about 400 to 500; 300 or less is one of the Berlin criteria for ARDS.</p>
        <p class="hook">${hook('pf', 'P over F, and F is a fraction.')} ${hook('allen', 'Allen test: press both, open, release the ulnar: 5–15 s.')}</p>
      </section>
      <section class="card wide">
        <h2>Plain words, for patients</h2>
        <dl class="glossary cols">${GLOSSARY.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </section>
      <section class="card wide">
        <h2>Writing numbers</h2>
        <p>Always a leading zero: <b>0.5</b> mg, never .5 mg. Never a trailing zero: <b>5</b> mg, never 5.0 mg. Both mistakes can be misread as ten times the dose.</p>
      </section>
    </div>`;
  $('#print').addEventListener('click', () => window.print());
  const fig = $('#sheet-fig');
  const card = fig.closest('.card');
  const draw = () => { fig.innerHTML = ''; fig.append(drawTrain(exampleTrain, { width: trainWidth(fig) }).svg); fig.dataset.w = trainWidth(fig); };
  card._redraw = draw;
  resizer.observe(card);
  whenFonts(draw);
  focusHeading();
}

// ---------- settings ----------

function radios(name, label, options, value, help = '') {
  return `<fieldset class="set">
    <legend>${esc(label)}</legend>
    ${help ? `<p class="help">${esc(help)}</p>` : ''}
    <div class="seg">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${v === value ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
  </fieldset>`;
}

function showSettings() {
  setTitle('Settings');
  const s = state.settings;
  const chosen = new Set(quizTopics());
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">${icon('back')}All topics</a></nav>
    <header class="screen-head"><div><h1>Settings</h1><p class="sub">${state.storage ? 'Saved in this browser.' : 'This browser isn’t saving anything right now, so these last until you close the page.'}</p></div></header>
    <form class="settings" id="settings">
      <section class="card">
        <h2>Rounding</h2>
        <p class="help">Follow your own program’s rules. Tablets always go to the nearest half and drip rates to whole drops.</p>
        ${radios('volume', 'Liquid volumes (mL)', [['auto', 'Tenths, hundredths under 1 mL'], ['tenths', 'Always tenths'], ['hundredths', 'Always hundredths']], s.volume)}
        ${radios('pump', 'Pump rates (mL/h)', [['tenths', 'Tenths'], ['whole', 'Whole numbers']], s.pump)}
        ${radios('kg', 'Weights in kg', [['tenths', 'Tenths'], ['hundredths', 'Hundredths']], s.kg)}
      </section>
      <section class="card">
        <h2>Units and time</h2>
        ${radios('lbPerKg', 'Pounds in a kilogram', [['2.2', '2.2'], ['2.2046', '2.2046']], s.lbPerKg)}
        ${radios('clock', 'Clock', [['24', '24-hour (15:30)'], ['12', '12-hour (3:30 PM)']], s.clock)}
      </section>
      <section class="card">
        <h2>Topics in the mixed quiz</h2>
        <p class="help">Blood gases also have a quiz of their own on the home screen.</p>
        ${GROUPS.map((g) => `<fieldset class="qt-group">
          <legend><label class="check group"><input type="checkbox" name="qg" value="${g.id}"><span>${esc(g.name)}</span></label></legend>
          <div class="checks">
            ${g.topics.map((id) => `<label class="check"><input type="checkbox" name="qt" value="${id}" data-group="${g.id}" ${chosen.has(id) ? 'checked' : ''}><span>${esc(TOPIC[id].name)}</span></label>`).join('')}
          </div>
        </fieldset>`).join('')}
        <p class="help" id="qt-help">At least one has to stay on.</p>
      </section>
      <section class="card">
        <h2>Look</h2>
        ${radios('theme', 'Light or dark', [['system', 'Same as this device'], ['light', 'Light'], ['dark', 'Dark']], s.theme)}
      </section>
      <section class="card">
        <h2>Progress</h2>
        <p class="help">${Object.values(state.progress.topics).reduce((n, t) => n + t.total, 0)} answers so far, kept only in this browser. Resetting also empties the flashcard boxes and the speed-round best.</p>
        <button type="button" class="btn" id="reset">Reset progress</button>
        <p class="help" id="reset-note" aria-live="polite"></p>
      </section>
    </form>`;
  const form = $('#settings');
  const syncGroups = () => {
    for (const box of $$('input[name=qg]', form)) {
      const kids = $$(`input[name=qt][data-group="${box.value}"]`, form);
      const n = kids.filter((k) => k.checked).length;
      box.checked = n === kids.length;
      box.indeterminate = n > 0 && n < kids.length;
    }
  };
  syncGroups();
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'qt' || t.name === 'qg') {
      const before = $$('input[name=qt]', form).map((x) => x.checked);
      if (t.name === 'qg') $$(`input[name=qt][data-group="${t.value}"]`, form).forEach((k) => { k.checked = t.checked; });
      const on = $$('input[name=qt]:checked', form).map((x) => x.value);
      if (!on.length) {
        $$('input[name=qt]', form).forEach((x, i) => { x.checked = before[i]; });
        if (t.name === 'qt') t.checked = true;
        syncGroups();
        $('#qt-help').classList.add('warn');
        return;
      }
      syncGroups();
      $('#qt-help').classList.remove('warn');
      const same = on.length === DOSAGE_IDS.length && DOSAGE_IDS.every((id) => on.includes(id));
      state.settings.quizTopics = same ? null : on;
    } else if (t.type === 'radio') {
      state.settings[t.name] = t.value;
      if (t.name === 'theme') applyTheme();
    }
    saveSettings(state.settings);
    // problems made with the old rules would show old keys, so start fresh ones
    state.practice = null;
    if (state.quiz && !state.quiz.done && state.quiz.i === 0) state.quiz = null;
  });
  let armed = false;
  $('#reset').addEventListener('click', (e) => {
    if (!armed) { armed = true; e.target.textContent = 'Tap again to reset'; e.target.classList.add('danger'); return; }
    state.progress = resetProgress();
    state.memo = resetMemo();
    e.target.textContent = 'Reset progress'; e.target.classList.remove('danger'); armed = false;
    $('#reset-note').textContent = 'Done. Every topic and every flashcard starts fresh.';
  });
  focusHeading();
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// ---------- start ----------

applyTheme();
route();
// a small service worker, so the app (and the flashcards) keep working without a connection
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__medmath = { state, judge, buildProblem, generateProblem, seeded, Q, speedSeconds: 0 };
