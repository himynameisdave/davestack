import config from '@himynameisdave/oxfmt-config';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...config,
  // Vendored (shadcn-svelte) and generated (Prisma client) code.
  ignorePatterns: ['src/lib/components/ui/**', 'src/generated/**'],
});
