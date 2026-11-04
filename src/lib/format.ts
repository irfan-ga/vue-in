/**
 * Display formatting that is not money. `money.ts` owns currency.
 *
 * Dates are formatted in the **bank's** timezone, never the browser's. A
 * customer in London must see the same statement dates the bank has on its
 * books: a transaction at 20:00 UTC on the 31st belongs to the 1st in India,
 * and a statement that disagrees with the bank about which day something
 * happened is a support call at best.
 */
export const BANK_TIME_ZONE = 'Asia/Kolkata'

/** How much of an account number is shown; the rest is masked. */
const VISIBLE_DIGITS = 4

const DAY_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: BANK_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/*
 * en-CA renders `YYYY-MM-DD`, which is the shape the statement endpoint's
 * `from` and `to` parameters take. Going through Intl rather than arithmetic on
 * a UTC offset keeps this correct if the bank's zone ever gains a rule.
 */
const ISO_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: BANK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `31 Oct 2026`, for a statement row. */
export function formatDay(value: Date): string {
  return DAY_FORMATTER.format(value)
}

/** `2026-10-31` — the bank's calendar day, for filters and comparisons. */
export function toBankDay(value: Date): string {
  return ISO_DAY_FORMATTER.format(value)
}

/** `•••• 6789`. The full number is never rendered. */
export function maskAccountNumber(value: string): string {
  if (value.length <= VISIBLE_DIGITS) return value

  return `•••• ${value.slice(-VISIBLE_DIGITS)}`
}
