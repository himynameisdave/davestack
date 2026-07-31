import { PASSKEY_ERROR_CODES } from '@better-auth/passkey/client';
import { authClient } from './auth';

/**
 * Reusable passkey sign-in state machine (Svelte 5 runes). Handles:
 * - explicit "Sign in with a passkey" clicks
 * - conditional-UI / autofill where the browser supports it (silent, no error
 *   toast when the user dismisses the sheet)
 * - graceful degradation where WebAuthn or conditional mediation is unavailable
 * - the Google button, so the login page has one place for "other" sign-in
 *
 * `redirect` may be a static string or a getter (so callers can pass a $derived
 * value that tracks the current `next` query param).
 */
export function createPasskeyAuth(redirect: string | (() => string)) {
  const resolveRedirect = (): string => (typeof redirect === 'function' ? redirect() : redirect);
  let passkeyLoading = $state(false);
  let conditionalPasskeyAvailable = $state(false);
  let errorMessage = $state('');

  async function handlePasskeySignIn({ autoFill = false } = {}) {
    if (!autoFill && passkeyLoading) {
      return;
    }

    if (!autoFill) {
      passkeyLoading = true;
      errorMessage = '';
    }

    let result;
    try {
      result = await authClient.signIn.passkey({ autoFill });
    } catch (error) {
      // oxlint-disable-next-line eslint/no-console -- client-side diagnostics for a flow with no server log
      console.error('[passkey] sign-in error:', error);
      if (!autoFill) {
        errorMessage = 'Could not sign in with passkey. Please try again.';
        passkeyLoading = false;
      }
      return;
    }

    if (result.error) {
      const errorCode = 'code' in result.error ? result.error.code : undefined;
      const cancelled =
        errorCode === PASSKEY_ERROR_CODES.AUTH_CANCELLED.code ||
        errorCode === 'ERROR_CEREMONY_ABORTED';

      // Silent-cancel: don't surface an error when the user simply dismisses the
      // autofill sheet — that is a normal interaction, not a failure.
      if (!autoFill || !cancelled) {
        errorMessage = result.error.message ?? 'Could not sign in with passkey. Please try again.';
      }

      if (!autoFill) {
        passkeyLoading = false;
      }
      return;
    }

    globalThis.location.href = resolveRedirect();
  }

  async function initConditionalMediation() {
    if (typeof PublicKeyCredential === 'undefined') {
      return;
    }
    if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') {
      return;
    }

    try {
      conditionalPasskeyAvailable = await PublicKeyCredential.isConditionalMediationAvailable();
    } catch (error) {
      // oxlint-disable-next-line eslint/no-console -- client-side diagnostics for a flow with no server log
      console.error('[passkey] conditional mediation check failed:', error);
      conditionalPasskeyAvailable = false;
      return;
    }

    if (!conditionalPasskeyAvailable) {
      return;
    }
    await handlePasskeySignIn({ autoFill: true });
  }

  async function handleGoogle() {
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: resolveRedirect(),
    });
    if (result.error) {
      errorMessage = result.error.message ?? 'Could not sign in with Google. Please try again.';
    }
  }

  return {
    get passkeyLoading() {
      return passkeyLoading;
    },
    get conditionalPasskeyAvailable() {
      return conditionalPasskeyAvailable;
    },
    get error() {
      return errorMessage;
    },
    set error(value: string) {
      errorMessage = value;
    },
    handlePasskeySignIn,
    initConditionalMediation,
    handleGoogle,
  };
}
