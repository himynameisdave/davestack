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

  let { data, form } = $props();

  let submitting = $state(false);

  const invalidLink = $derived(!data.token || Boolean(data.linkError));
</script>

<div class="flex min-h-svh flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <a href="/" class="text-2xl font-bold tracking-tight">davestack</a>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Enter a new password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        {#if invalidLink}
          <div class="space-y-4 text-center">
            <p class="text-destructive text-sm">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <Button href="/forgot-password" variant="outline" class="w-full">
              Request a new link
            </Button>
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
            <input type="hidden" name="token" value={data.token} />
            <div class="space-y-2">
              <Label for="password">New password</Label>
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
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>
