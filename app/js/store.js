// Settings and progress, kept in this browser's localStorage. Every access is wrapped, so the app
// still works (it just forgets on reload) when storage is blocked, full or in a private window.
import { DEFAULT_SETTINGS } from './rules.js';

const KEY_SETTINGS = 'med-math:settings:v1';
const KEY_PROGRESS = 'med-math:progress:v1';
const memory = {};

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw);
  } catch { /* storage unavailable or bad JSON */ }
  return memory[key] ?? null;
}
function write(key, value) {
  memory[key] = value;
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

const CHOICES = {
  volume: ['auto', 'tenths', 'hundredths'],
  pump: ['tenths', 'whole'],
  kg: ['tenths', 'hundredths'],
  lbPerKg: ['2.2', '2.2046'],
  clock: ['24', '12'],
  theme: ['system', 'light', 'dark'],
};

export function loadSettings(topicIds) {
  const s = { ...DEFAULT_SETTINGS };
  const saved = read(KEY_SETTINGS);
  if (saved && typeof saved === 'object') {
    for (const [k, opts] of Object.entries(CHOICES)) if (opts.includes(saved[k])) s[k] = saved[k];
    if (Array.isArray(saved.quizTopics)) {
      const list = saved.quizTopics.filter((t) => topicIds.includes(t));
      s.quizTopics = list.length ? list : null;
    }
  }
  return s;
}
export function saveSettings(s) { return write(KEY_SETTINGS, s); }

const emptyProgress = () => ({ topics: {}, recent: [] });

export function loadProgress() {
  const p = read(KEY_PROGRESS);
  if (!p || typeof p !== 'object' || typeof p.topics !== 'object' || !Array.isArray(p.recent)) return emptyProgress();
  return p;
}

// One answer: per-topic right/total, and the last 50 attempts.
export function record(progress, topic, ok) {
  const t = progress.topics[topic] || (progress.topics[topic] = { right: 0, total: 0 });
  t.total += 1;
  if (ok) t.right += 1;
  progress.recent.push({ topic, ok: !!ok, at: Date.now() });
  if (progress.recent.length > 50) progress.recent.splice(0, progress.recent.length - 50);
  write(KEY_PROGRESS, progress);
  return progress;
}

export function resetProgress() {
  const p = emptyProgress();
  write(KEY_PROGRESS, p);
  return p;
}

export function storageWorks() {
  try {
    const k = 'med-math:probe';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch { return false; }
}
