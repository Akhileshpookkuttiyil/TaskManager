import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.{test,spec}.{js,mjs,cjs}'],
    exclude: ['**/node_modules/**', 'test_phase5_*.js'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        'test_phase5_*.js',
        'vitest.config.*',
      ],
    },
  },
});
