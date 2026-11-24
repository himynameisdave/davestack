import { PASSKEY_ERROR_CODES } from '@better-auth/passkey/client';

import { logger } from '#lib/log.js';

import { authClient } from './auth';

// A redirect getter lets the caller use the latest destination when sign-in completes.
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
      logger.error('[passkey] sign-in error:', error);
      if (!autoFill) {
        errorMessage = 'Could not sign in with passkey. Please try again.';
        passkeyLoading = false;
      }
      return;
    }

    if (result.error) {
      const errorCode = 'code' in result.error ? result.error.code : undefined;
      const cancelled =
        errorCode === PASSKEY_ERROR_CODES.AUTH_CANCELLED.code || errorCode === 'ERROR_CEREMONY_ABORTED';

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
      logger.error('[passkey] conditional mediation check failed:', error);
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
