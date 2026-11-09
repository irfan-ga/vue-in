import { describe, expect, it } from 'vitest'

import { fetchTransfer, startTransfer } from '@/features/transfer/api/transfers'
import {
  DAILY_TRANSFER_LIMIT,
  PER_TRANSFER_LIMIT,
  type TransferRequest,
} from '@/features/transfer/schemas/transfer'
import { createIdempotencyKey } from '@/lib/idempotency'
import { subtractPaise, sumPaise, toPaise } from '@/lib/money'
import { listAccounts } from '@/mocks/bank'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'
import { failureOf } from '@/test/http'

const SALARY = 'acc_salary'
const FROZEN = 'acc_business'

/** Ends in 9999: the mock bank's destination that always fails at the far end. */
const CLOSED_ACCOUNT = '000111229999'

function instruct(overrides: Partial<TransferRequest> = {}): TransferRequest {
  return {
    fromAccountId: SALARY,
    beneficiaryName: 'Priya Nair',
    beneficiaryAccountNumber: '000777888111',
    ifsc: 'HDFC0001234',
    amount: toPaise(250_000),
    ...overrides,
  }
}

function accountMoney(accountId: string): { balance: number; available: number } {
  const account = listAccounts().find((candidate) => candidate.id === accountId)

  if (!account) throw new Error(`no account ${accountId}`)

  return { balance: account.balance, available: account.available }
}

describe('starting a transfer', () => {
  it('is accepted as pending, and holds the money before it moves', async () => {
    const before = accountMoney(SALARY)
    const request = instruct()

    const transfer = await startTransfer(request, createIdempotencyKey())

    expect(transfer.status).toBe('pending')
    expect(transfer.amount).toBe(request.amount)

    const after = accountMoney(SALARY)
    // Held, not spent: available drops now, the balance only once it settles.
    expect(after.available).toBe(subtractPaise(toPaise(before.available), request.amount))
    expect(after.balance).toBe(before.balance)
  })

  it('refuses to move money without an idempotency key', async () => {
    // The key is the server's business too, not a client-side courtesy.
    const failure = await failureOf(startTransfer(instruct(), ''))

    expect(failure).toMatchObject({ kind: 'status', status: 400 })
  })
})

describe('the idempotency key', () => {
  it('replays the original transfer instead of sending a second one', async () => {
    const key = createIdempotencyKey()
    const before = accountMoney(SALARY)

    const first = await startTransfer(instruct(), key)
    const second = await startTransfer(instruct(), key)

    expect(second.id).toBe(first.id)

    const after = accountMoney(SALARY)
    // One hold, not two. This is the whole reason the key exists.
    expect(after.available).toBe(subtractPaise(toPaise(before.available), instruct().amount))
  })

  it('treats a different key as a different intent', async () => {
    const first = await startTransfer(instruct(), createIdempotencyKey())
    const second = await startTransfer(instruct(), createIdempotencyKey())

    expect(second.id).not.toBe(first.id)
  })

  it('finds the transfer the bank made when the response was lost', async () => {
    /*
     * The case the whole mechanism exists for: the bank accepted the transfer
     * and the client never heard. Retrying with the same key must find that
     * transfer rather than start a second one.
     */
    server.use(...scenarios['transfer-lost'])

    const key = createIdempotencyKey()
    const before = accountMoney(SALARY)

    const lost = await failureOf(startTransfer(instruct(), key))
    expect(lost.kind).toBe('network')

    const recovered = await startTransfer(instruct(), key)

    expect(recovered.status).toBe('pending')
    expect(accountMoney(SALARY).available).toBe(
      subtractPaise(toPaise(before.available), instruct().amount),
    )
  })
})

