import { describe, expect, it } from 'vitest'

import { fetchAccounts } from '@/features/accounts/api/accounts'
import {
  DEFAULT_PAGE_SIZE,
  fetchStatement,
  type StatementParams,
} from '@/features/accounts/api/statement'
import { formatPaise } from '@/lib/money'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'
import { failureOf } from '@/test/http'

const SALARY = 'acc_salary'
const DORMANT = 'acc_dormant'

const firstPage: StatementParams = {
  accountId: SALARY,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'occurredAt:desc',
}

describe('fetchAccounts', () => {
  it('returns parsed accounts without the transport envelope', async () => {
    const accounts = await fetchAccounts()
    const first = accounts[0]

    if (!first) {
      throw new Error('expected the mock bank to hold at least one account')
    }

    // Already money: no cast, no conversion, formattable as it stands.
    expect(formatPaise(first.balance)).toMatch(/^₹/)
    expect(accounts.map((account) => account.id)).toContain(SALARY)
  })

  it('surfaces a failing bank as a status failure carrying its message', async () => {
    server.use(...scenarios['accounts-error'])

    await expect(failureOf(fetchAccounts())).resolves.toStrictEqual({
      kind: 'status',
      status: 503,
      message: 'The bank is not responding',
    })
  })

  it('returns an empty list as data, not as an error', async () => {
    server.use(...scenarios['accounts-empty'])

    await expect(fetchAccounts()).resolves.toStrictEqual([])
  })
})

describe('fetchStatement', () => {
  it('asks the server for one page and renders what it is given', async () => {
    const page = await fetchStatement(firstPage)

    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page.total).toBeGreaterThan(DEFAULT_PAGE_SIZE)

    const timestamps = page.items.map((entry) => entry.occurredAt.getTime())
    expect(timestamps).toStrictEqual([...timestamps].sort((a, b) => b - a))
  })

  it('sends the date range as a filter the server applies to the total', async () => {
    const unfiltered = await fetchStatement(firstPage)
    const newest = unfiltered.items[0]

    if (!newest) {
      throw new Error('expected the statement to have rows')
    }

    const day = newest.occurredAt.toISOString().slice(0, 10)
    const filtered = await fetchStatement({ ...firstPage, from: day, to: day })

    expect(filtered.total).toBeLessThan(unfiltered.total)
  })

  it('returns an empty page for an account with no entries', async () => {
    const page = await fetchStatement({ ...firstPage, accountId: DORMANT })

    expect(page.items).toStrictEqual([])
    expect(page.total).toBe(0)
  })

  it('reports an unknown account as 404 rather than as an empty statement', async () => {
    const failure = await failureOf(fetchStatement({ ...firstPage, accountId: 'acc_nope' }))

    expect(failure).toMatchObject({ kind: 'status', status: 404 })
  })

  it('reports a page size the server refuses as 400', async () => {
    // The client should never send this; if it does, it is a bug with a reason.
    const failure = await failureOf(fetchStatement({ ...firstPage, pageSize: 500 }))

    expect(failure).toMatchObject({ kind: 'status', status: 400 })
  })

  it('succeeds on a second attempt after a one-off failure', async () => {
    // What a retry button has to be able to rely on.
    server.use(...scenarios['statement-retry'])

    const failure = await failureOf(fetchStatement(firstPage))
    expect(failure).toMatchObject({ kind: 'status', status: 500 })

    await expect(fetchStatement(firstPage)).resolves.toMatchObject({ page: 1 })
  })
})
