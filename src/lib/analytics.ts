import { browser } from '$app/env';

type EventData = Readonly<Record<string, string | number | boolean>>;

declare global {
  var umami: { track: (event: string, data?: EventData) => void } | undefined;
}

export function track(event: string, data?: EventData): void {
  if (!browser) {
    return;
  }
  globalThis.umami?.track(event, data);
}
