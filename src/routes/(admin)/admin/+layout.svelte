<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  let { children } = $props();
</script>

<div class="flex min-h-svh flex-col">
  <header class="border-b">
    <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <a href="/home" class="font-bold tracking-tight">davestack</a>
        <span class="text-muted-foreground text-sm">/ admin</span>
      </div>
      <Button href="/home" variant="ghost" size="sm">Back to app</Button>
    </nav>
  </header>

  <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
    {@render children()}
  </main>
</div>
