import { server } from '@/mocks/node'

/**
 * Records the requests MSW sees.
 *
 * Proving that a cache worked means proving a request did *not* happen, and
 * this is the only way to watch for that. `src/test/setup.ts` drops every
 * listener after each test, so a log cannot outlive the test that made it.
 */
export function requestLog(): { urls: string[] } {
  const urls: string[] = []

  server.events.on('request:start', (event) => {
    urls.push(event.request.url)
  })

  return { urls }
}
