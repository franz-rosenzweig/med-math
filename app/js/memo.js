// "Memorize it": the memory tricks for blood gases, the flashcard deck, the formula tiles, the
// fill-in-the-blanks and the speed round. Every number here comes from ABG in abg.js, the same constants
// the problems use, and tools/tests.js checks each answer against the problem functions.
import { Q } from './frac.js';
import { ABG, columnOf, expectedComp, hhExact, anionGap, correctedGap, pfRatio } from './abg.js';
import { parseNumber } from './answer.js';

const R = ABG.ranges, W = ABG.winters, M = ABG.metAlk, P = ABG.resp, G = ABG.gap, H = ABG.hh, MID = ABG.mid;
const n = (x) => String(Number(x)); // "1.5", "0.03", "7.35"
const ph2 = (x) => Q.of(x).toFixedString(2);

export const MUDPILES = [
  ['M', 'Methanol'], ['U', 'Uremia (kidney failure)'], ['D', 'Diabetic ketoacidosis'],
  ['P', 'Propylene glycol (older lists: paraldehyde)'], ['I', 'Isoniazid and iron'], ['L', 'Lactic acidosis'],
  ['E', 'Ethylene glycol'], ['S', 'Salicylates (aspirin)'],
];
export const GOLDMARK = [
  ['G', 'Glycols (ethylene and propylene glycol)'], ['O', 'Oxoproline (pyroglutamic acid, linked to long-term acetaminophen use)'],
  ['L', 'L-lactate'], ['D', 'D-lactate'], ['M', 'Methanol'], ['A', 'Aspirin (salicylates)'], ['R', 'Renal failure'],
  ['K', 'Ketoacidosis (diabetic, alcohol-related or starvation)'],
];

// The rough check, as measured (tools/tests.js recomputes it with the problem functions).
// Measured with the pH as it's written (two decimals): within 3.6 mmHg of Winters' from 7.13 to 7.33.
export const ROUGH = { from: '7.13', to: '7.33', within: '3.5', worst: '3.6', worstAt: '7.26', lowPh: '7.10', low: '4.7', highPh: '7.34', high: '4.3' };

export const KIND_LABEL = {
  standard: 'Standard mnemonic',
  invented: 'Made up for Med Math',
  mixed: 'Standard idea, made-up wording',
  rough: 'Rough check only',
};

