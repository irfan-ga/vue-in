/**
 * The bank's data, and the queries its statement endpoint answers.
 *
 * Written without the client's zod schemas on purpose: this module plays the
 * part of a server, and sharing a type with the client would hide a drift
 * between what the server sends and what the client accepts. The boundaries
 * config enforces the same thing — `mocks/` may not import `features/`. The
 * contract test in `features/accounts/__tests__` parses these payloads with the
 * real schemas instead, which is the check that matters.
 *
 * The ledger is generated from fixed seeds, so pagination, sorting and running
 * balances are identical on every run and a failing test can be re-run. Only
 * the dates are relative to today, so that a date-range filter keeps returning
 * something as weeks pass.
 */

export type WireAccount = {
  id: string
  number: string
  label: string
  type: 'savings' | 'current'
  currency: 'INR'
  balance: number
  available: number
  status: 'active' | 'dormant' | 'frozen'
}

export type WireTransaction = {
  id: string
  occurredAt: string
  narration: string
  direction: 'credit' | 'debit'
  amount: number
  status: 'posted' | 'pending'
  /** Present only once an entry has posted — a pending entry has not moved it. */
  balanceAfter?: number
}

export const STATEMENT_SORTS = [
  'occurredAt:desc',
  'occurredAt:asc',
  'amount:desc',
  'amount:asc',
] as const

export type StatementSort = (typeof STATEMENT_SORTS)[number]

export type StatementQuery = {
  page: number
  pageSize: number
  sort: StatementSort
  /** Inclusive `YYYY-MM-DD` bounds. */
  from?: string
  to?: string
}

export type StatementPagePayload = {
  items: WireTransaction[]
  page: number
  pageSize: number
  total: number
}

const MS_PER_DAY = 86_400_000
const PAISE_PER_RUPEE = 100
const LEDGER_DAYS = 150
const SALARY_EVERY = 15
const JITTER = 0.8

/** Mock-data sugar: whole rupees on paper, paise in the payload. */
function rupees(amount: number): number {
  return amount * PAISE_PER_RUPEE
}

const SALARY_AMOUNT = rupees(85_000)
const MIN_DEBIT = rupees(100)
const MAX_DEBIT = rupees(8_000)

const DEBIT_NARRATIONS = [
  'UPI/9876543210/Groceries',
  'UPI/8123456789/Coffee',
  'ATM WDL/MG ROAD',
  'CARD/FOOD DELIVERY',
  'NEFT/HDFC0000123/Rent',
  'IMPS/ICIC0001234/Electricity',
  'UPI/7012345678/Fuel',
  'CARD/ONLINE RETAIL',
] as const

const CREDIT_NARRATIONS = [
  'SALARY CREDIT/ACME TECH',
  'UPI/9900112233/Refund',
  'INTEREST CREDIT',
] as const

/** mulberry32: four lines of seeded PRNG, so the ledger never shifts under us. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function pick(values: readonly [string, ...string[]], random: () => number): string {
  return values[Math.floor(random() * values.length)] ?? values[0]
}

type Ledger = {
  transactions: WireTransaction[]
  balance: number
  available: number
}

type LedgerSeed = {
  id: string
  seed: number
  entries: number
  openingBalance: number
  /** How many of the newest entries have not posted yet. */
  pending: number
}

