import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetBank } from '@/mocks/bank'
import { server } from '@/mocks/node'

/**
 * Global Vitest setup. Registered via `test.setupFiles` in vitest.config.ts.
 *
 * `onUnhandledFrame: 'error'` makes a request with no handler fail the test
 * instead of silently hitting the network — in a test suite, an unmocked request
 * is a mistake, not something to warn about.
 */
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

// Per-test overrides (e.g. forcing a 500) must not leak into the next test, and
// neither may a request log left behind by `src/test/requests.ts`.
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  // The mock bank holds state now — transfers, held funds, settled balances.
  resetBank()
})

afterAll(() => {
  server.close()
})
