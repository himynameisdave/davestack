import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE_NAME = `davestack-cache-${version}`;

// Resolve paths from the worker's URL so matching also works when the app has a base path.
const PRECACHE = [...immutable, ...assets].map((file) => new URL(file.path, sw.location.href).pathname);
const PRECACHE_SET = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE);
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map(async (key) => caches.delete(key)));
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navigations and session requests use the network so auth state stays current.
  if (request.method !== 'GET' || url.origin !== sw.location.origin) {
    return;
  }
  if (!PRECACHE_SET.has(url.pathname)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      return cached ?? fetch(request);
    })(),
  );
});
