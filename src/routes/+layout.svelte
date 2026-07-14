<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { ModeWatcher } from 'mode-watcher';
  import { Toaster } from '$lib/components/ui/sonner';

  let { children } = $props();

  // Inject the Umami tracking script after hydration, and ONLY for real users
  // in production. The gate deliberately excludes:
  //   • analytics-off clones     — PUBLIC_UMAMI_WEBSITE_ID unset (the default)
  //   • dev                      — `dev` is true when running `vite dev`
  //   • e2e / test               — PUBLIC_UMAMI_WEBSITE_ID is unset in .env.test
  //   • the admin area           — pathname under /admin is never tracked
  // Env is read from $env/dynamic/public (not $env/static/public) so Railway
  // runtime config wins instead of the value being baked in at build time.
  onMount(() => {
    const websiteId = env.PUBLIC_UMAMI_WEBSITE_ID;
    if (!websiteId || dev || page.url.pathname.startsWith('/admin')) return;

    const script = document.createElement('script');
    script.src = env.PUBLIC_UMAMI_SRC || 'https://cloud.umami.is/script.js';
    script.defer = true;
    script.dataset.websiteId = websiteId;
    document.head.append(script);
  });
</script>

<ModeWatcher />
<Toaster />

{@render children()}
