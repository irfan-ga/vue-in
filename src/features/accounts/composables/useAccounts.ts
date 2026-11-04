import { useQuery } from '@pinia/colada'

import { fetchAccounts } from '../api/accounts'
import { accountsKey } from './keys'

/*
 * A balance a few seconds old is acceptable — the money has not moved since the
 * page loaded in all but a handful of cases, and the global default is 0 as a
 * fail-safe rather than an answer. Stating it is rule 2; the window is short
 * enough that a transfer completed in another tab shows up on return, which
 * `refetchOnWindowFocus` also covers.
 */
const STALE_TIME_MS = 15_000

export function useAccounts() {
  return useQuery({
    key: accountsKey,
    query: ({ signal }) => fetchAccounts({ signal }),
    staleTime: STALE_TIME_MS,
  })
}
