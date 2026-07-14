<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { authClient } from '$lib/client/auth';
  import { createPasskeyAuth } from '$lib/client/passkey-auth.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';

  let { data, form } = $props();

  const passkey = createPasskeyAuth(() => data.postSignInRedirect);

  // Capture the initial value only — the field is user-editable after that.
  let email = $state(untrack(() => form?.email ?? ''));
  let passwordSubmitting = $state(false);
  let magicLinkLoading = $state(false);
  let magicLinkSent = $state(false);

  const busy = $derived(passwordSubmitting || magicLinkLoading || passkey.passkeyLoading);

  onMount(() => {
    void passkey.initConditionalMediation();
  });

  async function handleMagicLink() {
    if (!email.trim()) {
      passkey.error = 'Enter your email address first.';
      return;
    }
    magicLinkLoading = true;
    passkey.error = '';

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: data.postSignInRedirect,
    });

    if (result.error) {
      passkey.error = result.error.message ?? 'Something went wrong. Please try again.';
    } else {
      magicLinkSent = true;
    }
    magicLinkLoading = false;
  }
</script>

<div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <a href="/" class="text-2xl font-bold tracking-tight">davestack</a>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        {#if magicLinkSent}
          <div class="space-y-4 text-center">
            <p class="font-medium">Check your email</p>
            <p class="text-muted-foreground text-sm">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
            <Button variant="ghost" onclick={() => (magicLinkSent = false)}>
              Use a different method
            </Button>
          </div>
        {:else}
          <div class="space-y-4">
            <!-- Passkey: fastest path, up top -->
            <Button
              type="button"
              class="w-full"
              onclick={() => passkey.handlePasskeySignIn()}
              disabled={busy}
            >
              {passkey.passkeyLoading ? 'Waiting for passkey…' : 'Sign in with a passkey'}
            </Button>
            {#if passkey.conditionalPasskeyAvailable}
              <p class="text-muted-foreground text-xs">
                Passkey autofill is available — choose your email below to use it.
              </p>
            {/if}

            <div class="relative my-2">
              <div class="border-border border-t"></div>
              <span
                class="text-muted-foreground bg-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs"
              >
                or
              </span>
            </div>

            <!-- Password -->
            <form
              method="POST"
              class="space-y-4"
              use:enhance={() => {
                passwordSubmitting = true;
                return async ({ update }) => {
                  await update();
                  passwordSubmitting = false;
                };
              }}
            >
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="username webauthn"
                  bind:value={email}
                  required
                  disabled={busy}
                />
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label for="password">Password</Label>
                  <a href="/forgot-password" class="text-muted-foreground text-xs hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  disabled={busy}
                />
              </div>
              <Button type="submit" class="w-full" disabled={busy}>
                {passwordSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <!-- Magic link + Google -->
            <div class="space-y-2">
              <Button
                type="button"
                variant="outline"
                class="w-full"
                onclick={handleMagicLink}
                disabled={busy}
              >
                {magicLinkLoading ? 'Sending…' : 'Email me a magic link'}
              </Button>
              {#if data.googleEnabled}
                <Button
                  type="button"
                  variant="outline"
                  class="w-full"
                  onclick={passkey.handleGoogle}
                  disabled={busy}
                >
                  <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              {/if}
            </div>
          </div>
        {/if}

        {#if form?.error}
          <p class="text-destructive mt-4 text-sm">{form.error}</p>
        {/if}
        {#if passkey.error}
          <p class="text-destructive mt-4 text-sm">{passkey.error}</p>
        {/if}
      </CardContent>
    </Card>

    <p class="text-muted-foreground mt-4 text-center text-sm">
      Don't have an account?
      <a href="/signup" class="text-primary hover:underline">Sign up</a>
    </p>
  </div>
</div>
