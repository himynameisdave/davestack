<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
</script>

<main
  class="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center"
>
  <h1 class="text-5xl font-bold tracking-tight">davestack</h1>
  <p class="text-muted-foreground max-w-md text-lg">
    A batteries-included SvelteKit template: auth, admin, email, analytics, and an e2e suite — ready
    to build on.
  </p>
  <div class="flex gap-3">
    {#if data.user}
      <Button href="/home">Go to app</Button>
    {:else}
      <Button href="/signup">Get started</Button>
      <Button href="/login" variant="outline">Sign in</Button>
    {/if}
  </div>
</main>
