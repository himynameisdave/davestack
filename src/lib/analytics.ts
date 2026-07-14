// Client-side analytics helper. This is NOT server-only code — it touches
// `window`, so it lives in `src/lib`, never `src/lib/server`.
//
// `track` is a thin, typed wrapper around Umami's global `window.umami.track`.
// It no-ops whenever Umami isn't loaded — on the server (SSR/prerender), in dev
// and e2e (the script is never injected), in the admin area, and before the
// script has hydrated. Call sites therefore never need to guard.

type EventData = Readonly<Record<string, string | number | boolean>>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: EventData) => void;
    };
  }
}

export function track(event: string, data?: EventData): void {
  if (typeof window === 'undefined') return;
  window.umami?.track(event, data);
}
