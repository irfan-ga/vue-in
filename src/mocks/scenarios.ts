import { HttpResponse, delay, http, type AnyHandler } from 'msw'

import { accounts } from './bank'
import { ACCOUNTS_PATH, STATEMENT_PATH } from './handlers'

/**
 * The failure and edge-case scenarios, named once and reachable from both
 * sides: a test applies one with `server.use(...scenarios['statement-error'])`,
 * and in the browser `?scenario=statement-error` applies it for the session
 * (see ./browser.ts).
 *
 * Rule 5 asks for four states on every async surface. The handlers in
 * ./handlers.ts provide the happy one; these provide the rest, without a line
 * of application code changing to reach them.
 */
const SLOW_MS = 4_000

export const scenarios = {
  /** The accounts list fails outright: the screen's error state. */
  'accounts-error': [
    http.get(ACCOUNTS_PATH, () =>
      HttpResponse.json({ message: 'The bank is not responding' }, { status: 503 }),
    ),
  ],

  /** A customer with no accounts. An empty list is not an error. */
  'accounts-empty': [http.get(ACCOUNTS_PATH, () => HttpResponse.json({ accounts: [] }))],

  /** Four seconds of nothing — long enough to see the skeleton and get bored. */
  'accounts-slow': [
    http.get(ACCOUNTS_PATH, async () => {
      await delay(SLOW_MS)

      return HttpResponse.json({ accounts })
    }),
  ],

  /** Every statement page fails, for every account. */
  'statement-error': [
    http.get(STATEMENT_PATH, () =>
      HttpResponse.json({ message: 'Statement temporarily unavailable' }, { status: 503 }),
    ),
  ],

  /**
   * Fails once, then succeeds. `once: true` retires the handler after a single
   * request so the next one falls through to the real handler — which is what
   * makes a retry button provable instead of hopeful.
   */
  'statement-retry': [
    http.get(STATEMENT_PATH, () => HttpResponse.json({ message: 'Try again' }, { status: 500 }), {
      once: true,
    }),
  ],
} satisfies Record<string, AnyHandler[]>

export type ScenarioName = keyof typeof scenarios

const byName = new Map<string, AnyHandler[]>(Object.entries(scenarios))

export const SCENARIO_NAMES: string[] = [...byName.keys()]

export function findScenario(name: string): AnyHandler[] | undefined {
  return byName.get(name)
}
