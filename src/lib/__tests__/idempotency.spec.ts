import { describe, expect, it } from 'vitest'

import { createIdempotencyKey } from '@/lib/idempotency'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createIdempotencyKey', () => {
  it('produces a v4 UUID', () => {
    expect(createIdempotencyKey()).toMatch(UUID)
  })

  it('never repeats, so one intent cannot be mistaken for another', () => {
    const keys = new Set(Array.from({ length: 1000 }, createIdempotencyKey))

    expect(keys.size).toBe(1000)
  })
})
