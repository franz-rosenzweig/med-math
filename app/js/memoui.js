// The "Memorize it" screens: the hub, a trick card, flashcards (Leitner boxes), build the formula,
// fill the blank, the speed round and the brain dump. main.js routes here and passes its helpers in ctx.
import {
  TRICKS, TRICK, KIND_LABEL, FLASHCARDS, BUILD, BUILD_BY, buildText, checkBuild, CLOZE, blanksOf, clozeText, judgeCloze,
  speedItem, DUMP, dayNumber, cardState, review, dueCards, learnedCount, boxCounts, LEARNED_BOX,
} from './memo.js';
import { drawTrick } from './memoview.js';
import { seeded } from './topics.js';

let C; // ctx from main.js
let ignoreClicksUntil = 0; // a drop re-draws the screen, so the browser's click after it must not count
const S = { cards: null, build: null, cloze: null, speed: null };

export function memoSummary(memo) {
  const day = dayNumber();
  return { learned: learnedCount(memo), total: FLASHCARDS.length, due: dueCards(memo, day).length };
}

export function showMemorize(ctx, sub, arg) {
  C = ctx;
  C.clearTimers();
  if (sub === 'trick' && TRICK[arg]) return trickView(arg);
  if (sub === 'cards') return cardsView();
  if (sub === 'build') return buildView(BUILD_BY[arg] ? arg : null);
  if (sub === 'blanks') return clozeView();
  if (sub === 'speed') return speedView();
  if (sub === 'dump') return dumpView();
  return hubView();
}

const crumbs = (back = 'hub') => `<nav class="crumbs">${back === 'hub'
  ? `<a href="#/memorize">${C.icon('back')}Memorize it</a>`
  : `<a href="#/">${C.icon('back')}All topics</a>`}</nav>`;

