import type { AnyHandler } from 'msw'

/**
 * The fake bank API.
 *
 * This is the development backend, not a test fixture — the same handlers run in
 * the browser during `pnpm dev` and in Node during Vitest. See
 * docs/adr/0004-msw-as-the-development-backend.md.
 *
 * When adding an endpoint, add at least one failure scenario alongside the happy
 * path. A handler that can only succeed cannot teach error handling, and the
 * failure paths are the point of this project.
 *
 * Useful imports:
 *   import { http, HttpResponse, delay } from 'msw'
 *
 *   http.get('/api/accounts', async () => {
 *     await delay(800)                                   // realistic latency
 *     return HttpResponse.json({ accounts: [] })
 *   })
 *
 *   http.post('/api/transfers', () =>
 *     HttpResponse.json({ message: 'Service unavailable' }, { status: 503 }),
 *   )
 *
 * Scenarios worth modelling for the transfer flow (Phase 2):
 *   - a 3-second stall, then success
 *   - a 500 on the first attempt, success on retry with the same idempotency key
 *   - a request that times out after the transfer has already been accepted
 *     (the "response lost" case)
 */
export const handlers: AnyHandler[] = []
