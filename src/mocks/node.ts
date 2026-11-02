import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW in Node, for Vitest. Lifecycle is wired in src/test/setup.ts.
 * Shares src/mocks/handlers.ts with the browser worker so that tests and the
 * dev server cannot drift apart.
 */
export const server = setupServer(...handlers)