function memoRing(memo, size = 56) {
  const { learned, total } = memoSummary(memo);
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = learned / total;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
    ${learned ? `<circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
    <text x="50%" y="50%" dy=".36em" text-anchor="middle" class="ring-num">${learned}</text>
  </svg>`;
}
export function memoEntryHTML(memo, icon) {
  const { learned, total, due } = memoSummary(memo);
  return `<a class="memo-entry" href="#/memorize">
    ${memoRing(memo, 52)}
    <span class="memo-words"><span class="memo-name">Memorize it</span><span class="memo-hint">Memory tricks, flashcards and drills for every range and formula</span></span>
    <span class="memo-stats"><b>${learned} of ${total}</b> cards learned<br><b>${due}</b> due today</span>
  </a>`;
}

// ---------- the hub ----------

function hubView() {
  C.setTitle('Memorize it');
  const memo = C.memo();
  const { learned, total, due } = memoSummary(memo);
  const DRILLS = [
    ['cards', 'Flashcards', due ? `${due} due today` : 'All caught up today', 'Leitner boxes: what you know comes back less often.'],
    ['build', 'Build the formula', `${BUILD.length} formulas`, 'Put the tiles in the right places. Watch out for the decoys.'],
    ['blanks', 'Fill the blank', `${CLOZE.length} blanks`, 'Type the missing numbers and words.'],
    ['speed', 'Speed round', memo.speedBest ? `Best: ${memo.speedBest}` : '60 seconds', 'Acid, Normal or Base, as fast as you can.'],
    ['dump', 'Brain dump', 'A sheet to print', 'Write everything from memory, then check it.'],
  ];
  C.view.innerHTML = `
    ${crumbs('home')}
    <header class="screen-head">
      <div><h1>Memorize it</h1><p class="sub">Tricks for the blood gas ranges and formulas, and drills to make them stick.</p></div>
      <div class="head-ring" title="Flashcards in box ${LEARNED_BOX} or higher">${memoRing(memo)}<span>${learned} of ${total} learned<br>${due} due today</span></div>
    </header>
    <section aria-labelledby="drills-h">
      <h2 class="memo-h" id="drills-h">Drills</h2>
      <div class="drill-grid">
        ${DRILLS.map(([id, name, stat, hint]) => `<a class="drill" href="#/memorize/${id}">
          <span class="drill-name">${name}</span><span class="drill-stat">${C.esc(stat)}</span><span class="drill-hint">${C.esc(hint)}</span>
        </a>`).join('')}
      </div>
    </section>
    <section aria-labelledby="tricks-h">
      <h2 class="memo-h" id="tricks-h">Memory tricks</h2>
      <p class="help">One card for each thing to remember: the trick, a drawing, and why it works. The label says whether it’s a standard mnemonic or one made up for Med Math.</p>
      <div class="trick-grid">
        ${TRICKS.map((t) => `<a class="trick-tile" href="#/memorize/trick/${t.id}">
          <span class="kind-chip ${t.kind}">${KIND_LABEL[t.kind]}</span>
          <span class="trick-name">${C.esc(t.title)}</span>
          <span class="trick-snip">${C.esc(t.letters ? t.letters.map(([l]) => l).join(' ') : t.trick)}</span>
        </a>`).join('')}
      </div>
    </section>`;
  C.focusHeading();
}

// ---------- a trick card ----------

function trickView(id) {
  const t = TRICK[id];
  const i = TRICKS.indexOf(t);
  const prev = TRICKS[(i - 1 + TRICKS.length) % TRICKS.length], next = TRICKS[(i + 1) % TRICKS.length];
  C.setTitle(t.title);
  C.view.innerHTML = `
    ${crumbs()}
    <article class="trick-card">
      <span class="kind-chip ${t.kind}">${KIND_LABEL[t.kind]}</span>
      <h1>${C.esc(t.title)}</h1>
      <p class="trick-thing">${C.esc(t.thing)}</p>
      ${t.letters ? '' : `<div class="trick-hook"><span class="fw-label">The trick</span><p>${C.esc(t.trick)}</p></div>`}
      <div class="figure trick-fig" id="trick-fig"></div>
      <div class="trick-why"><span class="fw-label">Why it works</span><p>${C.esc(t.why)}</p></div>
      <p class="trick-source">Source: ${C.esc(t.source)}</p>
      <p class="trick-practice">${t.practice.map(([name, href]) => `<a class="btn small" href="${href}">${C.esc(name)}${C.icon('next')}</a>`).join(' ')}</p>
      <nav class="trick-nav" aria-label="Other tricks">
        <a href="#/memorize/trick/${prev.id}">${C.icon('back')}${C.esc(prev.title)}</a>
        <a href="#/memorize/trick/${next.id}">${C.esc(next.title)}${C.icon('next')}</a>
      </nav>
    </article>`;
  const fig = C.$('#trick-fig');
  const draw = () => { fig.innerHTML = ''; const d = drawTrick(id, Math.max(280, Math.floor(fig.getBoundingClientRect().width))); if (d) fig.append(d); };
  C.whenFonts(draw);
  C.focusHeading();
}

// ---------- flashcards ----------

function shuffleIds(ids, rng) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function boxesHTML(memo) {
  const counts = boxCounts(memo);
  return `<ol class="leitner" aria-label="Cards in each box">${[1, 2, 3, 4, 5].map((b) => `<li>
    <span class="box-stack" style="--n:${Math.min(8, counts[b])}">${counts[b]}</span><span class="box-label">box ${b}</span></li>`).join('')}</ol>`;
}

function cardsView(all = false) {
  C.setTitle('Flashcards');
  const memo = C.memo();
  const day = dayNumber();
  if (!S.cards || S.cards.done || S.cards.all !== all) {
    const ids = (all ? FLASHCARDS : dueCards(memo, day)).map((c) => c.id);
    // lowest box first, so what you know least comes up first
    const rng = seeded(C.seed());
    const order = shuffleIds(ids, rng).sort((a, b) => cardState(memo, a).box - cardState(memo, b).box);
    S.cards = { queue: order, i: 0, flipped: false, right: 0, again: new Set(), done: false, all };
  }
  renderCard();
  C.focusHeading();
}

function renderCard() {
  const st = S.cards, memo = C.memo();
  const id = st.queue[st.i];
  const card = FLASHCARDS.find((c) => c.id === id);
  const left = st.queue.length - st.i;
  C.view.innerHTML = `
    ${crumbs()}
    <header class="screen-head">
      <div><h1>Flashcards</h1><p class="sub">${card ? `${left} to go${st.all ? ' (practicing all of them)' : ''}` : 'Done for now.'}</p></div>
    </header>
    <div class="flash-area">${boxesHTML(memo)}
    <div class="flash-wrap">${card ? `
      <div class="flash${st.flipped ? ' flipped' : ''}" aria-live="polite">
        <p class="flash-side">${st.flipped ? 'Answer' : 'Question'} · box ${cardState(memo, id).box}</p>
        <p class="flash-front">${C.esc(card.front)}</p>
        ${st.flipped ? `<p class="flash-back">${C.esc(card.back)}</p>
          <a class="trick-link" href="#/memorize/trick/${card.trick}">How to remember this: ${C.esc(TRICK[card.trick].title)} →</a>` : ''}
      </div>
      <div class="answer-buttons flash-buttons">
        ${st.flipped
    ? `<button type="button" class="btn" id="notyet">${C.icon('cross')}Not yet</button><button type="button" class="btn primary" id="gotit">${C.icon('check')}Got it</button>`
    : '<button type="button" class="btn primary" id="flip">Show the answer</button>'}
      </div>
      <p class="kbd-hint">Space shows the answer, then G for Got it and N for Not yet.</p>`
    : `<div class="flash done-card">
        <p class="flash-front">${st.right ? `${st.right} right this round.` : 'Nothing is due right now.'}</p>
        <p>Cards you get right move up a box and come back after 1, 2, 4, 8 and then 16 days. A card in box ${LEARNED_BOX} or higher counts as learned.</p>
      </div>
      <div class="answer-buttons"><button type="button" class="btn primary" id="all">Practice all ${FLASHCARDS.length} anyway</button><a class="btn" href="#/memorize">Back to Memorize it</a></div>`}
    </div></div>`;
  C.$('#flip')?.addEventListener('click', flip);
  C.$('#gotit')?.addEventListener('click', () => answerCard(true));
  C.$('#notyet')?.addEventListener('click', () => answerCard(false));
  C.$('#all')?.addEventListener('click', () => { S.cards = null; cardsView(true); });
  const first = C.$('#flip') || C.$('#gotit') || C.$('#all');
  if (first && !matchMedia('(hover: none)').matches) first.focus({ preventScroll: true });
}
function flip() { S.cards.flipped = true; renderCard(); }
function answerCard(gotIt) {
  const st = S.cards, id = st.queue[st.i];
  const memo = C.memo();
  memo.cards = memo.cards || {};
  memo.cards[id] = review(cardState(memo, id), gotIt, dayNumber());
  C.saveMemo(memo);
  if (gotIt) st.right += 1;
  else if (!st.again.has(id)) { st.again.add(id); st.queue.push(id); } // once more at the end of this round
  st.i += 1;
  st.flipped = false;
  if (st.i >= st.queue.length) st.done = true;
  renderCard();
}

// ---------- build the formula ----------

function buildView(id) {
  const b = BUILD_BY[id] || BUILD[0];
  if (!S.build || S.build.id !== b.id) {
    const rng = seeded(C.seed());
    S.build = { id: b.id, slots: b.answer.map(() => null), tray: shuffleIds([...b.answer, ...b.decoys], rng), picked: null, result: null };
  }
  C.setTitle(`Build: ${b.name}`);
  renderBuild();
  C.focusHeading();
}

function renderBuild() {
  const st = S.build, b = BUILD_BY[st.id];
  const i = BUILD.indexOf(b), nextB = BUILD[(i + 1) % BUILD.length];
  const slotHTML = (k) => `<button type="button" class="slot${st.slots[k] ? ' filled' : ''}${st.picked === k ? ' picked' : ''}" data-slot="${k}" aria-label="${st.slots[k] ? `Slot ${k + 1}: ${st.slots[k]}. Press to take it out.` : `Empty slot ${k + 1}`}" ${st.result ? 'disabled' : ''}>${st.slots[k] ? C.esc(st.slots[k]) : ''}</button>`;
  C.view.innerHTML = `
    ${crumbs()}
    <header class="screen-head"><div><h1>Build the formula</h1><p class="sub">Tap a tile to drop it in the next empty slot, or drag it to a slot. Tap a slot to take a tile back out.</p></div></header>
    <nav class="build-tabs" aria-label="Formulas">${BUILD.map((x) => `<a href="#/memorize/build/${x.id}" class="${x.id === b.id ? 'on' : ''}">${C.esc(x.name)}</a>`).join('')}</nav>
    <section class="build card">
      <p class="build-formula"><span class="lhs">${C.esc(b.lhs)}</span> ${b.parts.map((p) => (typeof p === 'number' ? slotHTML(p) : `<span class="glue">${C.esc(p)}</span>`)).join('')}</p>
      <div class="tray" aria-label="Tiles">${st.tray.map((t) => `<button type="button" class="tile" data-tile="${C.esc(t)}" ${st.result ? 'disabled' : ''}>${C.esc(t)}</button>`).join('') || '<span class="muted">All the slots you need are filled.</span>'}</div>
      <div class="answer-buttons">
        ${st.result ? `<a class="btn primary" href="#/memorize/build/${nextB.id}">Next: ${C.esc(nextB.name)}${C.icon('next')}</a><button type="button" class="btn" id="again">Try again</button>`
    : `<button type="button" class="btn primary" id="bcheck">${C.icon('check')}Check</button><button type="button" class="btn" id="breveal">Show the answer</button>`}
      </div>
      <div class="feedback ${st.result || ''}" id="feedback" aria-live="polite">${st.result === 'right'
    ? `${C.icon('check', 'mark')}<span><strong>Right.</strong> ${C.esc(b.lhs)} ${C.esc(buildText(b, st.slots))}</span>`
    : st.result === 'wrong' ? `${C.icon('cross', 'mark')}<span><strong>Not quite.</strong> It’s ${C.esc(b.lhs)} ${C.esc(buildText(b, b.answer))}</span>` : ''}</div>
      <a class="trick-link" href="#/memorize/trick/${b.trick}">How to remember this: ${C.esc(TRICK[b.trick].title)} →</a>
    </section>`;
  bindBuild();
}

function placeTile(tile, slot) {
  const st = S.build;
  if (st.result) return;
  const from = st.slots.indexOf(tile);
  let k = slot;
  if (k == null) k = st.picked != null && !st.slots[st.picked] ? st.picked : st.slots.findIndex((x) => !x);
  if (k < 0) return;
  if (from >= 0) st.slots[from] = st.slots[k]; // tile moved from another slot: swap
  else {
    st.tray = st.tray.filter((t) => t !== tile);
    if (st.slots[k]) st.tray.push(st.slots[k]);
  }
  st.slots[k] = tile;
  st.slots = st.slots.map((x) => x || null);
  st.picked = null;
  renderBuild();
  const nextEmpty = C.$('.slot:not(.filled)') ? null : C.$('#bcheck');
  (nextEmpty || C.$(`.tile`) || C.$('#bcheck'))?.focus({ preventScroll: true });
}
function takeBack(k) {
  const st = S.build;
  if (st.result) return;
  if (st.slots[k]) { st.tray.push(st.slots[k]); st.slots[k] = null; st.picked = k; }
  else st.picked = st.picked === k ? null : k;
  renderBuild();
  C.$(`[data-slot="${k}"]`)?.focus({ preventScroll: true });
}

function bindBuild() {
  const st = S.build, b = BUILD_BY[st.id];
  C.$('#bcheck')?.addEventListener('click', () => {
    if (st.slots.some((x) => !x)) { const fb = C.$('#feedback'); fb.className = 'feedback hint'; fb.textContent = 'Fill every slot first.'; return; }
    st.result = checkBuild(b, st.slots) ? 'right' : 'wrong';
    renderBuild();
    C.$('.answer-buttons .btn')?.focus({ preventScroll: true });
  });
  C.$('#breveal')?.addEventListener('click', () => { st.result = 'wrong'; renderBuild(); });
  C.$('#again')?.addEventListener('click', () => { S.build = null; buildView(b.id); });
  // tap to place, and drag (mouse, pen and touch through pointer events)
  const pressable = [...C.view.querySelectorAll('.tile'), ...C.view.querySelectorAll('.slot.filled')];
  for (const btn of pressable) {
    let start = null, ghost = null;
    const tile = btn.dataset.tile || st.slots[Number(btn.dataset.slot)];
    btn.addEventListener('pointerdown', (e) => {
      if (st.result || e.button > 0) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      // capture right away, so a quick flick off the tile still counts as a drag
      try { btn.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    });
    btn.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
        ghost = document.createElement('span');
        ghost.className = 'tile ghost';
        ghost.textContent = tile;
        document.body.append(ghost);
        btn.classList.add('dragging');
      }
      if (ghost) { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; }
    });
    const end = (e) => {
      if (!start) return;
      const wasDrag = !!ghost;
      if (ghost) {
        ghost.remove(); ghost = null;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const slot = under && under.closest('.slot');
        const tray = under && under.closest('.tray');
        btn.classList.remove('dragging');
        ignoreClicksUntil = Date.now() + 350;
        if (slot) placeTile(tile, Number(slot.dataset.slot));
        else if (tray && btn.classList.contains('slot')) takeBack(Number(btn.dataset.slot));
      }
      start = null;
      if (wasDrag) ignoreClicksUntil = Date.now() + 350;
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', () => { if (ghost) ghost.remove(); ghost = null; start = null; btn.classList.remove('dragging'); });
  }
  C.view.querySelectorAll('.tile').forEach((t) => t.addEventListener('click', () => {
    if (Date.now() < ignoreClicksUntil) return;
    placeTile(t.dataset.tile);
  }));
  C.view.querySelectorAll('.slot').forEach((s) => s.addEventListener('click', () => {
    if (Date.now() < ignoreClicksUntil) return;
    takeBack(Number(s.dataset.slot));
  }));
}

