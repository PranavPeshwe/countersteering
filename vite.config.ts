import { defineConfig } from 'vitest/config';
import { artifactDirectory, ARTIFACT_ROOT } from './tooling/artifacts.mjs';

export default defineConfig({
  base: './',
  cacheDir: artifactDirectory('vite-cache'),
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: { allow: [process.cwd(), ARTIFACT_ROOT] },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: {
    outDir: artifactDirectory('dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
