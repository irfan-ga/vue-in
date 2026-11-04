import { describe, expect, it } from 'vitest'

import {
  formatPaise,
  negatePaise,
  parseRupees,
  subtractPaise,
  sumPaise,
  toPaise,
  type RupeeParseFailure,
} from '@/lib/money'

/** Unwraps a successful parse, so a test never has to narrow by hand. */
function parsedPaise(input: string): number {
  const result = parseRupees(input)
  if (!result.ok) {
    throw new Error(`expected "${input}" to parse, got failure "${result.failure}"`)
  }
  return result.paise
}

/** The mirror image: asserts the parse failed and hands back the reason. */
function parseFailure(input: string): RupeeParseFailure {
  const result = parseRupees(input)
  if (result.ok) {
    throw new Error(`expected "${input}" to be rejected, got ${result.paise} paise`)
  }
  return result.failure
}

describe('formatPaise', () => {
  /*
   * The first case is the whole point of the module: Indian digit grouping is
   * lakh/crore, and reverting to the default locale would produce the
   * plausible-looking `₹123,456.78` that nobody notices in review.
   */
  it.each([
    [12345678, '₹1,23,456.78'],
    [123456789012, '₹1,23,45,67,890.12'],
    [0, '₹0.00'],
    [5, '₹0.05'],
    [50, '₹0.50'],
    [100, '₹1.00'],
    [-50000, '-₹500.00'],
    [-5, '-₹0.05'],
  ])('formats %i paise as %s', (value, expected) => {
    expect(formatPaise(toPaise(value))).toBe(expected)
  })

  it('stays exact at the top of the safe integer range', () => {
    // Formatting via `value / 100` loses this last paise and renders `…409.90`.
    expect(formatPaise(toPaise(Number.MAX_SAFE_INTEGER))).toBe('₹9,00,71,99,25,47,409.91')
  })

  it('always shows two decimal places', () => {
    expect(formatPaise(toPaise(150))).toBe('₹1.50')
    expect(formatPaise(toPaise(1050))).toBe('₹10.50')
  })
})

describe('toPaise', () => {
  it('accepts an integer', () => {
    expect(toPaise(12345)).toBe(12345)
    expect(toPaise(-12345)).toBe(-12345)
    expect(toPaise(0)).toBe(0)
  })

  it.each([19.99, 0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects %p',
    (value) => {
      expect(() => toPaise(value)).toThrow(TypeError)
    },
  )
})

describe('sumPaise', () => {
  it('is exact where floats are not', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // the bug this module exists to prevent
    expect(sumPaise(toPaise(10), toPaise(20))).toBe(30)
  })

  it('totals a statement', () => {
    const debits = [199900, 45050, 1, 250000].map(toPaise)
    expect(sumPaise(...debits)).toBe(494951)
  })

  it('totals an empty statement to zero', () => {
    expect(sumPaise()).toBe(0)
  })

  it('refuses to produce an unsafe total', () => {
    const half = toPaise(Number.MAX_SAFE_INTEGER - 1)
    expect(() => sumPaise(half, half)).toThrow(TypeError)
  })
})

describe('subtractPaise', () => {
  it('subtracts', () => {
    expect(subtractPaise(toPaise(50000), toPaise(12345))).toBe(37655)
  })

  it('allows an overdrawn result', () => {
    // A negative balance is a real state; clamping it here would hide it.
    expect(subtractPaise(toPaise(100), toPaise(500))).toBe(-400)
  })
})

describe('negatePaise', () => {
  it('flips the sign', () => {
    expect(negatePaise(toPaise(500))).toBe(-500)
    expect(negatePaise(toPaise(-500))).toBe(500)
  })

  it('leaves zero alone, rather than producing negative zero', () => {
    // `-0` is not `0` to `Object.is`, which is what `toBe` compares with.
    expect(negatePaise(toPaise(0))).toBe(0)
  })
})

describe('parseRupees', () => {
  it.each([
    ['0', 0],
    ['5', 500],
    ['19.99', 1999],
    ['0.05', 5],
    ['0.5', 50],
    ['100.00', 10000],
    ['1,23,456.78', 12345678],
    ['₹1,23,456.78', 12345678],
    ['  2500  ', 250000],
    ['₹ 2,500.50', 250050],
    ['007', 700],
  ])('parses %s to %i paise', (input, expected) => {
    expect(parsedPaise(input)).toBe(expected)
  })

  it.each<[string, RupeeParseFailure]>([
    ['', 'empty'],
    ['   ', 'empty'],
    ['₹', 'empty'],
    ['-500', 'negative'],
    ['-₹500.00', 'negative'],
    ['100.005', 'too-many-decimals'],
    ['1.0000', 'too-many-decimals'],
    ['abc', 'malformed'],
    ['1.2.3', 'malformed'],
    ['12.', 'malformed'],
    ['.5', 'malformed'],
    ['1e5', 'malformed'],
    ['99999999999999999999', 'too-large'],
  ])('rejects %p as %s', (input, failure) => {
    expect(parseFailure(input)).toBe(failure)
  })

  it('does not round the paise away', () => {
    // Accepting `100.005` would mean silently moving a different amount of money
    // than the one on screen.
    expect(parseFailure('100.005')).toBe('too-many-decimals')
  })

  it('round-trips through the display edge', () => {
    expect(formatPaise(toPaise(parsedPaise('1,23,456.78')))).toBe('₹1,23,456.78')
  })
})