// ---------- fill the blank ----------

function clozeView() {
  C.setTitle('Fill the blank');
  if (!S.cloze) {
    const rng = seeded(C.seed());
    S.cloze = { order: shuffleIds(CLOZE.map((c) => c.id), rng), i: 0, result: null, inputs: [], right: 0 };
  }
  renderCloze();
  C.focusHeading();
}
function renderCloze() {
  const st = S.cloze;
  const c = CLOZE.find((x) => x.id === st.order[st.i % st.order.length]);
  const blanks = blanksOf(c);
  let k = -1;
  const sentence = c.parts.map((p) => {
    if (typeof p !== 'object') return `<span>${C.esc(p)}</span>`;
    k += 1;
    const ok = st.result ? st.result[k] : null;
    return `<input class="blank${ok === true ? ' ok' : ok === false ? ' no' : ''}" data-k="${k}" aria-label="Blank ${k + 1} of ${blanks.length}" autocomplete="off" autocapitalize="off" spellcheck="false" style="--w:${Math.max(3, String(p.answer).length + 1)}ch" value="${C.esc(st.inputs[k] ?? '')}" ${st.result ? 'readonly' : ''}>`;
  }).join('');
  const allRight = st.result && st.result.every(Boolean);
  C.view.innerHTML = `
    ${crumbs()}
    <header class="screen-head"><div><h1>Fill the blank</h1><p class="sub">${st.i + 1} of ${CLOZE.length}${st.right ? ` · ${st.right} right so far` : ''}</p></div></header>
    <form class="cloze card" id="cloze-form">
      <p class="cloze-line">${sentence}</p>
      <div class="answer-buttons">
        ${st.result ? `<button type="submit" class="btn primary" id="cnext">Next${C.icon('next')}</button>` : `<button type="submit" class="btn primary" id="ccheck">${C.icon('check')}Check</button><button type="button" class="btn" id="creveal">Show the answer</button>`}
      </div>
      <div class="feedback ${st.result ? (allRight ? 'right' : 'wrong') : ''}" id="feedback" aria-live="polite">${st.result
    ? `${C.icon(allRight ? 'check' : 'cross', 'mark')}<span><strong>${allRight ? 'Right.' : 'Not quite.'}</strong> ${C.esc(clozeText(c))}</span>` : ''}</div>
      <a class="trick-link" href="#/memorize/trick/${c.trick}">How to remember this: ${C.esc(TRICK[c.trick].title)} →</a>
    </form>`;
  const form = C.$('#cloze-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (st.result) { st.i += 1; st.result = null; st.inputs = []; if (st.i >= CLOZE.length) { S.cloze = null; } return clozeView(); }
    st.inputs = [...form.querySelectorAll('.blank')].map((x) => x.value);
    if (st.inputs.some((x) => !x.trim())) { const fb = C.$('#feedback'); fb.className = 'feedback hint'; fb.textContent = 'Fill in every blank first.'; return; }
    st.result = judgeCloze(c, st.inputs);
    if (st.result.every(Boolean)) st.right += 1;
    renderCloze();
    C.$('#cnext')?.focus({ preventScroll: true });
  });
  C.$('#creveal')?.addEventListener('click', () => {
    st.inputs = blanks.map(() => '');
    st.result = blanks.map(() => false);
    renderCloze();
  });
  if (!st.result && !matchMedia('(hover: none)').matches) form.querySelector('.blank')?.focus({ preventScroll: true });
}