// One card per thing to remember. draw names a drawing in memoview.js; practice links a drill or topic.
export const TRICKS = [
  { id: 'twins', title: 'The 35–45 twins', kind: 'standard',
    thing: `Normal pH ${R.ph[0]}–${R.ph[1]}, and normal PaCO2 ${R.paco2[0]}–${R.paco2[1]} mmHg.`,
    trick: 'They use the same two numbers, 35 and 45. Learn one range and you have the other.',
    why: `Both are centered on 40: a pH of ${ph2(MID.ph)} and a PaCO2 of ${MID.paco2} mmHg are the “textbook normal” values every compensation rule starts from. The matching digits are a coincidence, but a handy one.`,
    source: 'Common nursing teaching.', practice: [['Speed round', '#/memorize/speed'], ['Fill the blank', '#/memorize/blanks']] },
  { id: 'bicarb', title: 'Bicarb: 24, give or take 2', kind: 'invented',
    thing: `Normal HCO3 ${R.hco3[0]}–${R.hco3[1]} mEq/L.`,
    trick: `${MID.hco3} in the middle, give or take 2. Twenty-four, like the hours in a day.`,
    why: `${MID.hco3} is the value the respiratory compensation rules start from, and metabolic alkalosis uses HCO3 − ${M.ref}, so knowing the middle pays off twice.`,
    source: 'The range is standard; the “hours in a day” hook is made up for Med Math.', practice: [['Speed round', '#/memorize/speed']] },
  { id: 'oxygen', title: 'Oxygen: a B and an A', kind: 'invented',
    thing: `Normal PaO2 ${R.pao2[0]}–${R.pao2[1]} mmHg, and SaO2 ${R.sao2[0]}–${R.sao2[1]}%.`,
    trick: `PaO2 needs at least a B: ${R.pao2[0]} to ${R.pao2[1]}. SaO2 needs an A: ${R.sao2[0]} to ${R.sao2[1]}.`,
    why: 'The oxygen curve is flat at the top. Once the PaO2 is about 80 or more, hemoglobin is about 95% full or more, so the two passing grades go together (the drawing is the real curve).',
    source: 'Ranges are standard; the grades hook is made up for Med Math. The curve is Severinghaus’s equation (1979).', practice: [['Oxygenation', '#/practice/oxygen']] },
  { id: 'acid-base', title: 'CO2 is an acid, bicarb is a base', kind: 'standard',
    thing: 'High PaCO2 belongs on the acid side, high HCO3 on the base side.',
    trick: 'You breathe acid out: carbon dioxide plus water makes carbonic acid.',
    why: 'CO2 + H2O ⇌ H2CO3 ⇌ H+ + HCO3−. More CO2 makes more acid, and bicarbonate soaks acid up. Tic-tac-toe and ROME both come from this one line.',
    source: 'Standard physiology.', practice: [['Speed round', '#/memorize/speed']] },
  { id: 'rome', title: 'ROME', kind: 'standard',
    thing: 'Which one caused it: respiratory or metabolic?',
    trick: 'Respiratory Opposite, Metabolic Equal.',
    why: 'Because CO2 is an acid, when the PaCO2 goes up the pH goes down: the arrows point opposite ways. Bicarb is a base, so when it goes down the pH goes down too: the arrows point the same way.',
    source: 'Common nursing teaching.', practice: [['Read the ABG', '#/practice/abg']] },
  { id: 'tictactoe', title: 'Tic-tac-toe', kind: 'standard',
    thing: 'Reading an ABG in one grid.',
    trick: 'Three columns: Acid, Normal, Base. Put each number in its column. The one that lines up with the pH is the cause, three in a row is mixed, and the one going the other way is compensating.',
    why: 'It’s ROME drawn as a grid: putting a high CO2 in the Acid column already does the “opposite” for you, so lining up is all that’s left.',
    source: 'Common nursing teaching.', practice: [['Read the ABG', '#/practice/abg'], ['Speed round', '#/memorize/speed']] },
  { id: 'compensation', title: 'Lungs fast, kidneys slow', kind: 'standard',
    thing: 'How compensation works, and how to read a fully compensated ABG.',
    trick: `The lungs answer in minutes, the kidneys take days. And the body never overcompensates, so the side of ${ph2(MID.ph)} the pH is on points to the cause.`,
    why: `Compensation is driven by the pH being off. The closer the pH gets to ${ph2(MID.ph)}, the weaker the push, so it stops short of crossing over.`,
    source: 'Standard physiology and nursing teaching.', practice: [['Read the ABG', '#/practice/abg']] },
  { id: 'hh', title: 'Kidneys over lungs', kind: 'mixed',
    thing: `pH = ${n(H.pK)} + log(HCO3 ÷ (${n(H.sol)} × PaCO2))`,
    trick: `Kidneys on top, lungs underneath: metabolic over respiratory. Normal is 20 to 1, log 20 is about 1.3, and ${n(H.pK)} + 1.3 = 7.4. The two constants are ${n(H.pK)} and ${n(H.sol)}.`,
    why: `The ${n(H.sol)} turns the PaCO2 in mmHg into dissolved CO2 in mmol/L, so the top and bottom are the same kind of thing. With ${MID.hco3} and ${MID.paco2}: ${MID.paco2} × ${n(H.sol)} = 1.2, and ${MID.hco3} ÷ 1.2 = 20.`,
    source: 'Standard physiology (Henderson-Hasselbalch); the phrasing is made up for Med Math.', practice: [['Build it', '#/memorize/build/hh'], ['The equation', '#/practice/hh']] },
  { id: 'winters', title: 'Winters’ formula', kind: 'standard',
    thing: `Expected PaCO2 in metabolic acidosis = ${n(W.a)} × HCO3 + ${W.b}, ±${W.tol}`,
    trick: 'One and a half bicarb plus eight, give or take two.',
    why: 'The lungs blow off CO2 in step with how low the bicarbonate is. The numbers come from measuring patients with metabolic acidosis (Albert, Dell and Winters, 1967).',
    source: 'Albert, Dell and Winters, Annals of Internal Medicine, 1967.', practice: [['Build it', '#/memorize/build/winters'], ['Expected compensation', '#/practice/comp']] },
  { id: 'rough', title: 'The pH shortcut (rough)', kind: 'rough',
    thing: 'A quick sanity check for the expected PaCO2 in metabolic acidosis.',
    trick: 'The expected PaCO2 is close to the last two digits of the pH: a pH of 7.20 means a PaCO2 of about 20.',
    why: `Med Math checked it against Winters’ formula and Henderson-Hasselbalch, using the pH as it’s written. From pH ${ROUGH.from} to ${ROUGH.to} the last two digits land within about ${ROUGH.within} mmHg of Winters’ (the worst, ${ROUGH.worst}, is around ${ROUGH.worstAt}). Outside that it drifts off fast: about ${ROUGH.low} off at ${ROUGH.lowPh} and ${ROUGH.high} at ${ROUGH.highPh}. So use Winters’ for the answer, and this only to check it.`,
    source: 'A well-known bedside shortcut; the range is Med Math’s own check.', practice: [['Expected compensation', '#/practice/comp']] },
  { id: 'metalk', title: 'Point seven', kind: 'invented',
    thing: `Expected PaCO2 in metabolic alkalosis = ${M.base} + ${n(M.k)} × (HCO3 − ${M.ref}), ±${M.tol}`,
    trick: `Start at ${M.base}, and add point seven for every 1 of extra bicarb above ${M.ref}.`,
    why: 'To hold on to CO2 the lungs have to breathe less, which also lowers oxygen, so this compensation is weaker than in acidosis: 0.7 instead of 1.5.',
    source: 'The formula is standard; the phrasing is made up for Med Math.', practice: [['Build it', '#/memorize/build/metalk'], ['Expected compensation', '#/practice/comp']] },
  { id: 'respcomp', title: `${P.acidAcute}, ${P.acidChronic}, ${P.alkAcute}, ${P.alkChronic}`, kind: 'mixed',
    thing: `How much the HCO3 moves for every ${P.per} mmHg the PaCO2 moves, in respiratory disorders.`,
    trick: `Acute is small, chronic is big, and alkalosis doubles the acute: acidosis ${P.acidAcute} (acute) and ${P.acidChronic} (chronic), alkalosis ${P.alkAcute} (acute) and about ${P.alkChronic} (chronic).`,
    why: `Acute changes are only the blood’s own buffers, which is small. Chronic adds the kidneys keeping or getting rid of bicarbonate over days, which is big. Many students learn 1-4-2-5, because sources vary between 3.5 and 4, and between 4 and 5. Med Math uses ${P.acidAcute}, ${P.acidChronic}, ${P.alkAcute} and ${P.alkChronic}.`,
    source: 'Standard rules of thumb (for example Berend et al., NEJM 2014); the “doubles” phrasing is made up.', practice: [['Fill the blank', '#/memorize/blanks'], ['Expected compensation', '#/practice/comp']] },
  { id: 'gap', title: 'The anion gap', kind: 'mixed',
    thing: `AG = Na − (Cl + HCO3), normal about ${G.lo} to ${G.hi} mEq/L`,
    trick: 'The big positive one minus the two big negative ones. Normal is about 10, give or take 2, though labs vary.',
    why: 'Blood is electrically balanced. The gap is the negative charge the lab panel doesn’t measure, like albumin and phosphate, and an extra acid makes it bigger.',
    source: 'Kraut and Madias, 2007; the “about 10” phrasing is made up.', practice: [['Build it', '#/memorize/build/gap'], ['Anion gap', '#/practice/gap']] },
  { id: 'albumin', title: 'Two and a half per gram', kind: 'standard',
    thing: `Corrected AG = AG + ${n(G.alb)} × (${G.albRef} − albumin)`,
    trick: `Add ${n(G.alb)} for every 1 g/dL the albumin is below ${G.albRef}.`,
    why: 'Albumin is part of the normal gap. When it’s low the normal gap shrinks, which can hide an extra acid unless you add it back.',
    source: 'Figge et al., 1998 (some sources use 2.3).', practice: [['Build it', '#/memorize/build/albumin'], ['Anion gap', '#/practice/gap']] },
  { id: 'mudpiles', title: 'MUDPILES', kind: 'standard', letters: MUDPILES,
    thing: 'Causes of a high anion gap metabolic acidosis: the older list.',
    trick: MUDPILES.map(([l, w]) => `${l}: ${w}`).join(' · '),
    why: 'Each one adds an acid the lab panel doesn’t measure, which is exactly what widens the gap. Some letters are rare causes today, which is why GOLDMARK replaced it.',
    source: 'A long-standing teaching mnemonic.', practice: [['Flashcards', '#/memorize/cards']] },
  { id: 'goldmark', title: 'GOLDMARK', kind: 'standard', letters: GOLDMARK,
    thing: 'Causes of a high anion gap metabolic acidosis: the newer list.',
    trick: GOLDMARK.map(([l, w]) => `${l}: ${w}`).join(' · '),
    why: 'It’s the more current list (Mehta, Emmett and Emmett, 2008). It drops causes that are rare now, like paraldehyde, and adds L- and D-lactate and oxoproline.',
    source: 'Mehta, Emmett and Emmett, The Lancet, 2008.', practice: [['Flashcards', '#/memorize/cards']] },
  { id: 'pf', title: 'P over F', kind: 'invented',
    thing: 'P/F ratio = PaO2 ÷ FiO2',
    trick: 'P over F, and F is a fraction: 40% oxygen is 0.40. A healthy person on room air is about 100 ÷ 0.21 ≈ 476, so think “400 to 500”.',
    why: 'Dividing by the oxygen given shows how well the lungs do with what they get: the same PaO2 on more oxygen means worse lungs. 300 or less is one of the Berlin criteria for ARDS.',
    source: 'The formula is standard (the Berlin definition, JAMA 2012); the hook is made up for Med Math.', practice: [['Build it', '#/memorize/build/pf'], ['Oxygenation', '#/practice/oxygen']] },
  { id: 'allen', title: 'The Allen test in 3 steps', kind: 'standard',
    thing: 'The modified Allen test, before a sample from the radial artery.',
    trick: '1. Make a fist, and press on both arteries at the wrist. 2. Open the hand: the palm is pale. 3. Let go of the ulnar side: color should come back within about 5 to 15 seconds.',
    why: 'It checks that the ulnar artery can keep the hand supplied on its own, in case the radial artery is hurt by the puncture. Procedures differ on the exact seconds, and the test isn’t perfect.',
    source: 'StatPearls, “Allen Test” (5 to 15 seconds); common nursing procedure guidance.', practice: [['Talk it through', '#/practice/talk']] },
];
export const TRICK = Object.fromEntries(TRICKS.map((t) => [t.id, t]));

