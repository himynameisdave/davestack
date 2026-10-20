<script lang="ts">
  import '../app.css';

  import { ModeWatcher } from 'mode-watcher';
  import { onMount } from 'svelte';

  import { Toaster } from '#lib/components/ui/sonner/index.js';
  import { dev } from '$app/env';
  import { PUBLIC_UMAMI_WEBSITE_ID, PUBLIC_UMAMI_SRC } from '$app/env/public';
  import { page } from '$app/state';

  let { children } = $props();

  // Inject the Umami tracking script after hydration, and ONLY for real users
  // in production. The gate deliberately excludes:
  //   • analytics-off clones     — PUBLIC_UMAMI_WEBSITE_ID unset (the default)
  //   • dev                      — `dev` is true when running `vite dev`
  //   • e2e / test               — PUBLIC_UMAMI_WEBSITE_ID is unset in .env.test
  //   • the admin area           — pathname under /admin is never tracked
  // Env is read from $app/env/public, declared dynamic in src/env.ts, so Railway
  // runtime config wins instead of the value being baked in at build time.
  onMount(() => {
    const websiteId = PUBLIC_UMAMI_WEBSITE_ID;
    if (!websiteId || dev || page.url.pathname.startsWith('/admin')) {
      return;
    }

    const script = document.createElement('script');
    script.src = PUBLIC_UMAMI_SRC || 'https://cloud.umami.is/script.js';
    script.defer = true;
    script.dataset.websiteId = websiteId;
    document.head.append(script);
  });
</script>

<ModeWatcher />
<Toaster />

{@render children()}
