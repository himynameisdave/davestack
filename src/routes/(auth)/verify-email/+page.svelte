<script lang="ts">
  import { page } from '$app/state';
  import { authClient } from '$lib/client/auth';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';

  const email = $derived(page.url.searchParams.get('email') ?? '');

  let sending = $state(false);
  let sent = $state(false);
  let error = $state('');

  async function resend() {
    if (!email) {
      error = 'No email address to resend to. Try signing in again.';
      return;
    }
    sending = true;
    error = '';

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/login?verified=1',
    });

    if (result.error) {
      error = result.error.message ?? 'Could not resend the verification email.';
    } else {
      sent = true;
    }
    sending = false;
  }
</script>

<div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <a href="/" class="text-2xl font-bold tracking-tight">davestack</a>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>Check your inbox to activate your account</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4 text-center">
        <p class="text-muted-foreground text-sm">
          {#if email}
            We sent a verification link to <strong>{email}</strong>. Click it, then sign in.
          {:else}
            We sent you a verification link. Click it, then sign in.
          {/if}
        </p>

        {#if sent}
          <p class="text-sm font-medium">Verification email resent.</p>
        {:else}
          <Button onclick={resend} disabled={sending} variant="outline" class="w-full">
            {sending ? 'Resending…' : 'Resend verification email'}
          </Button>
        {/if}

        {#if error}
          <p class="text-destructive text-sm">{error}</p>
        {/if}

        <Button href="/login" variant="ghost" class="w-full">Back to sign in</Button>
      </CardContent>
    </Card>
  </div>
</div>
