import { z } from 'zod'

import { toPaise } from '@/lib/money'

/**
 * Money at the wire boundary.
 *
 * The server sends an integer number of paise, and this is where it becomes
 * `Paise`. Nothing below re-checks it (rule 18): a float, a string or a rounded
 * rupee amount fails here, loudly, instead of drifting through the app.
 *
 * Both of these belong in `lib/money.ts` the moment a second feature needs them.
 * That promotion happens in the change that needs it, not by importing accounts
 * from a sibling feature (rule 11).
 */
export const paiseSchema = z.number().int().transform(toPaise)

/** For amounts whose sign is carried elsewhere, or that cannot be negative. */
export const nonNegativePaiseSchema = z.number().int().nonnegative().transform(toPaise)
