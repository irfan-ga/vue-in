import { z } from 'zod'

import { nonNegativePaiseSchema, paiseSchema } from './paise'

const entrySchema = z.object({
  id: z.string().min(1),
  /** ISO 8601 on the wire, a `Date` everywhere below it (rule 18). */
  occurredAt: z.iso.datetime().transform((value) => new Date(value)),
  narration: z.string().min(1),
  /** The sign lives here and only here, so an amount cannot disagree with itself. */
  direction: z.enum(['credit', 'debit']),
  amount: nonNegativePaiseSchema,
})

/**
 * A statement row, as a union rather than a bag of optional fields (rule 17).
 *
 * `balanceAfter` only exists once an entry has posted — a pending debit has not
 * moved the balance yet, so there is no "balance after" to report. Modelling it
 * as nullable would leave every caller guessing; this way the compiler stops
 * anyone reading a running balance that cannot exist.
 */
export const transactionSchema = z.discriminatedUnion('status', [
  entrySchema.extend({
    status: z.literal('posted'),
    /** The server owns the running balance. The client never recomputes it. */
    balanceAfter: paiseSchema,
  }),
  entrySchema.extend({
    status: z.literal('pending'),
  }),
])

/**
 * One page of a statement. Pagination is server-side, so `total` is the bank's
 * count of matching rows and has nothing to do with `items.length`.
 */
export const statementPageSchema = z.object({
  items: z.array(transactionSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})

export type Transaction = z.infer<typeof transactionSchema>
export type StatementPage = z.infer<typeof statementPageSchema>
