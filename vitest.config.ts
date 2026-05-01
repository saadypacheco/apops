import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // Edge Functions tienen cold start de hasta ~10s la primera vez que
    // resuelven imports remotos (esm.sh). 15s da margen sin ser permisivo.
    testTimeout: 15000,
    hookTimeout: 15000,
    // Tests de contract/integration/rls comparten DNIs del seed y se pisan
    // entre sí si corren en paralelo (limpia uno mientras otro está usando
    // los datos). Forzamos serial: tarda ~2x pero es determinístico.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'node_modules/**', '.next/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
