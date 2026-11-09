import { z } from 'zod'

import { config } from './config'

/**
 * The transport. One place where a request becomes either parsed data or a
 * `HttpError` carrying a reason the UI can branch on.
 *
 * Everything a request can do wrong is one of the five `HttpFailure` kinds
 * (rule 17) — there is no `isError` plus `isTimeout` plus a message to
 * reconcile. The messages here are for developers; user-facing copy belongs to
 * the component, which is the only layer that knows what the user was doing.
 */
const DEFAULT_TIMEOUT_MS = 10_000

export type HttpFailure =
  /** The request never reached a server: offline, DNS, CORS. */
  | { readonly kind: 'network'; readonly cause: unknown }
  /** Took longer than the budget. Retrying is reasonable. */
  | { readonly kind: 'timeout'; readonly timeoutMs: number }
  /** Deliberately abandoned — an unmounted view, or a superseded query. */
  | { readonly kind: 'cancelled' }
  /** The server answered, and said no. */
  | { readonly kind: 'status'; readonly status: number; readonly message: string }
  /** The server answered with something the schema rejects: a broken contract. */
  | { readonly kind: 'malformed'; readonly detail: string }

export class HttpError extends Error {
  readonly failure: HttpFailure

  constructor(failure: HttpFailure) {
    super(describe(failure), failure.kind === 'network' ? { cause: failure.cause } : undefined)
    this.name = 'HttpError'
    this.failure = failure
  }
}

export type GetOptions = {
  /** `undefined` values are left out rather than sent as the string "undefined". */
  query?: Record<string, string | number | undefined>
  timeoutMs?: number
  /** Pinia Colada passes one; it aborts when a query is superseded or dropped. */
  signal?: AbortSignal
}

/** What a caller hands down from its own lifecycle — Colada supplies it. */
export type RequestContext = Pick<GetOptions, 'signal'>

export type PostOptions = GetOptions & {
  /**
   * Rule 4. The same key on every retry of one intent, so the bank can tell a
   * retry from a second transfer. A money-moving request without one is a
   * double debit waiting for a flaky connection.
   */
  idempotencyKey?: string
}

export async function getJson<Output>(
  path: string,
  schema: z.ZodType<Output>,
  options: GetOptions = {},
): Promise<Output> {
  return send('GET', path, schema, options)
}

export async function postJson<Output>(
  path: string,
  schema: z.ZodType<Output>,
  body: unknown,
  options: PostOptions = {},
): Promise<Output> {
  return send('POST', path, schema, options, body)
}

async function send<Output>(
  method: 'GET' | 'POST',
  path: string,
  schema: z.ZodType<Output>,
  options: PostOptions,
  body?: unknown,
): Promise<Output> {
  const response = await fetchOrThrow(method, path, options, body)

  if (!response.ok) {
    throw new HttpError({
      kind: 'status',
      status: response.status,
      message: await readMessage(response),
    })
  }

  return parseOrThrow(schema, await response.json().catch(() => MALFORMED))
}

/** Everything that can go wrong before a response exists. */
async function fetchOrThrow(
  method: 'GET' | 'POST',
  path: string,
  options: PostOptions,
  body: unknown,
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)

  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.idempotencyKey === undefined
          ? {}
          : { 'idempotency-key': options.idempotencyKey }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    })
  } catch (cause) {
    // Both of these arrive as the same AbortError, so the signals are the tell.
    if (options.signal?.aborted === true) throw new HttpError({ kind: 'cancelled' })
    if (timeout.aborted) throw new HttpError({ kind: 'timeout', timeoutMs })

    throw new HttpError({ kind: 'network', cause })
  }
}

/** Parse once, here, and trust the types below it (rule 18). */
function parseOrThrow<Output>(schema: z.ZodType<Output>, payload: unknown): Output {
  if (payload === MALFORMED) {
    throw new HttpError({ kind: 'malformed', detail: 'the response body was not JSON' })
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    throw new HttpError({ kind: 'malformed', detail: z.prettifyError(parsed.error) })
  }

  return parsed.data
}

/** A sentinel, so an unparseable body is distinguishable from a `null` one. */
const MALFORMED = Symbol('malformed')

const errorBodySchema = z.object({ message: z.string().min(1) })

function buildUrl(path: string, query: GetOptions['query']): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, String(value))
  }

  const queryString = search.toString()

  return `${config.apiBaseUrl}${path}${queryString === '' ? '' : `?${queryString}`}`
}

/** A failing response should still explain itself; not all of them manage it. */
async function readMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = errorBodySchema.safeParse(body)

  if (parsed.success) return parsed.data.message

  return response.statusText === '' ? `HTTP ${response.status}` : response.statusText
}

function describe(failure: HttpFailure): string {
  switch (failure.kind) {
    case 'network':
      return 'The request did not reach the server'
    case 'timeout':
      return `The request took longer than ${failure.timeoutMs}ms`
    case 'cancelled':
      return 'The request was cancelled'
    case 'status':
      return `The server answered ${failure.status}: ${failure.message}`
    case 'malformed':
      return `The server answered with data the app cannot read: ${failure.detail}`
  }
}
