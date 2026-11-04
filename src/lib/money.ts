/**
 * Money.
 *
 * Every amount in this app is an integer number of paise — never a float, never
 * a string of rupees passed around "just for display". See rule 1 in CLAUDE.md
 * and docs/adr/0003-money-as-integer-paise.md.
 *
 * `Paise` is a branded number, so the compiler enforces what the rule asks for:
 * a plain `number` cannot be handed to `formatPaise`, and the only ways to mint
 * a `Paise` are `toPaise` (a checked integer) and `parseRupees` (user input).
 * Below that boundary the type is the proof, and nothing re-checks it (rule 18).
 *
 * There is deliberately no `rupeesToPaise(rupees: number)`. Accepting a rupee
 * float is how `19.99` becomes `1998.9999999999998`; rupees enter the system as
 * text, through `parseRupees`, and leave as text, through `formatPaise`.
 */

declare const paiseBrand: unique symbol

export type Paise = number & { readonly [paiseBrand]: true }

/** Why the parsed input was rejected. The message copy belongs to the caller. */
export type RupeeParseFailure =
  'empty' | 'negative' | 'malformed' | 'too-many-decimals' | 'too-large'

export type ParsedRupees =
  | { readonly ok: true; readonly paise: Paise }
  | { readonly ok: false; readonly failure: RupeeParseFailure }

const PAISE_DECIMALS = 2

/** Grouping is lakh/crore: `₹1,23,456.78`, not `₹123,456.78`. */
const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** What a user may type: digits, with at most two decimal places. */
const RUPEE_INPUT = /^\d+(?:\.\d{1,2})?$/
/** Same, but overshooting the paise — worth its own message. */
const RUPEE_INPUT_OVER_PRECISION = /^\d+\.\d{3,}$/
/** Noise a user pastes in from a statement or a bank SMS. */
const INPUT_NOISE = /[₹,\s]/g

/**
 * The one sanctioned way to turn a number into money. Throws on anything that
 * is not a safe integer — a float or a NaN here is a programmer error, not user
 * input, and it must not travel any further.
 */
export function toPaise(value: number): Paise {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Money must be a safe integer number of paise, received ${value}`)
  }
  // The cast is the brand's constructor; this is the only place it is allowed.
  return value as Paise
}

/** Totals a statement, a basket of charges, or just two amounts. */
export function sumPaise(...values: Paise[]): Paise {
  let total = 0
  for (const value of values) {
    total += value
  }
  return toPaise(total)
}

export function subtractPaise(minuend: Paise, subtrahend: Paise): Paise {
  return toPaise(minuend - subtrahend)
}

/**
 * The display edge: `12345678` → `₹1,23,456.78`.
 *
 * The decimal string is built from the integer digits and handed to `Intl` as a
 * string, not divided by 100 first. Division is lossy at the top of the safe
 * integer range — `9007199254740991 / 100` formats as `…409.90`, a paise short.
 */
export function formatPaise(value: Paise): string {
  return RUPEE_FORMATTER.format(toRupeeString(value))
}

/**
 * The input edge: `'1,23,456.78'` → `12345678` paise.
 *
 * Over-long decimals are rejected rather than rounded; silently turning
 * `100.005` into `₹100.01` is the kind of help nobody asked for. Zero parses
 * fine — minimums and transfer limits are the feature's business, not this
 * module's.
 */
export function parseRupees(input: string): ParsedRupees {
  const cleaned = input.replace(INPUT_NOISE, '')

  if (cleaned === '') {
    return { ok: false, failure: 'empty' }
  }
  if (cleaned.startsWith('-')) {
    return { ok: false, failure: 'negative' }
  }
  if (RUPEE_INPUT_OVER_PRECISION.test(cleaned)) {
    return { ok: false, failure: 'too-many-decimals' }
  }
  if (!RUPEE_INPUT.test(cleaned)) {
    return { ok: false, failure: 'malformed' }
  }

  const dot = cleaned.indexOf('.')
  const rupees = dot === -1 ? cleaned : cleaned.slice(0, dot)
  const fraction = dot === -1 ? '' : cleaned.slice(dot + 1)
  const total = Number(`${rupees}${fraction.padEnd(PAISE_DECIMALS, '0')}`)

  // Checked here rather than left to `toPaise`, which throws: an amount larger
  // than the safe range is something a user can type, so it needs a reason.
  if (!Number.isSafeInteger(total)) {
    return { ok: false, failure: 'too-large' }
  }

  return { ok: true, paise: toPaise(total) }
}

/**
 * `-5` → `'-0.05'`. Exact, because it never leaves integer arithmetic.
 *
 * The cast states what the digits already guarantee: TypeScript cannot see that
 * a template assembled from `String(Math.abs(...))` matches the `${number}`
 * literal type `Intl` asks for.
 */
function toRupeeString(value: Paise): Intl.StringNumericLiteral {
  const sign = value < 0 ? '-' : ''
  const digits = String(Math.abs(value)).padStart(PAISE_DECIMALS + 1, '0')
  const rupees = `${sign}${digits.slice(0, -PAISE_DECIMALS)}.${digits.slice(-PAISE_DECIMALS)}`
  return rupees as Intl.StringNumericLiteral
}
