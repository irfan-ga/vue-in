import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from 'eslint-config-prettier/flat'

/*
 * Type-aware linting, run as its own CI job rather than inside `pnpm verify`.
 *
 * These rules need the TypeScript program, which makes them far slower than the
 * syntactic pass. Keeping them out of the fast gate is deliberate: a PR gate that
 * creeps past a few minutes is a gate people start skipping (rule 31).
 *
 * The rule that justifies the whole job is `no-floating-promises`. An unawaited
 * mutation in a transfer flow is exactly the bug class this app exists to practise
 * — the money moves, nothing awaits the result, and the UI reports success.
 *
 * `recommendedTypeCheckedOnly` contributes only the type-aware rules, since the
 * syntactic ones already ran in eslint.config.ts.
 */
export default defineConfigWithVueTs(
  {
    name: 'app/typed-files-to-lint',
    files: ['src/**/*.{ts,mts,vue}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    'public/mockServiceWorker.js',
  ]),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommendedTypeCheckedOnly,

  skipFormatting,
)
