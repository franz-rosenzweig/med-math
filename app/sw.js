// Med Math's service worker: keeps a copy of the app so it (and the flashcards) work without a connection.
// Network first, so an update always shows up when you're online; the saved copy is only the fallback.
const CACHE = 'med-math-v3';
const FILES = [
  './',
  'index.html',
  'style.css',
  'fonts.css',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'js/abg.js',
  'js/abgview.js',
  'js/answer.js',
  'js/fmt.js',
  'js/formulas.js',
  'js/frac.js',
  'js/kit.js',
  'js/main.js',
  'js/memo.js',
  'js/memoui.js',
  'js/memoview.js',
  'js/rules.js',
  'js/store.js',
  'js/talk.js',
  'js/topics.js',
  'js/train.js',
  'js/trainview.js',
  'fonts/atkinsonhyperlegible-400-italic-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-400-italic-latin.woff2',
  'fonts/atkinsonhyperlegible-400-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-400-latin.woff2',
  'fonts/atkinsonhyperlegible-700-latin-ext.woff2',
  'fonts/atkinsonhyperlegible-700-latin.woff2',
  'fonts/caveat-var-latin-ext.woff2',
  'fonts/caveat-var-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('med-math-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