describe('what the bank refuses', () => {
  it('will not send from an account that is not active', async () => {
    const failure = await failureOf(
      startTransfer(instruct({ fromAccountId: FROZEN }), createIdempotencyKey()),
    )

    expect(failure).toMatchObject({ kind: 'status', status: 422 })
    expect(failure).toMatchObject({ message: expect.stringContaining('frozen') })
  })

  it('agrees with the client about the per-transfer limit, to the paise', async () => {
    const atTheLimit = await startTransfer(
      instruct({ amount: PER_TRANSFER_LIMIT }),
      createIdempotencyKey(),
    )
    expect(atTheLimit.status).toBe('pending')

    const overBy = toPaise(1)
    const failure = await failureOf(
      startTransfer(
        instruct({ amount: sumPaise(PER_TRANSFER_LIMIT, overBy) }),
        createIdempotencyKey(),
      ),
    )

    expect(failure).toMatchObject({ kind: 'status', status: 422 })
  })

  it('adds up the day and stops at the daily limit', async () => {
    // Two at the per-transfer ceiling, then one that only the day's total refuses.
    await startTransfer(instruct({ amount: PER_TRANSFER_LIMIT }), createIdempotencyKey())
    await startTransfer(instruct({ amount: PER_TRANSFER_LIMIT }), createIdempotencyKey())

    const sofar = sumPaise(PER_TRANSFER_LIMIT, PER_TRANSFER_LIMIT)
    const overTheDay = sumPaise(subtractPaise(DAILY_TRANSFER_LIMIT, sofar), toPaise(1))

    const failure = await failureOf(
      startTransfer(instruct({ amount: overTheDay }), createIdempotencyKey()),
    )

    expect(failure).toMatchObject({ kind: 'status', status: 422 })
    expect(failure).toMatchObject({ message: expect.stringContaining("today's limit") })
  })

  it('will not send money the account does not have', async () => {
    const available = toPaise(accountMoney(SALARY).available)

    const failure = await failureOf(
      startTransfer(instruct({ amount: sumPaise(available, toPaise(1)) }), createIdempotencyKey()),
    )

    expect(failure).toMatchObject({ kind: 'status', status: 422 })
  })
})

describe('settlement', () => {
  async function settled(transferId: string) {
    let transfer = await fetchTransfer(transferId)

    while (transfer.status === 'pending') {
      transfer = await fetchTransfer(transferId)
    }

    return transfer
  }

  it('stays pending until the bank has actually done it', async () => {
    const accepted = await startTransfer(instruct(), createIdempotencyKey())

    expect((await fetchTransfer(accepted.id)).status).toBe('pending')
  })

  it('posts the debit and lowers the balance once it succeeds', async () => {
    const before = accountMoney(SALARY)
    const request = instruct()
    const accepted = await startTransfer(request, createIdempotencyKey())

    const transfer = await settled(accepted.id)

    expect(transfer.status).toBe('succeeded')
    if (transfer.status !== 'succeeded') throw new Error('expected a settled transfer')
    expect(transfer.reference).toMatch(/^UTR/)

    const after = accountMoney(SALARY)
    // Both move by the amount: the hold becomes a real debit, it is not added
    // to one. (They are not equal to each other — this account has an older
    // pending entry of its own.)
    expect(after.balance).toBe(subtractPaise(toPaise(before.balance), request.amount))
    expect(after.available).toBe(subtractPaise(toPaise(before.available), request.amount))
  })

  it('gives the money back when the far bank refuses it', async () => {
    const before = accountMoney(SALARY)
    const accepted = await startTransfer(
      instruct({ beneficiaryAccountNumber: CLOSED_ACCOUNT }),
      createIdempotencyKey(),
    )

    const transfer = await settled(accepted.id)

    expect(transfer.status).toBe('failed')
    if (transfer.status !== 'failed') throw new Error('expected a failed transfer')
    expect(transfer.reason).toContain('closed')

    // Nothing moved, so the hold is released and the balance is untouched.
    expect(accountMoney(SALARY)).toStrictEqual(before)
  })

  it('404s on a transfer that was never made', async () => {
    const failure = await failureOf(fetchTransfer('txf_nope'))

    expect(failure).toMatchObject({ kind: 'status', status: 404 })
  })
})

describe('the statement the customer then reads', () => {
  it('holds the money while pending and releases the hold once it posts', async () => {
    const before = accountMoney(SALARY)
    const heldBefore = before.balance - before.available
    const request = instruct()

    const accepted = await startTransfer(request, createIdempotencyKey())

    const whilePending = accountMoney(SALARY)
    expect(whilePending.balance - whilePending.available).toBe(heldBefore + request.amount)

    let transfer = await fetchTransfer(accepted.id)
    while (transfer.status === 'pending') transfer = await fetchTransfer(accepted.id)

    /*
     * Once it posts, the hold is gone and the balance carries the debit
     * instead, so the gap is exactly what it was before this transfer existed.
     */
    const afterSettlement = accountMoney(SALARY)
    expect(afterSettlement.balance - afterSettlement.available).toBe(heldBefore)
  })
})