/** Walks a ledger oldest entry first, so every running balance is consistent. */
function generateLedger(options: LedgerSeed): Ledger {
  const random = createRandom(options.seed)
  const today = new Date()
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const span = LEDGER_DAYS * MS_PER_DAY
  const slot = options.entries === 0 ? 0 : span / options.entries
  const firstPending = options.entries - options.pending

  const transactions: WireTransaction[] = []
  let balance = options.openingBalance
  let pendingDebits = 0

  for (let index = 0; index < options.entries; index += 1) {
    const at = start - span + index * slot + Math.floor(random() * slot * JITTER)
    const credit = index % SALARY_EVERY === 0
    const amount = credit
      ? SALARY_AMOUNT
      : Math.round((MIN_DEBIT + random() * (MAX_DEBIT - MIN_DEBIT)) / PAISE_PER_RUPEE) *
        PAISE_PER_RUPEE

    const entry = {
      id: `txn_${options.id}_${String(index).padStart(3, '0')}`,
      occurredAt: new Date(at).toISOString(),
      narration: pick(credit ? CREDIT_NARRATIONS : DEBIT_NARRATIONS, random),
      direction: credit ? ('credit' as const) : ('debit' as const),
      amount,
    }

    if (index >= firstPending) {
      // Uncleared, so it has moved nothing yet — but it is not spendable either.
      transactions.push({ ...entry, status: 'pending' })
      if (!credit) pendingDebits += amount
      continue
    }

    balance += credit ? amount : -amount
    transactions.push({ ...entry, status: 'posted', balanceAfter: balance })
  }

  return { transactions, balance, available: balance - pendingDebits }
}

const salary = generateLedger({
  id: 'salary',
  seed: 11,
  entries: 137,
  openingBalance: rupees(200_000),
  pending: 2,
})

const household = generateLedger({
  id: 'household',
  seed: 23,
  entries: 9,
  openingBalance: rupees(18_500) + 47,
  pending: 1,
})

const business = generateLedger({
  id: 'business',
  seed: 37,
  entries: 24,
  openingBalance: rupees(420_000),
  pending: 0,
})

/** No entries at all: this is how the statement's empty state is reached. */
const dormant = generateLedger({
  id: 'dormant',
  seed: 41,
  entries: 0,
  openingBalance: rupees(1_250) + 60,
  pending: 0,
})

export const accounts: WireAccount[] = [
  {
    id: 'acc_salary',
    number: '000123456789',
    label: 'Salary',
    type: 'savings',
    currency: 'INR',
    balance: salary.balance,
    available: salary.available,
    status: 'active',
  },
  {
    id: 'acc_household',
    number: '000987654321',
    label: 'Household',
    type: 'savings',
    currency: 'INR',
    balance: household.balance,
    available: household.available,
    status: 'active',
  },
  {
    id: 'acc_business',
    number: '000555000111',
    label: 'Business current',
    type: 'current',
    currency: 'INR',
    balance: business.balance,
    available: business.available,
    status: 'frozen',
  },
  {
    id: 'acc_dormant',
    number: '000222333444',
    label: 'Old savings',
    type: 'savings',
    currency: 'INR',
    balance: dormant.balance,
    available: dormant.available,
    status: 'dormant',
  },
]

const ledgers = new Map<string, Ledger>([
  ['acc_salary', salary],
  ['acc_household', household],
  ['acc_business', business],
  ['acc_dormant', dormant],
])

export function findAccount(accountId: string): WireAccount | undefined {
  return accounts.find((account) => account.id === accountId)
}

/** `undefined` means no such account — the endpoint turns that into a 404. */
export function queryStatement(
  accountId: string,
  query: StatementQuery,
): StatementPagePayload | undefined {
  const ledger = ledgers.get(accountId)
  if (!ledger) return undefined

  const matching = ledger.transactions.filter((entry) => {
    const day = entry.occurredAt.slice(0, 10)
    if (query.from !== undefined && day < query.from) return false
    if (query.to !== undefined && day > query.to) return false
    return true
  })

  const start = (query.page - 1) * query.pageSize

  return {
    // Sorting a copy: the ledger itself stays in posting order.
    items: [...matching].sort(compare(query.sort)).slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: matching.length,
  }
}

function compare(sort: StatementSort): (a: WireTransaction, b: WireTransaction) => number {
  const ascending = sort.endsWith(':asc')
  const byAmount = sort.startsWith('amount')

  return (a, b) => {
    const difference = byAmount ? a.amount - b.amount : a.occurredAt.localeCompare(b.occurredAt)
    return ascending ? difference : -difference
  }
}
