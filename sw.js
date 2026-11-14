// Podcast B2 — praca offline.
// Powłoka aplikacji: najpierw sieć (żeby aktualizacje przychodziły od razu), w razie braku — kopia.
// Nagrania: z pamięci telefonu, jeśli pobrane; obsługa nagłówka Range (wymaga go odtwarzacz w iOS).
const POWLOKA = 'powloka-v1';
const NAGRANIA = 'odcinki-v1';
const PLIKI = ['./', 'index.html', 'manifest.webmanifest', 'dane/katalog.json',
  'ikony/apple-touch-icon.png', 'ikony/ikona-192.png', 'ikony/ikona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(POWLOKA).then(c => c.addAll(PLIKI)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

async function zakres(req, resp) {
  const range = req.headers.get('range');
  if (!range) return resp;
  const buf = await resp.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  const kawalek = buf.slice(start, end + 1);
  return new Response(kawalek, {
    status: 206,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(kawalek.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\/(odcinki|zdania)\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(NAGRANIA);
      const hit = await cache.match(url.pathname.endsWith('.mp3') ? new Request(url.href) : req, { ignoreSearch: true });
      return hit ? zakres(req, hit) : fetch(req);
    })());
    return;
  }
  e.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.ok) (await caches.open(POWLOKA)).put(req, resp.clone());
      return resp;
    } catch {
      return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html'));
    }
  })());
});
