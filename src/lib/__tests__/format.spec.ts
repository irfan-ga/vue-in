import { describe, expect, it } from 'vitest'

import { formatDay, maskAccountNumber, toBankDay } from '@/lib/format'

describe('formatDay', () => {
  it('reads as a date and not as a timestamp', () => {
    expect(formatDay(new Date('2026-10-31T08:15:00.000Z'))).toBe('31 Oct 2026')
  })

  it('uses the bank’s day, not the browser’s', () => {
    /*
     * 20:00 UTC is already the next morning in India. The bank's books say the
     * 1st, so the statement says the 1st — wherever the browser happens to be,
     * and whatever timezone CI runs in.
     */
    expect(formatDay(new Date('2026-10-31T20:00:00.000Z'))).toBe('01 Nov 2026')
    expect(formatDay(new Date('2026-12-31T19:00:00.000Z'))).toBe('01 Jan 2027')
  })
})

describe('toBankDay', () => {
  it('produces the shape the statement filter takes', () => {
    expect(toBankDay(new Date('2026-10-31T08:15:00.000Z'))).toBe('2026-10-31')
  })

  it('agrees with formatDay about which day it is', () => {
    // A filter that disagreed with the column would hide rows that are on screen.
    const crossing = new Date('2026-10-31T20:00:00.000Z')

    expect(toBankDay(crossing)).toBe('2026-11-01')
    expect(formatDay(crossing)).toBe('01 Nov 2026')
  })
})

describe('maskAccountNumber', () => {
  it('shows the last four digits only', () => {
    expect(maskAccountNumber('000123456789')).toBe('•••• 6789')
  })

  it('leaves something too short to mask alone', () => {
    expect(maskAccountNumber('6789')).toBe('6789')
  })
})
