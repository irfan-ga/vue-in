import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      /*
       * Tells src/lib/config.ts which environment this is, which is how the MSW
       * handlers drop their artificial latency under test. The committed .env
       * says `development`, and that is right for `pnpm dev`.
       */
      env: { VITE_APP_ENV: 'test' },
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // Starts the MSW node server for every test file.
      setupFiles: ['src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/main.ts',
          'src/mocks/**',
          'src/test/**',
          'src/**/__tests__/**',
          'src/**/*.d.ts',
        ],
        /*
         * Thresholds are intentionally absent until Phase 5, when there is
         * enough code for a number to mean something. Enable them there — see
         * docs/ROADMAP.md.
         */
      },
    },
  }),
)
