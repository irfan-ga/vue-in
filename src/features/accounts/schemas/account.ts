import { z } from 'zod'

import { paiseSchema } from './paise'

/**
 * An account as the bank reports it.
 *
 * Unknown keys are stripped rather than rejected: a server that adds a field
 * should not break a deployed client. Missing or wrongly typed keys still fail,
 * which is the half that matters.
 */
export const accountSchema = z.object({
  id: z.string().min(1),
  /** Full number on the wire; masked at the display edge, never truncated here. */
  number: z.string().regex(/^\d{9,18}$/),
  /** What the customer called it — "Salary", "Household". */
  label: z.string().min(1),
  type: z.enum(['savings', 'current']),
  /** Single-currency by design; see ADR 0003. */
  currency: z.literal('INR'),
  /** The ledger balance: everything that has posted. */
  balance: paiseSchema,
  /** What can actually be spent — holds and uncleared credits removed. */
  available: paiseSchema,
  /** A dormant or frozen account can be read but not transferred from. */
  status: z.enum(['active', 'dormant', 'frozen']),
})

export const accountListSchema = z.object({
  accounts: z.array(accountSchema),
})

export type Account = z.infer<typeof accountSchema>
