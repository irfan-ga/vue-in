import '@pinia/colada'

import type { HttpError } from '@/lib/http'

/**
 * Every query in this app fails the same way: `lib/http.ts` throws `HttpError`,
 * carrying the `failure` union a view branches on (rule 17). Declaring it once
 * makes `error.value.failure` typed in every query, instead of each view
 * narrowing an `Error` back into the thing it already was.
 */
declare module '@pinia/colada' {
  interface TypesConfig {
    defaultError: HttpError
  }
}
