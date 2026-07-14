<script lang="ts">
  import { enhance } from '$app/forms';
  import { track } from '$lib/analytics';
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

  let { form } = $props();

  let submitting = $state(false);

  // Fire the one analytics event exactly once, when signup first succeeds.
  // `track` no-ops unless Umami is loaded, so this is safe in dev/e2e/SSR.
  let tracked = $state(false);
  $effect(() => {
    if (form?.success && !tracked) {
      tracked = true;
      track('signup_completed', { method: 'password' });
    }
  });
</script>

<div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <a href="/" class="text-2xl font-bold tracking-tight">davestack</a>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Sign up with your email and a password</CardDescription>
      </CardHeader>
      <CardContent>
        {#if form?.success}
          <div class="space-y-4 text-center">
            <p class="font-medium">Verify your email</p>
            <p class="text-muted-foreground text-sm">
              We sent a verification link to <strong>{form.email}</strong>. Click it to activate
              your account, then sign in.
            </p>
            <Button href="/login" variant="outline" class="w-full">Back to sign in</Button>
          </div>
        {:else}
          <form
            method="POST"
            class="space-y-4"
            use:enhance={() => {
              submitting = true;
              return async ({ update }) => {
                await update();
                submitting = false;
              };
            }}
          >
            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autocomplete="name"
                value={form?.name ?? ''}
                required
                disabled={submitting}
              />
            </div>
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                value={form?.email ?? ''}
                required
                disabled={submitting}
              />
            </div>
            <div class="space-y-2">
              <Label for="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                disabled={submitting}
              />
              <p class="text-muted-foreground text-xs">At least 8 characters.</p>
            </div>

            {#if form?.error}
              <p class="text-destructive text-sm">{form.error}</p>
            {/if}

            <Button type="submit" class="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        {/if}
      </CardContent>
    </Card>

    <p class="text-muted-foreground mt-4 text-center text-sm">
      Already have an account?
      <a href="/login" class="text-primary hover:underline">Sign in</a>
    </p>
  </div>
</div>