// ---------- flashcards ----------

export const FLASHCARDS = [
  { id: 'r-ph', front: 'Normal pH', back: `${R.ph[0]} to ${R.ph[1]}`, trick: 'twins' },
  { id: 'r-paco2', front: 'Normal PaCO2', back: `${R.paco2[0]} to ${R.paco2[1]} mmHg`, trick: 'twins' },
  { id: 'r-hco3', front: 'Normal HCO3', back: `${R.hco3[0]} to ${R.hco3[1]} mEq/L`, trick: 'bicarb' },
  { id: 'r-pao2', front: 'Normal PaO2', back: `${R.pao2[0]} to ${R.pao2[1]} mmHg`, trick: 'oxygen' },
  { id: 'r-sao2', front: 'Normal SaO2', back: `${R.sao2[0]} to ${R.sao2[1]}%`, trick: 'oxygen' },
  { id: 'r-gap', front: 'Normal anion gap', back: `about ${G.lo} to ${G.hi} mEq/L (labs vary)`, trick: 'gap' },
  { id: 'mid', front: 'The “textbook normal” pH, PaCO2 and HCO3 the rules start from', back: `${ph2(MID.ph)}, ${MID.paco2} mmHg and ${MID.hco3} mEq/L`, trick: 'twins' },
  { id: 'co2', front: 'CO2 acts like an…', back: 'acid (high PaCO2 goes in the Acid column)', trick: 'acid-base' },
  { id: 'hco3', front: 'HCO3 acts like a…', back: 'base (high HCO3 goes in the Base column)', trick: 'acid-base' },
  { id: 'rome', front: 'ROME', back: 'Respiratory Opposite, Metabolic Equal', trick: 'rome' },
  { id: 'ttt', front: 'Tic-tac-toe: which number is the cause?', back: 'the one in the same column as the pH (three in a row is mixed)', trick: 'tictactoe' },
  { id: 'full', front: 'Fully compensated: how do you find the cause?', back: `the side of ${ph2(MID.ph)} the pH is on`, trick: 'compensation' },
  { id: 'speed', front: 'What compensates in minutes, and what over days?', back: 'the lungs in minutes, the kidneys over hours to days', trick: 'compensation' },
  { id: 'hh', front: 'Henderson-Hasselbalch', back: `pH = ${n(H.pK)} + log(HCO3 ÷ (${n(H.sol)} × PaCO2))`, trick: 'hh' },
  { id: 'hh-pk', front: 'Henderson-Hasselbalch: the number it starts with', back: n(H.pK), trick: 'hh' },
  { id: 'hh-sol', front: 'Henderson-Hasselbalch: the number that goes with PaCO2', back: `${n(H.sol)} (it turns mmHg into mmol/L)`, trick: 'hh' },
  { id: 'ratio', front: 'Normal ratio of HCO3 to dissolved CO2', back: `20 to 1 (log 20 ≈ 1.3, and ${n(H.pK)} + 1.3 = 7.4)`, trick: 'hh' },
  { id: 'winters', front: 'Winters’ formula (metabolic acidosis)', back: `expected PaCO2 = ${n(W.a)} × HCO3 + ${W.b}, ±${W.tol}`, trick: 'winters' },
  { id: 'rough', front: 'Rough check for the expected PaCO2 in metabolic acidosis', back: `about the last two digits of the pH (from pH ${ROUGH.from} to ${ROUGH.to}, within about ${ROUGH.within})`, trick: 'rough' },
  { id: 'metalk', front: 'Expected PaCO2 in metabolic alkalosis', back: `${M.base} + ${n(M.k)} × (HCO3 − ${M.ref}), ±${M.tol}`, trick: 'metalk' },
  { id: 'ra-acute', front: 'Acute respiratory acidosis: HCO3 change per 10 mmHg PaCO2 rise', back: `up about ${P.acidAcute}`, trick: 'respcomp' },
  { id: 'ra-chronic', front: 'Chronic respiratory acidosis: HCO3 change per 10 mmHg PaCO2 rise', back: `up about ${P.acidChronic} (some sources say 4)`, trick: 'respcomp' },
  { id: 'rk-acute', front: 'Acute respiratory alkalosis: HCO3 change per 10 mmHg PaCO2 drop', back: `down about ${P.alkAcute}`, trick: 'respcomp' },
  { id: 'rk-chronic', front: 'Chronic respiratory alkalosis: HCO3 change per 10 mmHg PaCO2 drop', back: `down about ${P.alkChronic} (some sources say 5)`, trick: 'respcomp' },
  { id: 'gap', front: 'Anion gap', back: 'Na − (Cl + HCO3)', trick: 'gap' },
  { id: 'gap-alb', front: 'Albumin-corrected anion gap', back: `AG + ${n(G.alb)} × (${G.albRef} − albumin in g/dL)`, trick: 'albumin' },
  { id: 'pf', front: 'P/F ratio', back: 'PaO2 ÷ FiO2 (FiO2 as a fraction)', trick: 'pf' },
  { id: 'pf-normal', front: 'P/F ratio of a healthy person on room air', back: 'about 400 to 500', trick: 'pf' },
  { id: 'allen', front: 'Modified Allen test: a normal result', back: 'color back in the palm within about 5 to 15 seconds after letting go of the ulnar artery', trick: 'allen' },
  ...MUDPILES.map(([l, w], i) => ({ id: `mud-${i}`, front: `MUDPILES: what is the ${l}?`, back: w, trick: 'mudpiles' })),
  ...GOLDMARK.map(([l, w], i) => ({ id: `gold-${i}`, front: `GOLDMARK: what is the ${l}?`, back: w, trick: 'goldmark' })),
];

