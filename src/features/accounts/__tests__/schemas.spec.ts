import { describe, expect, it } from 'vitest'

import { accountListSchema, accountSchema } from '@/features/accounts/schemas/account'
import { statementPageSchema, transactionSchema } from '@/features/accounts/schemas/statement'
import { formatPaise } from '@/lib/money'

const anAccount = {
  id: 'acc_salary',
  number: '000123456789',
  label: 'Salary',
  type: 'savings',
  currency: 'INR',
  balance: 12345678,
  available: 12000000,
  status: 'active',
}

const aPostedEntry = {
  id: 'txn_1',
  occurredAt: '2026-10-31T08:15:00.000Z',
  narration: 'UPI/9876543210/Groceries',
  direction: 'debit',
  amount: 145050,
  balanceAfter: 12200628,
  status: 'posted',
}

const aPendingEntry = {
  id: 'txn_2',
  occurredAt: '2026-11-01T04:00:00.000Z',
  narration: 'NEFT/HDFC0000123/Rent',
  direction: 'debit',
  amount: 2500000,
  status: 'pending',
}

describe('accountSchema', () => {
  it('turns wire paise into money that can be formatted', () => {
    const account = accountSchema.parse(anAccount)

    // The brand survives the boundary: no cast, no second check (rule 18).
    expect(formatPaise(account.balance)).toBe('₹1,23,456.78')
    expect(formatPaise(account.available)).toBe('₹1,20,000.00')
  })

  it('rejects a balance that is not an integer number of paise', () => {
    // A rupee float on the wire is the bug the whole money discipline prevents.
    expect(accountSchema.safeParse({ ...anAccount, balance: 123456.78 }).success).toBe(false)
    expect(accountSchema.safeParse({ ...anAccount, balance: '12345678' }).success).toBe(false)
  })

  it('strips fields it does not know about', () => {
    // A server adding a field must not break a client already in the wild.
    const account = accountSchema.parse({ ...anAccount, interestRate: 3.5 })

    expect('interestRate' in account).toBe(false)
  })

  it('still fails on a missing field', () => {
    const { label, ...withoutLabel } = anAccount

    expect(label).toBe('Salary')
    expect(accountSchema.safeParse(withoutLabel).success).toBe(false)
  })

  it.each(['12345678', '0001234567890123456', '0001-2345-6789', ''])(
    'rejects %p as an account number',
    (number) => {
      expect(accountSchema.safeParse({ ...anAccount, number }).success).toBe(false)
    },
  )

  it('rejects a status it cannot act on', () => {
    expect(accountSchema.safeParse({ ...anAccount, status: 'closed' }).success).toBe(false)
  })

  it('rejects a currency it cannot format', () => {
    // money.ts is INR-only; a USD account must fail here, not render as rupees.
    expect(accountSchema.safeParse({ ...anAccount, currency: 'USD' }).success).toBe(false)
  })

  it('parses the list envelope', () => {
    expect(accountListSchema.parse({ accounts: [anAccount] }).accounts).toHaveLength(1)
    expect(accountListSchema.parse({ accounts: [] }).accounts).toEqual([])
  })
})

describe('transactionSchema', () => {
  it('parses a posted entry, running balance and all', () => {
    const entry = transactionSchema.parse(aPostedEntry)

    expect(entry.status).toBe('posted')
    expect(entry.occurredAt).toBeInstanceOf(Date)
    expect(entry.occurredAt.toISOString()).toBe('2026-10-31T08:15:00.000Z')

    // The union narrows: `balanceAfter` only exists on this side of it (rule 17).
    if (entry.status !== 'posted') {
      throw new Error('expected a posted entry')
    }
    expect(formatPaise(entry.balanceAfter)).toBe('₹1,22,006.28')
  })

  it('parses a pending entry, which has no running balance yet', () => {
    const entry = transactionSchema.parse(aPendingEntry)

    expect(entry.status).toBe('pending')
    expect('balanceAfter' in entry).toBe(false)
  })

  it('requires a running balance once an entry has posted', () => {
    const { balanceAfter, ...withoutBalance } = aPostedEntry

    expect(balanceAfter).toBe(12200628)
    expect(transactionSchema.safeParse(withoutBalance).success).toBe(false)
  })

  it('rejects a status the app has no branch for', () => {
    // 'failed' arrives with the transfer flow in Phase 2, and adding it to the
    // union is what forces every caller to handle it.
    expect(transactionSchema.safeParse({ ...aPendingEntry, status: 'failed' }).success).toBe(false)
  })

  it('rejects a negative amount, because direction carries the sign', () => {
    expect(transactionSchema.safeParse({ ...aPostedEntry, amount: -145050 }).success).toBe(false)
  })

  it('rejects a direction that is neither', () => {
    expect(transactionSchema.safeParse({ ...aPostedEntry, direction: 'reversal' }).success).toBe(
      false,
    )
  })

  it.each(['31/10/2026', '2026-10-31', 'yesterday', ''])(
    'rejects %p as a timestamp',
    (occurredAt) => {
      expect(transactionSchema.safeParse({ ...aPostedEntry, occurredAt }).success).toBe(false)
    },
  )
})

describe('statementPageSchema', () => {
  it('keeps the server total independent of the rows on this page', () => {
    const page = statementPageSchema.parse({
      items: [aPostedEntry, aPendingEntry],
      page: 1,
      pageSize: 20,
      total: 137,
    })

    expect(page.items).toHaveLength(2)
    expect(page.total).toBe(137)
  })

  it('parses an empty page, which is the empty state', () => {
    const page = statementPageSchema.parse({ items: [], page: 1, pageSize: 20, total: 0 })

    expect(page.items).toEqual([])
  })

  it.each([
    { page: 0, pageSize: 20, total: 0 },
    { page: 1, pageSize: 0, total: 0 },
    { page: 1, pageSize: 20, total: -1 },
    { page: 1.5, pageSize: 20, total: 0 },
  ])('rejects the pagination envelope %p', (envelope) => {
    expect(statementPageSchema.safeParse({ items: [], ...envelope }).success).toBe(false)
  })
})
