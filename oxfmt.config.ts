import svelte from '@himynameisdave/oxfmt-config/svelte';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...svelte,
  // Prisma client is generated into src/generated and never hand-edited.
  ignorePatterns: ['src/generated/**'],
  sortTailwindcss: {
    ...svelte.sortTailwindcss,
    // Tailwind v4 entry point — omitting it risks silently no-op class sorting.
    stylesheet: './src/app.css',
  },
});
