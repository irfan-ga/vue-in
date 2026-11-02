import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW in the browser. Started from src/main.ts when VITE_ENABLE_MSW is true,
 * which includes production preview builds so that Playwright has a backend.
 *
 * The worker script lives at public/mockServiceWorker.js and is generated —
 * regenerate it with `pnpm msw:init` after upgrading msw.
 */
export const worker = setupWorker(...handlers)
