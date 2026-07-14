<script lang="ts">
  import { enhance } from '$app/forms';
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
</script>

<div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <a href="/" class="text-2xl font-bold tracking-tight">davestack</a>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We'll email you a link to choose a new one</CardDescription>
      </CardHeader>
      <CardContent>
        {#if form?.success}
          <div class="space-y-4 text-center">
            <p class="font-medium">Check your email</p>
            <p class="text-muted-foreground text-sm">
              If an account exists for <strong>{form.email}</strong>, a reset link is on its way.
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

            {#if form?.error}
              <p class="text-destructive text-sm">{form.error}</p>
            {/if}

            <Button type="submit" class="w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        {/if}
      </CardContent>
    </Card>

    <p class="text-muted-foreground mt-4 text-center text-sm">
      Remembered it?
      <a href="/login" class="text-primary hover:underline">Sign in</a>
    </p>
  </div>
</div>
