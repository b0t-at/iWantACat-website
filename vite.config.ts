import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gdpr: resolve(import.meta.dirname, 'gdpr.html'),
      },
    },
  },
});
