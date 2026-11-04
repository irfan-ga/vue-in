import { describe, expect, it } from 'vitest'

import { accountListSchema } from '@/features/accounts/schemas/account'
import { statementPageSchema, type Transaction } from '@/features/accounts/schemas/statement'
import { config } from '@/lib/config'
import { formatPaise, negatePaise, subtractPaise, sumPaise } from '@/lib/money'

/**
 * The contract test.
 *
 * What the mock bank sends has to satisfy the schemas the app parses with, and
 * the two sides share nothing — `src/mocks/` may not import `src/features/`, so
 * no shared type can paper over a drift. This test is what holds them together,
 * and it fails the moment either side moves.
 */
async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${config.apiBaseUrl}${path}`)

  expect(response.status).toBe(200)

  return response.json()
}

/** Narrows the statement union to the side that carries a running balance. */
function isPosted(entry: Transaction): entry is Extract<Transaction, { status: 'posted' }> {
  return entry.status === 'posted'
}

const SALARY = 'acc_salary'
const DORMANT = 'acc_dormant'

describe('GET /accounts', () => {
  it('sends accounts the app can parse and format', async () => {
    const { accounts } = accountListSchema.parse(await getJson('/accounts'))

    expect(accounts.length).toBeGreaterThan(0)

    for (const account of accounts) {
      expect(account.currency).toBe('INR')
      // Every balance survives the brand and formats as Indian currency.
      expect(formatPaise(account.balance)).toMatch(/^-?₹[\d,]+\.\d{2}$/)
      expect(account.available).toBeLessThanOrEqual(account.balance)
    }
  })

  it('includes an account in each status the UI has to render', async () => {
    const { accounts } = accountListSchema.parse(await getJson('/accounts'))
    const statuses = accounts.map((account) => account.status)

    expect(statuses).toContain('active')
    expect(statuses).toContain('dormant')
    expect(statuses).toContain('frozen')
  })
})

describe('GET /accounts/:id/transactions', () => {
  it('sends a page the app can parse, newest first by default', async () => {
    const page = statementPageSchema.parse(await getJson(`/accounts/${SALARY}/transactions`))

    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(20)
    expect(page.total).toBeGreaterThan(page.pageSize)
    expect(page.items).toHaveLength(page.pageSize)

    const timestamps = page.items.map((entry) => entry.occurredAt.getTime())
    expect(timestamps).toStrictEqual([...timestamps].sort((a, b) => b - a))
  })

  it('paginates server-side: page two is a different slice of the same total', async () => {
    const first = statementPageSchema.parse(
      await getJson(`/accounts/${SALARY}/transactions?page=1&pageSize=5`),
    )
    const second = statementPageSchema.parse(
      await getJson(`/accounts/${SALARY}/transactions?page=2&pageSize=5`),
    )

    expect(second.total).toBe(first.total)
    expect(second.items.map((entry) => entry.id)).not.toStrictEqual(
      first.items.map((entry) => entry.id),
    )
  })

  it('sorts by amount when asked', async () => {
    const page = statementPageSchema.parse(
      await getJson(`/accounts/${SALARY}/transactions?sort=amount:asc&pageSize=50`),
    )
    const amounts = page.items.map((entry) => entry.amount)

    expect(amounts).toStrictEqual([...amounts].sort((a, b) => a - b))
  })

  it('filters by date range, narrowing the total and not just the page', async () => {
    const all = statementPageSchema.parse(await getJson(`/accounts/${SALARY}/transactions`))
    const newest = all.items[0]
    if (!newest) {
      throw new Error('expected the statement to have rows')
    }

    const day = newest.occurredAt.toISOString().slice(0, 10)
    const filtered = statementPageSchema.parse(
      await getJson(`/accounts/${SALARY}/transactions?from=${day}&to=${day}`),
    )

    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.total).toBeGreaterThan(0)
    for (const entry of filtered.items) {
      expect(entry.occurredAt.toISOString().slice(0, 10)).toBe(day)
    }
  })

  it('sends an empty page rather than an error for an account with no entries', async () => {
    // The empty state is reachable in the UI by opening this account.
    const page = statementPageSchema.parse(await getJson(`/accounts/${DORMANT}/transactions`))

    expect(page.items).toStrictEqual([])
    expect(page.total).toBe(0)
  })

  it('404s on an account that does not exist', async () => {
    const response = await fetch(`${config.apiBaseUrl}/accounts/acc_nope/transactions`)

    expect(response.status).toBe(404)
  })

  it.each([
    'page=0',
    'page=abc',
    'pageSize=0',
    'pageSize=500',
    'sort=narration:asc',
    'from=31-10-2026',
    'to=yesterday',
  ])('400s on %s rather than guessing', async (query) => {
    const response = await fetch(`${config.apiBaseUrl}/accounts/${SALARY}/transactions?${query}`)

    expect(response.status).toBe(400)
  })
})

describe('the ledger the mock bank keeps', () => {
  async function allEntries(accountId: string): Promise<Transaction[]> {
    const first = statementPageSchema.parse(
      await getJson(`/accounts/${accountId}/transactions?pageSize=100&sort=occurredAt:asc`),
    )
    const second = statementPageSchema.parse(
      await getJson(`/accounts/${accountId}/transactions?page=2&pageSize=100&sort=occurredAt:asc`),
    )

    const entries = [...first.items, ...second.items]
    expect(entries).toHaveLength(first.total)

    return entries
  }

  it('chains every running balance by exactly the entry amount', async () => {
    const posted = (await allEntries(SALARY)).filter(isPosted)
    const first = posted[0]

    if (!first) {
      throw new Error('expected the salary ledger to have posted entries')
    }

    /*
     * Replays the ledger from its first running balance using only the amounts
     * and directions. If the mock bank ever drifts by a paise — or starts
     * recomputing balances with a float — these two arrays stop matching.
     */
    const replayed = [first.balanceAfter]
    let running = first.balanceAfter

    for (const entry of posted.slice(1)) {
      running = sumPaise(
        running,
        entry.direction === 'credit' ? entry.amount : negatePaise(entry.amount),
      )
      replayed.push(running)
    }

    expect(posted.map((entry) => entry.balanceAfter)).toStrictEqual(replayed)
  })

  it('leaves pending debits out of the available balance, but not out of the ledger', async () => {
    const { accounts } = accountListSchema.parse(await getJson('/accounts'))
    const account = accounts.find((candidate) => candidate.id === SALARY)
    const entries = await allEntries(SALARY)

    if (!account) {
      throw new Error(`expected ${SALARY} in the account list`)
    }

    const pendingDebits = entries
      .filter((entry) => entry.status === 'pending' && entry.direction === 'debit')
      .map((entry) => entry.amount)

    expect(pendingDebits.length).toBeGreaterThan(0)
    expect(account.available).toBe(subtractPaise(account.balance, sumPaise(...pendingDebits)))
  })

  it('reports the posted balance as the account balance', async () => {
    const { accounts } = accountListSchema.parse(await getJson('/accounts'))
    const account = accounts.find((candidate) => candidate.id === SALARY)
    const last = (await allEntries(SALARY)).filter(isPosted).at(-1)

    if (!account || !last) {
      throw new Error('expected a posted entry and an account')
    }

    expect(account.balance).toBe(last.balanceAfter)
  })
})
