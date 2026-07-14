<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
</script>

<main
  class="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
>
  <p class="text-muted-foreground text-6xl font-bold">{page.status}</p>
  <h1 class="text-2xl font-semibold">
    {page.error?.message ?? 'Something went wrong'}
  </h1>
  {#if page.error?.errorId}
    <p class="text-muted-foreground text-xs">Reference: {page.error.errorId}</p>
  {/if}
  <Button href="/">Go home</Button>
</main>
