// Deliberately minimal PWA service worker. SvelteKit auto-registers this file.
//
// It precaches the immutable, hashed build assets so a returning visit paints
// instantly, and it cleans up caches from older builds. That's it.
//
// What it intentionally does NOT do: intercept navigations, API calls, or auth
// requests. Those always hit the network. This keeps the worker safe for the
// Playwright e2e suite (which runs against the preview server, service worker
// and all) — there is no cached HTML or session state to serve stale. Only the
// `immutable` assets, which are content-hashed, are ever served from cache. If
// you want offline navigation, add it here knowingly.

import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE_NAME = `davestack-cache-${version}`;

// Content-hashed build output + static files: safe to serve cache-first because
// a new deploy changes the hash (and therefore the URL). Manifest paths are
// relative to the base path, where this worker lives, so resolve them against
// its URL to get the absolute pathnames `fetch` compares.
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

  // Only ever serve immutable, same-origin build/static assets from cache.
  // Everything else (navigations, /api, POSTs, auth) passes straight through.
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
