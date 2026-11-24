import { fileURLToPath } from 'node:url';

import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, normalizePath } from 'vite';

import pkg from './package.json' with { type: 'json' };

const appSource = normalizePath(fileURLToPath(new URL('src/', import.meta.url)));

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter(),
      dynamicCompileOptions({ filename }) {
        if (normalizePath(filename).startsWith(appSource)) {
          return { runes: true };
        }
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
