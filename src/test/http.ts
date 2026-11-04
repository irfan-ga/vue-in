import { HttpError, type HttpFailure } from '@/lib/http'

/**
 * Unwraps the failure from a request that was meant to fail, so a test can
 * assert on the reason rather than on a message string.
 */
export async function failureOf(promise: Promise<unknown>): Promise<HttpFailure> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.failure

    throw error
  }

  throw new Error('expected the request to fail, but it resolved')
}
