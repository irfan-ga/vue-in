import { HttpResponse, delay, http, type AnyHandler } from 'msw'
import { z } from 'zod'

import { config } from '@/lib/config'

import {
  STATEMENT_SORTS,
  createTransfer,
  findTransfer,
  listAccounts,
  queryStatement,
  type StatementQuery,
  type StatementSort,
  type TransferInstruction,
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
export const TRANSFERS_PATH = '/api/transfers'
export const TRANSFER_PATH = '/api/transfers/:transferId'

/*
 * The bank's own validation of what it is sent. It deliberately repeats the
 * client's rules rather than importing them: a server that trusts the client's
 * schema is not validating anything, and the contract test is what proves the
 * two still agree.
 */
const instructionSchema = z.object({
  fromAccountId: z.string().min(1),
  beneficiaryName: z.string().min(2).max(60),
  beneficiaryAccountNumber: z.string().regex(/^\d{9,18}$/),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  amount: z.number().int().positive(),
  remarks: z.string().max(40).optional(),
})

/** Exported so a scenario can accept a transfer and then lose the response. */
export function readInstruction(body: unknown): TransferInstruction | undefined {
  const parsed = instructionSchema.safeParse(body)

  return parsed.success ? parsed.data : undefined
}

export const handlers: AnyHandler[] = [
  http.get(ACCOUNTS_PATH, async () => {
    await delay(LATENCY_MS)

    return HttpResponse.json({ accounts: listAccounts() })
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

  http.post(TRANSFERS_PATH, async ({ request }) => {
    await delay(LATENCY_MS)

    const idempotencyKey = request.headers.get('idempotency-key')

    // A money-moving request without a key is refused, not quietly accepted.
    if (idempotencyKey === null || idempotencyKey === '') {
      return HttpResponse.json(
        { message: 'An Idempotency-Key header is required to move money' },
        { status: 400 },
      )
    }

    const instruction = readInstruction(await request.json())

    if (!instruction) {
      return HttpResponse.json(
        { message: 'That transfer instruction is malformed' },
        { status: 400 },
      )
    }

    const outcome = createTransfer(idempotencyKey, instruction)

    if (!outcome.ok) {
      return HttpResponse.json({ message: outcome.message }, { status: outcome.status })
    }

    /*
     * 202 for a transfer the bank has taken on but not yet settled; 200 when it
     * is replaying one it already has, which is what a retry should see.
     */
    return HttpResponse.json(outcome.transfer, {
      status: outcome.replayed ? 200 : 202,
      headers: { 'idempotency-replayed': String(outcome.replayed) },
    })
  }),

  http.get(TRANSFER_PATH, async ({ params }) => {
    await delay(LATENCY_MS)

    const transfer = findTransfer(String(params.transferId))

    return transfer
      ? HttpResponse.json(transfer)
      : HttpResponse.json({ message: `No transfer ${String(params.transferId)}` }, { status: 404 })
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
