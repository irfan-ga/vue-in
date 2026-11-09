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

import { toBankDay } from '@/lib/format'
import { formatPaise, toPaise } from '@/lib/money'

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
const SMALL_CREDIT_EVERY = 11
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

const SALARY_NARRATION = 'SALARY CREDIT/ACME TECH'

/* Credits that are not payday, and are nothing like payday in size. */
const SMALL_CREDIT_NARRATIONS = ['UPI/9900112233/Refund', 'INTEREST CREDIT'] as const

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
    const salary = index % SALARY_EVERY === 0
    const credit = salary || index % SMALL_CREDIT_EVERY === 0
    const amount = salary
      ? SALARY_AMOUNT
      : Math.round((MIN_DEBIT + random() * (MAX_DEBIT - MIN_DEBIT)) / PAISE_PER_RUPEE) *
        PAISE_PER_RUPEE

    const entry = {
      id: `txn_${options.id}_${String(index).padStart(3, '0')}`,
      occurredAt: new Date(at).toISOString(),
      narration: salary
        ? SALARY_NARRATION
        : pick(credit ? SMALL_CREDIT_NARRATIONS : DEBIT_NARRATIONS, random),
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

/** No entries at all for `acc_dormant`: that is the statement's empty state. */
const LEDGER_SEEDS: Array<{ accountId: string; seed: LedgerSeed }> = [
  {
    accountId: 'acc_salary',
    seed: { id: 'salary', seed: 11, entries: 137, openingBalance: rupees(200_000), pending: 2 },
  },
  {
    accountId: 'acc_household',
    seed: {
      id: 'household',
      seed: 23,
      entries: 9,
      openingBalance: rupees(18_500) + 47,
      pending: 1,
    },
  },
  {
    accountId: 'acc_business',
    seed: { id: 'business', seed: 37, entries: 24, openingBalance: rupees(420_000), pending: 0 },
  },
  {
    accountId: 'acc_dormant',
    seed: { id: 'dormant', seed: 41, entries: 0, openingBalance: rupees(1_250) + 60, pending: 0 },
  },
]

function buildLedgers(): Map<string, Ledger> {
  return new Map(LEDGER_SEEDS.map(({ accountId, seed }) => [accountId, generateLedger(seed)]))
}

/*
 * Account metadata is fixed; the money is not. Balances are read from the
 * ledger every time, so a transfer that posts shows up in the account list and
 * in the statement without anything having to be kept in step by hand.
 */
type AccountMeta = Omit<WireAccount, 'balance' | 'available'>

const ACCOUNT_META: AccountMeta[] = [
  {
    id: 'acc_salary',
    number: '000123456789',
    label: 'Salary',
    type: 'savings',
    currency: 'INR',
    status: 'active',
  },
  {
    id: 'acc_household',
    number: '000987654321',
    label: 'Household',
    type: 'savings',
    currency: 'INR',
    status: 'active',
  },
  {
    id: 'acc_business',
    number: '000555000111',
    label: 'Business current',
    type: 'current',
    currency: 'INR',
    status: 'frozen',
  },
  {
    id: 'acc_dormant',
    number: '000222333444',
    label: 'Old savings',
    type: 'savings',
    currency: 'INR',
    status: 'dormant',
  },
]

let ledgers = buildLedgers()

export function listAccounts(): WireAccount[] {
  return ACCOUNT_META.map((meta) => {
    const ledger = ledgers.get(meta.id)

    return { ...meta, balance: ledger?.balance ?? 0, available: ledger?.available ?? 0 }
  })
}

export function findAccount(accountId: string): WireAccount | undefined {
  return listAccounts().find((account) => account.id === accountId)
}

/** `undefined` means no such account — the endpoint turns that into a 404. */
export function queryStatement(
  accountId: string,
  query: StatementQuery,
): StatementPagePayload | undefined {
  const ledger = ledgers.get(accountId)
  if (!ledger) return undefined

  const matching = ledger.transactions.filter((entry) => {
    // The bank's calendar day, not UTC's — the same one the statement shows.
    const day = toBankDay(new Date(entry.occurredAt))
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

/* ------------------------------------------------------------------------ *
 * Transfers
 *
 * The part of the mock that has to behave like a bank rather than like a
 * fixture: an idempotency key that really deduplicates, money held before it
 * moves, and a settlement that can still fail after the request succeeded.
 * ------------------------------------------------------------------------ */

type WireTransferBase = {
  id: string
  fromAccountId: string
  beneficiaryName: string
  beneficiaryAccountNumber: string
  ifsc: string
  amount: number
  remarks?: string
  createdAt: string
}

export type WireTransfer =
  | (WireTransferBase & { status: 'pending' })
  | (WireTransferBase & { status: 'succeeded'; settledAt: string; reference: string })
  | (WireTransferBase & { status: 'failed'; settledAt: string; reason: string })

export type TransferInstruction = Omit<WireTransferBase, 'id' | 'createdAt'>

export type TransferOutcome =
  | { ok: true; transfer: WireTransfer; replayed: boolean }
  | { ok: false; status: number; message: string }

/** The bank's own limits. The client knows them too, and a test holds them to it. */
export const PER_TRANSFER_LIMIT = rupees(200_000)
export const DAILY_TRANSFER_LIMIT = rupees(500_000)

/*
 * Settlement happens on the second read rather than after a timer: the pending
 * state is then observable in the browser and in a test, without either waiting
 * on a clock.
 */
const READS_BEFORE_SETTLEMENT = 2

/** A destination that always fails at the far end — after being accepted. */
const CLOSED_ACCOUNT_SUFFIX = '9999'

const transfers = new Map<string, WireTransfer>()
const transferIdsByKey = new Map<string, string>()
const reads = new Map<string, number>()

/** Puts the bank back as it was found. Called between tests by src/test/setup.ts. */
export function resetBank(): void {
  ledgers = buildLedgers()
  transfers.clear()
  transferIdsByKey.clear()
  reads.clear()
}

export function createTransfer(
  idempotencyKey: string,
  instruction: TransferInstruction,
): TransferOutcome {
  const replayed = transferIdsByKey.get(idempotencyKey)

  if (replayed !== undefined) {
    const original = transfers.get(replayed)

    /*
     * Rule 4 from the other side. The same key means the same intent, so the
     * bank answers with what it already did instead of moving the money twice,
     * however many times the client retries.
     */
    return original === undefined
      ? { ok: false, status: 500, message: 'Lost the original transfer' }
      : { ok: true, transfer: original, replayed: true }
  }

  const refusal = refuse(instruction)
  if (refusal) return refusal

  const ledger = ledgers.get(instruction.fromAccountId)
  if (!ledger) return { ok: false, status: 404, message: 'No such account' }

  const id = `txf_${transfers.size + 1}`
  const createdAt = new Date().toISOString()
  const transfer: WireTransfer = { ...instruction, id, createdAt, status: 'pending' }

  transfers.set(id, transfer)
  transferIdsByKey.set(idempotencyKey, id)

  /*
   * The money is held the moment the bank accepts: it leaves `available` before
   * it leaves the balance, and a pending debit shows on the statement at once.
   */
  ledger.available -= instruction.amount
  ledger.transactions.push({
    id: entryIdFor(id),
    occurredAt: createdAt,
    narration: `NEFT/${instruction.ifsc}/${instruction.beneficiaryName}`,
    direction: 'debit',
    amount: instruction.amount,
    status: 'pending',
  })

  return { ok: true, transfer, replayed: false }
}

/** Reading a pending transfer is what advances it; see READS_BEFORE_SETTLEMENT. */
export function findTransfer(transferId: string): WireTransfer | undefined {
  const transfer = transfers.get(transferId)
  if (!transfer || transfer.status !== 'pending') return transfer

  const seen = (reads.get(transferId) ?? 0) + 1
  reads.set(transferId, seen)

  return seen < READS_BEFORE_SETTLEMENT ? transfer : settle(transfer)
}

function refuse(instruction: TransferInstruction): TransferOutcome | undefined {
  const account = findAccount(instruction.fromAccountId)

  if (!account) {
    return { ok: false, status: 404, message: `No account ${instruction.fromAccountId}` }
  }
  if (account.status !== 'active') {
    return {
      ok: false,
      status: 422,
      message: `This account is ${account.status} and cannot send money`,
    }
  }
  if (instruction.amount > PER_TRANSFER_LIMIT) {
    return {
      ok: false,
      status: 422,
      message: `A single transfer cannot be more than ${formatPaise(toPaise(PER_TRANSFER_LIMIT))}`,
    }
  }
  if (spentToday(instruction.fromAccountId) + instruction.amount > DAILY_TRANSFER_LIMIT) {
    return {
      ok: false,
      status: 422,
      message: `That would go over today's limit of ${formatPaise(toPaise(DAILY_TRANSFER_LIMIT))}`,
    }
  }
  if (instruction.amount > account.available) {
    return {
      ok: false,
      status: 422,
      message: `Only ${formatPaise(toPaise(account.available))} is available on this account`,
    }
  }

  return undefined
}

function settle(transfer: WireTransfer & { status: 'pending' }): WireTransfer {
  const ledger = ledgers.get(transfer.fromAccountId)
  const settledAt = new Date().toISOString()

  if (transfer.beneficiaryAccountNumber.endsWith(CLOSED_ACCOUNT_SUFFIX)) {
    /*
     * The far bank refused it. The hold is released and the entry comes back
     * off the statement, because in the end no money moved — a real bank would
     * post a reversal instead, which is a Phase 4 concern.
     */
    if (ledger) {
      ledger.available += transfer.amount
      ledger.transactions = ledger.transactions.filter(
        (entry) => entry.id !== entryIdFor(transfer.id),
      )
    }

    const failed: WireTransfer = {
      ...transfer,
      status: 'failed',
      settledAt,
      reason: 'The destination account is closed',
    }
    transfers.set(transfer.id, failed)

    return failed
  }

  const entry = ledger?.transactions.find((candidate) => candidate.id === entryIdFor(transfer.id))

  if (ledger && entry) {
    ledger.balance -= transfer.amount
    entry.status = 'posted'
    entry.balanceAfter = ledger.balance
  }

  const succeeded: WireTransfer = {
    ...transfer,
    status: 'succeeded',
    settledAt,
    reference: `UTR${transfer.id.replace('txf_', '').padStart(12, '0')}`,
  }
  transfers.set(transfer.id, succeeded)

  return succeeded
}

function spentToday(accountId: string): number {
  const today = toBankDay(new Date())
  let total = 0

  for (const transfer of transfers.values()) {
    const sameDay = toBankDay(new Date(transfer.createdAt)) === today

    if (transfer.fromAccountId === accountId && transfer.status !== 'failed' && sameDay) {
      total += transfer.amount
    }
  }

  return total
}

function entryIdFor(transferId: string): string {
  return `txn_${transferId}`
}
