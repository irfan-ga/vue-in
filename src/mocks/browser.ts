import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'
import { SCENARIO_NAMES, findScenario } from './scenarios'

/**
 * MSW in the browser. Started from src/main.ts when mocking is enabled, which
 * includes production preview builds so that Playwright has a backend.
 *
 * The worker script lives at public/mockServiceWorker.js and is generated —
 * regenerate it with `pnpm msw:init` after upgrading msw.
 */
export const worker = setupWorker(...handlers)

/*
 * `?scenario=statement-error` applies a failure scenario for this session: it is
 * how the loading, empty and error states are reached in the running app and not
 * only in tests. An unknown name throws rather than being quietly ignored —
 * src/main.ts turns that into a visible boot failure, and there is no logger to
 * warn through yet (rule 23).
 */
const requested = new URLSearchParams(window.location.search).get('scenario')

if (requested !== null) {
  const scenario = findScenario(requested)

  if (!scenario) {
    throw new Error(`Unknown MSW scenario "${requested}". Known: ${SCENARIO_NAMES.join(', ')}`)
  }

  worker.use(...scenario)
}
