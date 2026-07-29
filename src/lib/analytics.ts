// Client-side analytics helper. This is NOT server-only code — it touches
// browser globals, so it lives in `src/lib`, never `src/lib/server`.
//
// `track` is a thin, typed wrapper around Umami's global `umami.track`.
// It no-ops whenever Umami isn't loaded — on the server (SSR/prerender), in dev
// and e2e (the script is never injected), in the admin area, and before the
// script has hydrated. Call sites therefore never need to guard.

import { browser } from '$app/environment';

type EventData = Readonly<Record<string, string | number | boolean>>;

declare global {
  // The Umami script attaches itself as a page global when it loads.
  // oxlint-disable-next-line eslint/no-var -- `declare var` is the only way to type a browser global on globalThis
  var umami: { track: (event: string, data?: EventData) => void } | undefined;
}

export function track(event: string, data?: EventData): void {
  if (!browser) {
    return;
  }
  globalThis.umami?.track(event, data);
}
