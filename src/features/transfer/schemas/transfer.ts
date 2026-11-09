import { z } from 'zod'

import { positivePaiseSchema, toPaise, type Paise } from '@/lib/money'

/** `HDFC0001234`: four letters for the bank, a zero, then the branch code. */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/

export const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/

/*
 * The bank's limits, mirrored here so the form can refuse before the customer
 * waits for a round trip. The server enforces them regardless — these are a
 * courtesy, not the control — and a contract test holds the two to the same
 * number (rule 24).
 */
export const PER_TRANSFER_LIMIT = toPaise(20_000_000) // ₹2,00,000
export const DAILY_TRANSFER_LIMIT = toPaise(50_000_000) // ₹5,00,000

/**
 * What the customer is asking the bank to do.
 *
 * Hand-written rather than inferred, because this is not server data: it is
 * built from a validated form and sent. `amount` is already `Paise`, so there
 * is no conversion at the edge to get wrong.
 */
export type TransferRequest = {
  fromAccountId: string
  beneficiaryName: string
  beneficiaryAccountNumber: string
  ifsc: string
  amount: Paise
  remarks?: string
}

const settledAt = z.iso.datetime().transform((value) => new Date(value))

const transferBase = z.object({
  id: z.string().min(1),
  fromAccountId: z.string().min(1),
  beneficiaryName: z.string().min(1),
  beneficiaryAccountNumber: z.string().regex(ACCOUNT_NUMBER_PATTERN),
  ifsc: z.string().regex(IFSC_PATTERN),
  amount: positivePaiseSchema,
  remarks: z.string().optional(),
  createdAt: z.iso.datetime().transform((value) => new Date(value)),
})

/**
 * A transfer, as the bank reports it — a union, because the three states carry
 * different facts (rule 17). A pending transfer has no reference to quote and
 * no reason to show; demanding that a caller check a status before reading
 * either is the type's job, not the reviewer's.
 */
export const transferSchema = z.discriminatedUnion('status', [
  transferBase.extend({ status: z.literal('pending') }),
  transferBase.extend({
    status: z.literal('succeeded'),
    settledAt,
    /** The UTR a customer quotes when something has to be traced. */
    reference: z.string().min(1),
  }),
  transferBase.extend({
    status: z.literal('failed'),
    settledAt,
    reason: z.string().min(1),
  }),
])

export type Transfer = z.infer<typeof transferSchema>
export type TransferStatus = Transfer['status']
