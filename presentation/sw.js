// OfflinePay pitch deck service worker: the deck keeps working with zero venue Wi-Fi.
// Keep VERSION in sync with the ?v= query in index.html; a new version drops old caches.
const VERSION = '20261024_v51';
const CORE = `op-core-${VERSION}`;
const MEDIA = `op-media-${VERSION}`;
const FONTS = 'op-fonts-v1';

const CORE_ASSETS = ['./', 'presentation.css', 'presentation.js', 'vendor/three.min.js', 'video_preview.jpg'];
const MEDIA_ASSETS = ['problem-live.mp4', 'solution-demo.mp4'];
const NETWORK_TIMEOUT_MS = 2500;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE);
    await core.addAll(CORE_ASSETS);
    // Videos are large: cache them, but never fail the install if one is slow
    const media = await caches.open(MEDIA);
    await Promise.all(MEDIA_ASSETS.map(url => media.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([CORE, MEDIA, FONTS]);
    for (const key of await caches.keys()) {
      if (!keep.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// Fresh from the network when it answers quickly, cached copy when it is slow or down
async function networkFirst(request) {
  const cache = await caches.open(CORE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./');
      if (shell) return shell;
    }
    throw _;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

// <video> asks for byte ranges; answer them from the cached file so seeking works offline
async function serveMedia(request) {
  const cache = await caches.open(MEDIA);
  const url = new URL(request.url);
  const cached = await cache.match(url.pathname.replace(/^\//, '')) || await cache.match(request, { ignoreSearch: true });
  if (!cached) {
    const response = await fetch(request);
    if (response.status === 200) cache.put(url.pathname.replace(/^\//, ''), response.clone());
    return response;
  }
  const range = request.headers.get('range');
  if (!range) return cached;
  const buffer = await cached.arrayBuffer();
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const size = buffer.byteLength;
  let start = match && match[1] ? parseInt(match[1], 10) : 0;
  let end = match && match[2] ? parseInt(match[2], 10) : size - 1;
  if (match && !match[1] && match[2]) { start = size - parseInt(match[2], 10); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.mp4')) {
    event.respondWith(serveMedia(request));
  } else if (url.pathname.startsWith('/vendor/') || url.pathname.endsWith('.jpg')) {
    event.respondWith(cacheFirst(request, CORE));
  } else {
    event.respondWith(networkFirst(request));
  }
});
