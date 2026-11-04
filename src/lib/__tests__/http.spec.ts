import { HttpResponse, delay, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { HttpError, getJson } from '@/lib/http'
import { server } from '@/mocks/node'
import { failureOf } from '@/test/http'

/**
 * Transport tests. These use handlers of their own rather than the bank's: the
 * subject is what happens to a request, not what the bank holds, and a fake
 * endpoint can misbehave in ways a real one should never be taught to.
 */
const PATH = '/probe'
const URL_PATH = `/api${PATH}`

const probeSchema = z.object({ balance: z.number().int() })

describe('getJson', () => {
  it('returns parsed data on a good response', async () => {
    server.use(http.get(URL_PATH, () => HttpResponse.json({ balance: 12345, extra: 'ignored' })))

    await expect(getJson(PATH, probeSchema)).resolves.toStrictEqual({ balance: 12345 })
  })

  it('leaves undefined query parameters out instead of sending the word', async () => {
    const seen: string[] = []
    server.use(
      http.get(URL_PATH, ({ request }) => {
        seen.push(new globalThis.URL(request.url).search)

        return HttpResponse.json({ balance: 0 })
      }),
    )

    await getJson(PATH, probeSchema, { query: { page: 2, from: undefined, sort: 'amount:asc' } })

    expect(seen).toStrictEqual(['?page=2&sort=amount%3Aasc'])
  })

  it('reports the server’s own message on a failing status', async () => {
    server.use(
      http.get(URL_PATH, () => HttpResponse.json({ message: 'Account frozen' }, { status: 409 })),
    )

    await expect(failureOf(getJson(PATH, probeSchema))).resolves.toStrictEqual({
      kind: 'status',
      status: 409,
      message: 'Account frozen',
    })
  })

  it('falls back to the status text when the error body explains nothing', async () => {
    server.use(http.get(URL_PATH, () => new HttpResponse('<html>oops</html>', { status: 502 })))

    const failure = await failureOf(getJson(PATH, probeSchema))

    expect(failure).toMatchObject({ kind: 'status', status: 502 })
  })

  it('treats a response the schema rejects as a broken contract, not as data', async () => {
    // The server said 200 and sent a float where paise were promised.
    server.use(http.get(URL_PATH, () => HttpResponse.json({ balance: 123.45 })))

    const failure = await failureOf(getJson(PATH, probeSchema))

    expect(failure.kind).toBe('malformed')
    expect(failure).toMatchObject({ detail: expect.stringContaining('balance') })
  })

  it('treats a body that is not JSON as malformed', async () => {
    server.use(http.get(URL_PATH, () => new HttpResponse('not json', { status: 200 })))

    await expect(failureOf(getJson(PATH, probeSchema))).resolves.toStrictEqual({
      kind: 'malformed',
      detail: 'the response body was not JSON',
    })
  })

  it('distinguishes a request that never arrived', async () => {
    server.use(http.get(URL_PATH, () => HttpResponse.error()))

    const failure = await failureOf(getJson(PATH, probeSchema))

    expect(failure.kind).toBe('network')
  })

  it('gives up on its own budget rather than hanging', async () => {
    server.use(
      http.get(URL_PATH, async () => {
        await delay(500)

        return HttpResponse.json({ balance: 1 })
      }),
    )

    await expect(failureOf(getJson(PATH, probeSchema, { timeoutMs: 20 }))).resolves.toStrictEqual({
      kind: 'timeout',
      timeoutMs: 20,
    })
  })

  it('separates a cancelled request from a failed one', async () => {
    // An unmounted view or a superseded query must not look like an outage.
    server.use(
      http.get(URL_PATH, async () => {
        await delay(500)

        return HttpResponse.json({ balance: 1 })
      }),
    )

    const controller = new AbortController()
    const pending = getJson(PATH, probeSchema, { signal: controller.signal })
    controller.abort()

    await expect(failureOf(pending)).resolves.toStrictEqual({ kind: 'cancelled' })
  })

  it('throws HttpError and nothing else, with a message that says what happened', async () => {
    server.use(http.get(URL_PATH, () => HttpResponse.json({ message: 'Nope' }, { status: 503 })))

    await expect(getJson(PATH, probeSchema)).rejects.toBeInstanceOf(HttpError)
    await expect(getJson(PATH, probeSchema)).rejects.toThrow('The server answered 503: Nope')
  })
})
