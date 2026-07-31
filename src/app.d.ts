// See https://svelte.dev/docs/kit/types#app.d.ts
import type { auth } from '$lib/server/auth';

type Session = typeof auth.$Infer.Session.session;
type User = typeof auth.$Infer.Session.user;

declare global {
  const __APP_VERSION__: string;

  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }
    interface Locals {
      session: Session | undefined;
      user: User | undefined;
    }
  }
}

export {};