// Leitner boxes 1 to 5: a card you get right moves up a box and waits longer, one you miss goes back to box 1.
export const INTERVALS = [0, 1, 2, 4, 8, 16]; // days to wait, by the box the card lands in
export function dayNumber(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}
export function cardState(memo, id) { return (memo.cards && memo.cards[id]) || { box: 1, due: 0 }; }
export function review(state, gotIt, day) {
  if (!gotIt) return { box: 1, due: day };
  const box = Math.min(5, state.box + 1);
  return { box, due: day + INTERVALS[box] };
}
export function dueCards(memo, day) { return FLASHCARDS.filter((c) => cardState(memo, c.id).due <= day); }
export const LEARNED_BOX = 3;
export function learnedCount(memo) { return FLASHCARDS.filter((c) => cardState(memo, c.id).box >= LEARNED_BOX).length; }
export function boxCounts(memo) {
  const out = [0, 0, 0, 0, 0, 0];
  for (const c of FLASHCARDS) out[cardState(memo, c.id).box] += 1;
  return out;
}

// ---------- a tiny calculator for the tiles: numbers, names, + − × ÷, brackets and log( ----------

export function evaluate(expr, vars) {
  const toks = expr.match(/log\(|\d*\.?\d+|[A-Za-z][A-Za-z0-9]*|[-+×÷()−]/g) || [];
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  const atom = () => {
    const t = next();
    if (t === undefined) throw new Error('incomplete');
    if (t === '(') { const v = sum(); if (next() !== ')') throw new Error('bracket'); return v; }
    if (t === 'log(') { const v = sum(); if (next() !== ')') throw new Error('bracket'); return Math.log10(v); }
    if (/^\d*\.?\d+$/.test(t)) return Number(t);
    if (t in vars) return vars[t];
    throw new Error('unknown ' + t);
  };
  const product = () => {
    let v = atom();
    while (peek() === '×' || peek() === '÷') { const op = next(); const r = atom(); v = op === '×' ? v * r : v / r; }
    return v;
  };
  const sum = () => {
    let v = product();
    while (peek() === '+' || peek() === '−' || peek() === '-') { const op = next(); const r = product(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const v = sum();
  if (i !== toks.length) throw new Error('leftover');
  return v;
}

// ---------- build the formula ----------

// parts: text and slot markers. The answer is checked by working the formula out at several sets of
// realistic values and comparing it with the function the problems use (see tools/tests.js).
export const BUILD = [
  { id: 'hh', name: 'Henderson-Hasselbalch', lhs: 'pH =', parts: [0, ' + log(', 1, ' ÷ (', 2, ' × ', 3, '))'], answer: [n(H.pK), 'HCO3', n(H.sol), 'PaCO2'], decoys: ['6.4', '0.3', '1.5'], trick: 'hh' },
  { id: 'winters', name: 'Winters’ formula', lhs: 'Expected PaCO2 =', parts: [0, ' × ', 1, ' + ', 2, ` ± ${W.tol}`], answer: [n(W.a), 'HCO3', n(W.b)], decoys: ['0.7', '15', 'PaCO2'], trick: 'winters' },
  { id: 'metalk', name: 'Metabolic alkalosis', lhs: 'Expected PaCO2 =', parts: [0, ' + ', 1, ' × (', 2, ' − ', 3, `) ± ${M.tol}`], answer: [n(M.base), n(M.k), 'HCO3', n(M.ref)], decoys: ['1.5', '8', '22'], trick: 'metalk' },
  { id: 'gap', name: 'Anion gap', lhs: 'AG =', parts: [0, ' − (', 1, ' + ', 2, ')'], answer: ['Na', 'Cl', 'HCO3'], decoys: ['K', 'albumin', '12'], trick: 'gap' },
  { id: 'albumin', name: 'Albumin correction', lhs: 'Corrected AG =', parts: [0, ' + ', 1, ' × (', 2, ' − ', 3, ')'], answer: ['AG', n(G.alb), n(G.albRef), 'albumin'], decoys: ['2', '3.5', 'Na'], trick: 'albumin' },
  { id: 'pf', name: 'P/F ratio', lhs: 'P/F =', parts: [0, ' ÷ ', 1], answer: ['PaO2', 'FiO2'], decoys: ['SaO2', '100', '21'], trick: 'pf' },
];
export const BUILD_BY = Object.fromEntries(BUILD.map((b) => [b.id, b]));
// Realistic values to try a built formula on, and what the problems' own functions say for each.
export const SAMPLES = [
  { HCO3: 12, PaCO2: 26, Na: 140, Cl: 104, K: 4.1, AG: 24, albumin: 2.2, PaO2: 74, FiO2: 0.4, SaO2: 93 },
  { HCO3: 31, PaCO2: 55, Na: 136, Cl: 98, K: 3.6, AG: 10, albumin: 3.1, PaO2: 95, FiO2: 0.21, SaO2: 97 },
  { HCO3: 18.5, PaCO2: 41, Na: 147, Cl: 111, K: 5.2, AG: 15, albumin: 1.8, PaO2: 62, FiO2: 0.6, SaO2: 91 },
  { HCO3: 7, PaCO2: 19, Na: 131, Cl: 92, K: 4.4, AG: 31, albumin: 4.6, PaO2: 150, FiO2: 1, SaO2: 99 },
];
const num = (q) => q.toNumber();
export const TRUTH = {
  hh: { f: (v) => num(hhExact(v.HCO3, v.PaCO2)), tol: 0.0051 }, // the problems give pH to two decimals
  winters: { f: (v) => num(expectedComp({ kind: 'met-acid', hco3: v.HCO3 })), tol: 1e-9 },
  metalk: { f: (v) => num(expectedComp({ kind: 'met-alk', hco3: v.HCO3 })), tol: 1e-9 },
  gap: { f: (v) => num(anionGap(v.Na, v.Cl, v.HCO3)), tol: 1e-9 },
  albumin: { f: (v) => num(correctedGap(v.AG, v.albumin)), tol: 1e-9 },
  pf: { f: (v) => num(pfRatio(v.PaO2, v.FiO2)), tol: 1e-9 },
};
// The formula with these tiles in its slots, as something the calculator can work out (the ± part is dropped).
export function buildExpr(b, tiles) { return buildText(b, tiles).replace(/\s*±\s*[\d.]+/g, ''); }
export function checkBuild(b, tiles) {
  if (tiles.length < b.answer.length || tiles.some((t) => !t)) return false;
  const T = TRUTH[b.id];
  try {
    return SAMPLES.every((v) => {
      const got = evaluate(buildExpr(b, tiles), v), want = T.f(v);
      return Number.isFinite(got) && Math.abs(got - want) <= T.tol * Math.max(1, Math.abs(want) * (T.tol < 1e-6 ? 1 : 0));
    });
  } catch { return false; }
}
// The formula as text with the given tiles in the slots ("" for empty).
export function buildText(b, tiles) {
  return b.parts.map((p) => (typeof p === 'number' ? (tiles[p] ?? '') : p)).join('');
}

// ---------- fill the blank ----------

const WORDS = {
  HCO3: ['hco3', 'hco3-', 'bicarb', 'bicarbonate'], Na: ['na', 'na+', 'sodium'], Cl: ['cl', 'cl-', 'chloride'],
  PaO2: ['pao2', 'po2'], FiO2: ['fio2'], opposite: ['opposite'], equal: ['equal', 'same'],
};
const B = (answer, group) => ({ answer, group });
export const CLOZE = [
  { id: 'winters', trick: 'winters', parts: ['Expected PaCO2 = ', n(W.a), ' × ', B('HCO3'), ' + ', B(n(W.b)), ' ± ', B(n(W.tol))] },
  { id: 'winters-a', trick: 'winters', parts: ['Expected PaCO2 = ', B(n(W.a)), ' × HCO3 + ', W.b, ` ± ${W.tol}`] },
  { id: 'hh', trick: 'hh', parts: ['pH = ', B(n(H.pK)), ' + log(HCO3 ÷ (', B(n(H.sol)), ' × PaCO2))'] },
  { id: 'metalk', trick: 'metalk', parts: ['Expected PaCO2 in metabolic alkalosis = ', B(n(M.base)), ' + ', B(n(M.k)), ' × (HCO3 − ', B(n(M.ref)), `) ± ${M.tol}`] },
  { id: 'r-ph', trick: 'twins', parts: ['Normal pH is ', B(R.ph[0]), ' to ', B(R.ph[1])] },
  { id: 'r-paco2', trick: 'twins', parts: ['Normal PaCO2 is ', B(R.paco2[0]), ' to ', B(R.paco2[1]), ' mmHg'] },
  { id: 'r-hco3', trick: 'bicarb', parts: ['Normal HCO3 is ', B(R.hco3[0]), ' to ', B(R.hco3[1]), ' mEq/L'] },
  { id: 'r-o2', trick: 'oxygen', parts: ['Normal PaO2 is ', B(R.pao2[0]), ' to ', B(R.pao2[1]), ' mmHg, and SaO2 is ', B(R.sao2[0]), ' to ', B(R.sao2[1]), '%'] },
  { id: 'resp-acid', trick: 'respcomp', parts: ['In respiratory acidosis the HCO3 rises about ', B(P.acidAcute), ' (acute) or ', B(P.acidChronic), ` (chronic) for every ${P.per} mmHg the PaCO2 rises`] },
  { id: 'resp-alk', trick: 'respcomp', parts: ['In respiratory alkalosis the HCO3 falls about ', B(P.alkAcute), ' (acute) or ', B(P.alkChronic), ` (chronic) for every ${P.per} mmHg the PaCO2 falls`] },
  { id: 'gap', trick: 'gap', parts: ['AG = ', B('Na'), ' − (', B('Cl', 'g'), ' + ', B('HCO3', 'g'), ')'] },
  { id: 'gap-normal', trick: 'gap', parts: ['A normal anion gap is about ', B(G.lo), ' to ', B(G.hi), ' mEq/L'] },
  { id: 'albumin', trick: 'albumin', parts: ['Corrected AG = AG + ', B(n(G.alb)), ' × (', B(G.albRef), ' − albumin)'] },
  { id: 'rome', trick: 'rome', parts: ['ROME: Respiratory ', B('opposite'), ', Metabolic ', B('equal')] },
  { id: 'ratio', trick: 'hh', parts: ['The normal ratio of HCO3 to dissolved CO2 is ', B('20'), ' to 1'] },
  { id: 'pf', trick: 'pf', parts: ['P/F = ', B('PaO2'), ' ÷ ', B('FiO2'), ', with FiO2 as a fraction'] },
];
export const blanksOf = (c) => c.parts.filter((p) => typeof p === 'object');
export function clozeText(c) { return c.parts.map((p) => (typeof p === 'object' ? p.answer : p)).join(''); }

function sameBlank(input, answer) {
  const s = String(input ?? '').trim();
  if (!s) return false;
  if (WORDS[answer]) return WORDS[answer].includes(s.toLowerCase().replace(/[\s.]/g, '').replace(/₂/g, '2').replace(/₃/g, '3'));
  const a = parseNumber(answer), x = parseNumber(s);
  return !!a && !!x && a.eq(x);
}
// Judge a whole cloze: answers in blank order. Blanks in the same group can come in either order.
// Returns an array of booleans, one per blank.
export function judgeCloze(c, inputs) {
  const blanks = blanksOf(c);
  const ok = blanks.map((b, i) => !b.group && sameBlank(inputs[i], b.answer));
  const groups = [...new Set(blanks.filter((b) => b.group).map((b) => b.group))];
  for (const g of groups) {
    const idx = blanks.map((b, i) => (b.group === g ? i : -1)).filter((i) => i >= 0);
    const answers = idx.map((i) => blanks[i].answer);
    const used = new Set();
    for (const i of idx) {
      const j = answers.findIndex((a, k) => !used.has(k) && sameBlank(inputs[i], a));
      if (j >= 0) { used.add(j); ok[i] = true; }
    }
  }
  return ok;
}

// ---------- the speed round ----------

const SPEED_NAMES = { ph: 'pH', paco2: 'PaCO2', hco3: 'HCO3' };
const SPEED_UNITS = { ph: '', paco2: 'mmHg', hco3: 'mEq/L' };
// A random single value, kept off the exact edges of the range. The answer comes from columnOf, the same
// function the ABG problems use.
export function speedItem(rng) {
  const kind = ['ph', 'paco2', 'hco3'][Math.floor(rng() * 3)];
  let v;
  for (;;) {
    if (kind === 'ph') v = (720 + Math.floor(rng() * 41)) / 100;
    else if (kind === 'paco2') v = 22 + Math.floor(rng() * 39);
    else v = 12 + Math.floor(rng() * 27);
    const edges = kind === 'ph' ? [Number(R.ph[0]), Number(R.ph[1])] : kind === 'paco2' ? [Number(R.paco2[0]), Number(R.paco2[1])] : [Number(R.hco3[0]), Number(R.hco3[1])];
    if (!edges.includes(v)) break;
  }
  const text = kind === 'ph' ? ph2(v) : String(v);
  return { kind, value: v, label: SPEED_NAMES[kind], text, unit: SPEED_UNITS[kind], answer: columnOf(kind, v) };
}

// ---------- the brain dump sheet ----------

export const DUMP = [
  { title: 'Normal ranges', lines: 5, key: [`pH ${R.ph[0]}–${R.ph[1]}`, `PaCO2 ${R.paco2[0]}–${R.paco2[1]} mmHg`, `HCO3 ${R.hco3[0]}–${R.hco3[1]} mEq/L`, `PaO2 ${R.pao2[0]}–${R.pao2[1]} mmHg`, `SaO2 ${R.sao2[0]}–${R.sao2[1]}%`] },
  { title: 'Acid or base?', lines: 2, key: ['CO2 acts like an acid (high PaCO2 = acid side)', 'HCO3 acts like a base (high HCO3 = base side)'] },
  { title: 'ROME', lines: 1, key: ['Respiratory Opposite, Metabolic Equal'] },
  { title: 'Tic-tac-toe', grid: true, key: ['Columns Acid, Normal, Base. The one in the pH’s column is the cause; three in a row is mixed.'] },
  { title: 'Compensation', lines: 2, key: ['Lungs in minutes, kidneys over days.', `Full compensation: the side of ${ph2(MID.ph)} the pH is on shows the cause.`] },
  { title: 'Henderson-Hasselbalch', lines: 2, key: [`pH = ${n(H.pK)} + log(HCO3 ÷ (${n(H.sol)} × PaCO2))`, `Normal ratio 20 : 1, log 20 ≈ 1.3, ${n(H.pK)} + 1.3 = 7.4`] },
  { title: 'Winters’ formula', lines: 2, key: [`Expected PaCO2 = ${n(W.a)} × HCO3 + ${W.b}, ±${W.tol}`, `Rough check: about the last two digits of the pH (pH ${ROUGH.from}–${ROUGH.to})`] },
  { title: 'Metabolic alkalosis', lines: 1, key: [`Expected PaCO2 = ${M.base} + ${n(M.k)} × (HCO3 − ${M.ref}), ±${M.tol}`] },
  { title: 'Respiratory compensation, per 10 mmHg', lines: 2, key: [`Acidosis: HCO3 up ${P.acidAcute} (acute), ${P.acidChronic} (chronic)`, `Alkalosis: HCO3 down ${P.alkAcute} (acute), about ${P.alkChronic} (chronic)`] },
  { title: 'Anion gap', lines: 2, key: [`AG = Na − (Cl + HCO3), normal about ${G.lo}–${G.hi}`, `Corrected AG = AG + ${n(G.alb)} × (${G.albRef} − albumin)`] },
  { title: 'P/F ratio', lines: 1, key: ['P/F = PaO2 ÷ FiO2 (as a fraction); healthy on room air about 400–500'] },
  { title: 'MUDPILES', lines: 8, key: MUDPILES.map(([l, w]) => `${l}: ${w}`) },
  { title: 'GOLDMARK', lines: 8, key: GOLDMARK.map(([l, w]) => `${l}: ${w}`) },
  { title: 'Modified Allen test', lines: 3, key: ['Fist, press both arteries', 'Open the hand (pale)', 'Release the ulnar: color back within about 5–15 seconds'] },
];
