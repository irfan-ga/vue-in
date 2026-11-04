import { describe, expect, it } from 'vitest'

import { accountListSchema } from '@/features/accounts/schemas/account'
import { config } from '@/lib/config'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'

/**
 * The failure paths, proven against the same scenarios `pnpm dev` can apply
 * from the URL. `src/test/setup.ts` resets handlers after each test, so a
 * scenario applied here cannot leak into the next one.
 */
describe('when the accounts list fails', () => {
  it('answers 503 with a message the UI can show', async () => {
    server.use(...scenarios['accounts-error'])

    const response = await fetch(`${config.apiBaseUrl}/accounts`)

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ message: expect.any(String) })
  })
})

describe('when the customer has no accounts', () => {
  it('answers 200 with an empty list, which is not an error', async () => {
    server.use(...scenarios['accounts-empty'])

    const response = await fetch(`${config.apiBaseUrl}/accounts`)
    const { accounts } = accountListSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(accounts).toStrictEqual([])
  })
})

describe('when the statement fails', () => {
  it('keeps failing while the scenario is applied', async () => {
    server.use(...scenarios['statement-error'])

    const first = await fetch(`${config.apiBaseUrl}/accounts/acc_salary/transactions`)
    const second = await fetch(`${config.apiBaseUrl}/accounts/acc_salary/transactions`)

    expect(first.status).toBe(503)
    expect(second.status).toBe(503)
  })

  it('succeeds on the second attempt under the retry scenario', async () => {
    // This is what makes a retry button provable rather than hopeful.
    server.use(...scenarios['statement-retry'])

    const first = await fetch(`${config.apiBaseUrl}/accounts/acc_salary/transactions`)
    const second = await fetch(`${config.apiBaseUrl}/accounts/acc_salary/transactions`)

    expect(first.status).toBe(500)
    expect(second.status).toBe(200)
  })
})
