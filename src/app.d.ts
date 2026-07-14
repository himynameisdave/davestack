// See https://svelte.dev/docs/kit/types#app.d.ts

declare global {
  const __APP_VERSION__: string;

  namespace App {
    // interface Error {}
    interface Locals {
      // Auth session/user are populated in hooks.server.ts (added in the auth phase).
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
