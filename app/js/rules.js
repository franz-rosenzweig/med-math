// Rounding rules (the main implementation, on exact fractions). The independent checker in
// formulas.js has its own copy of these rules on plain numbers, on purpose.
import { Q } from './frac.js';

export const DEFAULT_SETTINGS = {
  volume: 'auto',      // 'auto': tenths, hundredths under 1 mL · 'tenths' · 'hundredths'
  pump: 'tenths',      // 'tenths' · 'whole'
  kg: 'tenths',        // 'tenths' · 'hundredths'
  lbPerKg: '2.2',      // '2.2' · '2.2046'
  clock: '24',         // '24' · '12'
  theme: 'system',
  quizTopics: null,    // null means every topic
};

const TENTH = Q.of('0.1'), HUNDREDTH = Q.of('0.01'), HALF = Q.of('0.5'), WHOLE = Q.of(1);

// The step a rule rounds to, for an exact value.
export function ruleStep(rule, exact, s = DEFAULT_SETTINGS) {
  switch (rule) {
    case 'exact': return null;
    case 'tablet': return HALF;
    case 'volume':
      if (s.volume === 'tenths') return TENTH;
      if (s.volume === 'hundredths') return HUNDREDTH;
      return exact.lt(1) ? HUNDREDTH : TENTH;
    case 'drops': return WHOLE;
    case 'pump': return s.pump === 'whole' ? WHOLE : TENTH;
    case 'kg': return s.kg === 'hundredths' ? HUNDREDTH : TENTH;
    case 'tenths': return TENTH;
    case 'hundredths': return HUNDREDTH;
    case 'whole': return WHOLE;
    default: throw new Error('Unknown rounding rule: ' + rule);
  }
}

export function applyRule(rule, exact, s) {
  const step = ruleStep(rule, exact, s);
  return step ? exact.roundTo(step) : exact;
}

// Plain words for the rule, used in feedback and the worked steps.
export function ruleText(rule, exact, s = DEFAULT_SETTINGS) {
  switch (rule) {
    case 'exact': return 'exact';
    case 'tablet': return 'to the nearest half tablet';
    case 'volume':
      if (s.volume === 'tenths') return 'to tenths of a mL';
      if (s.volume === 'hundredths') return 'to hundredths of a mL';
      return exact && exact.lt(1) ? 'to hundredths, since it’s under 1 mL' : 'to tenths of a mL';
    case 'drops': return 'to whole drops';
    case 'pump': return s.pump === 'whole' ? 'to a whole mL/h' : 'to tenths of a mL/h';
    case 'kg': return s.kg === 'hundredths' ? 'to hundredths of a kg' : 'to tenths of a kg';
    case 'tenths': return 'to tenths';
    case 'hundredths': return 'to hundredths';
    case 'whole': return 'to a whole number';
    default: return '';
  }
}

export function lbFactor(s = DEFAULT_SETTINGS) {
  return Q.of(s.lbPerKg === '2.2046' ? '2.2046' : '2.2');
}