// ---------- speed round ----------

function speedView() {
  C.setTitle('Speed round');
  S.speed = { phase: 'ready', score: 0, misses: [], item: null, rng: seeded(C.seed()) };
  renderSpeed();
  C.focusHeading();
}
function renderSpeed() {
  const st = S.speed, memo = C.memo();
  if (st.phase === 'ready' || st.phase === 'done') {
    const best = memo.speedBest || 0;
    C.view.innerHTML = `
      ${crumbs()}
      <header class="screen-head"><div><h1>Speed round</h1><p class="sub">${C.seconds()} seconds. Is each number on the Acid, Normal or Base side?</p></div></header>
      <section class="speed card">
        ${st.phase === 'done' ? `<p class="speed-score">${st.score}<span> right</span></p><p>${st.score > 0 && st.score >= best ? 'That’s your best so far.' : best ? `Your best is ${best}.` : ''}</p>
          ${st.misses.length ? `<p class="help">Missed:</p><ul class="speed-misses">${st.misses.map((m) => `<li>${C.esc(m.label)} ${C.esc(m.text)} ${C.esc(m.unit)} is <b>${m.answer === 'acid' ? 'Acid' : m.answer === 'base' ? 'Base' : 'Normal'}</b></li>`).join('')}</ul>` : ''}`
    : `<p>Remember: CO2 is an acid, so a HIGH PaCO2 is on the acid side. Bicarb is a base, so a HIGH HCO3 is on the base side.</p>${best ? `<p class="help">Your best: ${best}</p>` : ''}`}
        <div class="answer-buttons"><button type="button" class="btn primary big-go" id="go">${st.phase === 'done' ? 'Go again' : 'Start'}</button></div>
        <p class="kbd-hint">Keys: A for Acid, N for Normal, B for Base.</p>
        <a class="trick-link" href="#/memorize/trick/acid-base">How to remember this: CO2 is an acid, bicarb is a base →</a>
      </section>`;
    C.$('#go').addEventListener('click', startSpeed);
    if (!matchMedia('(hover: none)').matches) C.$('#go').focus({ preventScroll: true });
    return;
  }
  const left = Math.max(0, st.endAt - Date.now());
  const it = st.item;
  C.view.innerHTML = `
    ${crumbs()}
    <header class="screen-head"><div><h1>Speed round</h1><p class="sub" id="speed-left">${Math.ceil(left / 1000)} s left · ${st.score} right</p></div></header>
    <div class="speed-area"><div class="timer"><span id="timer-bar" style="width:${(left / (C.seconds() * 1000)) * 100}%"></span></div>
    <section class="speed card running">
      <p class="speed-item" aria-live="polite"><span class="speed-label">${C.esc(it.label)}</span> <span class="speed-value">${C.esc(it.text)}</span> <span class="speed-unit">${C.esc(it.unit)}</span></p>
      <div class="speed-buttons">
        <button type="button" class="btn speed-btn" data-a="acid">Acid</button>
        <button type="button" class="btn speed-btn" data-a="normal">Normal</button>
        <button type="button" class="btn speed-btn" data-a="base">Base</button>
      </div>
      <p class="speed-flash" id="speed-flash" aria-live="polite">${st.flash || ''}</p>
    </section></div>`;
  C.view.querySelectorAll('.speed-btn').forEach((b) => b.addEventListener('click', () => answerSpeed(b.dataset.a)));
}
function startSpeed() {
  const st = S.speed;
  Object.assign(st, { phase: 'run', score: 0, misses: [], flash: '', endAt: Date.now() + C.seconds() * 1000 });
  st.item = speedItem(st.rng);
  renderSpeed();
  const tick = () => {
    if (S.speed !== st || st.phase !== 'run') return;
    const left = st.endAt - Date.now();
    if (left <= 0) return endSpeed();
    const bar = C.$('#timer-bar'), txt = C.$('#speed-left');
    if (bar) bar.style.width = `${(left / (C.seconds() * 1000)) * 100}%`;
    if (txt) txt.textContent = `${Math.ceil(left / 1000)} s left · ${st.score} right`;
    C.later(tick, 200);
  };
  C.later(tick, 200);
}
function answerSpeed(a) {
  const st = S.speed;
  if (st.phase !== 'run') return;
  const it = st.item;
  if (a === it.answer) { st.score += 1; st.flash = 'Right'; }
  else { st.misses.push(it); st.flash = `${it.label} ${it.text} is ${it.answer === 'acid' ? 'Acid' : it.answer === 'base' ? 'Base' : 'Normal'}`; }
  st.item = speedItem(st.rng);
  renderSpeed();
}
function endSpeed() {
  const st = S.speed;
  st.phase = 'done';
  const memo = C.memo();
  if (st.score > (memo.speedBest || 0)) { memo.speedBest = st.score; C.saveMemo(memo); }
  renderSpeed();
}
export function speedKey(e) {
  if (!S.speed || S.speed.phase !== 'run') return false;
  const k = e.key.toLowerCase();
  const a = k === 'a' || k === '1' ? 'acid' : k === 'n' || k === '2' ? 'normal' : k === 'b' || k === '3' ? 'base' : null;
  if (!a) return false;
  e.preventDefault();
  answerSpeed(a);
  return true;
}
export function cardKey(e) {
  const st = S.cards;
  if (!st || st.done || document.body.dataset.screen !== 'memorize') return false;
  if (!C || !C.$('.flash')) return false;
  const k = e.key.toLowerCase();
  if (!st.flipped && (k === ' ' || k === 'enter') && e.target.tagName !== 'BUTTON') { e.preventDefault(); flip(); return true; }
  if (st.flipped && k === 'g') { e.preventDefault(); answerCard(true); return true; }
  if (st.flipped && k === 'n') { e.preventDefault(); answerCard(false); return true; }
  return false;
}

