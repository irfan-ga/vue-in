import { HttpResponse, delay, http, type AnyHandler } from 'msw'

import { config } from '@/lib/config'

import {
  STATEMENT_SORTS,
  accounts,
  queryStatement,
  type StatementQuery,
  type StatementSort,
} from './bank'

/**
 * The fake bank API.
 *
 * This is the development backend, not a test fixture — the same handlers serve
 * `pnpm dev`, the preview build Playwright drives, and Vitest. See
 * docs/adr/0004-msw-as-the-development-backend.md.
 *
 * Failure scenarios live in `./scenarios.ts` and are applied per test with
 * `server.use(...)` or in the browser with `?scenario=<name>`. Every endpoint
 * added here needs at least one there: a handler that can only succeed cannot
 * teach error handling, and the failure paths are the point of this project.
 */

/*
 * Realistic latency in development, so that skeletons and disabled buttons are
 * actually seen; none under test, because 600ms on every request is how a suite
 * gets slow enough to be skipped (rule 31).
 */
const LATENCY_MS = config.appEnv === 'test' ? 0 : 600

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const ACCOUNTS_PATH = '/api/accounts'
export const STATEMENT_PATH = '/api/accounts/:accountId/transactions'

export const handlers: AnyHandler[] = [
  http.get(ACCOUNTS_PATH, async () => {
    await delay(LATENCY_MS)

    return HttpResponse.json({ accounts })
  }),

  http.get(STATEMENT_PATH, async ({ params, request }) => {
    await delay(LATENCY_MS)

    const parsed = parseStatementQuery(new URL(request.url))
    if (!parsed.ok) {
      return HttpResponse.json({ message: parsed.message }, { status: 400 })
    }

    const accountId = String(params.accountId)
    const page = queryStatement(accountId, parsed.query)
    if (!page) {
      return HttpResponse.json({ message: `No account ${accountId}` }, { status: 404 })
    }

    return HttpResponse.json(page)
  }),
]

type ParsedQuery = { ok: true; query: StatementQuery } | { ok: false; message: string }

/**
 * A real API rejects nonsense rather than guessing, so this one does too — the
 * 400 is a state the client has to handle.
 */
function parseStatementQuery(url: URL): ParsedQuery {
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE))
  const sort = url.searchParams.get('sort') ?? 'occurredAt:desc'
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (!Number.isInteger(page) || page < 1) {
    return { ok: false, message: `page must be a positive integer, received ${page}` }
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return { ok: false, message: `pageSize must be between 1 and ${MAX_PAGE_SIZE}` }
  }
  if (!isStatementSort(sort)) {
    return { ok: false, message: `sort must be one of ${STATEMENT_SORTS.join(', ')}` }
  }
  if (from !== null && !ISO_DAY.test(from)) {
    return { ok: false, message: `from must be a YYYY-MM-DD date, received ${from}` }
  }
  if (to !== null && !ISO_DAY.test(to)) {
    return { ok: false, message: `to must be a YYYY-MM-DD date, received ${to}` }
  }

  return {
    ok: true,
    query: {
      page,
      pageSize,
      sort,
      ...(from !== null && { from }),
      ...(to !== null && { to }),
    },
  }
}

function isStatementSort(value: string): value is StatementSort {
  return (STATEMENT_SORTS as readonly string[]).includes(value)
}