// ---------- brain dump ----------

function dumpView() {
  C.setTitle('Brain dump');
  C.view.innerHTML = `
    ${crumbs()}
    <header class="screen-head">
      <div><h1>Brain dump</h1><p class="sub">Print the blank sheet and write down everything you can, from memory. It’s what many students do the moment an exam starts.</p></div>
      <div class="head-buttons"><button type="button" class="btn" id="dprint">${C.icon('print')}Print</button></div>
    </header>
    <section class="dump-sheet card" aria-label="The blank sheet">
      <h2 class="dump-title">Blood gases, from memory</h2>
      <div class="dump-grid">${DUMP.map((d) => `<div class="dump-box"><h3>${C.esc(d.title)}</h3>${d.grid
    ? '<div class="dump-ttt"><span></span><span>Acid</span><span>Normal</span><span>Base</span><span>pH</span><i></i><i></i><i></i><span>PaCO2</span><i></i><i></i><i></i><span>HCO3</span><i></i><i></i><i></i></div>'
    : `<div class="dump-lines" style="--lines:${d.lines}"></div>`}</div>`).join('')}</div>
    </section>
    <details class="dump-key card" id="dkey">
      <summary>Show the answer key</summary>
      <h2 class="dump-title">Answer key</h2>
      <div class="dump-grid">${DUMP.map((d) => `<div class="dump-box"><h3>${C.esc(d.title)}</h3><ul class="plain">${d.key.map((k) => `<li>${C.esc(k)}</li>`).join('')}</ul></div>`).join('')}</div>
    </details>`;
  C.$('#dprint').addEventListener('click', () => {
    const key = C.$('#dkey');
    const was = key.open;
    key.open = true;
    window.print();
    key.open = was;
  });
  C.focusHeading();
}
