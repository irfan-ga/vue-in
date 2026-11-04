import { useQuery } from '@pinia/colada'
import { toValue, type MaybeRefOrGetter } from 'vue'

import { fetchStatement, type StatementParams } from '../api/statement'
import { statementKey } from './keys'

/*
 * Posted rows never change, so a statement page could be cached for a long
 * time. The newest page cannot: it carries the pending entries whose status is
 * the one thing in a statement that moves (rule 2).
 *
 * `staleTime` is a plain number, not a getter, and each page is its own cache
 * entry created from this one options object — so it cannot vary per page. The
 * value is therefore short enough that a pending entry cannot sit wrong for
 * long. Phase 2 polls a transaction's status with its own `staleTime: 0` query
 * rather than making the statement do that job; see docs/ARCHITECTURE.md.
 */
const STALE_TIME_MS = 30_000

export function useStatement(params: MaybeRefOrGetter<StatementParams>) {
  return useQuery({
    key: () => statementKey(toValue(params)),
    query: ({ signal }) => fetchStatement(toValue(params), { signal }),
    staleTime: STALE_TIME_MS,

    /*
     * Keeps the page already on screen while the next one loads, so paging does
     * not flash a skeleton over a table someone is reading. `status` stays
     * 'success' throughout, which means the loading signal is `asyncStatus` and
     * `isPlaceholderData` is how a view knows to dim what it is showing.
     */
    placeholderData: (previous) => previous,
  })
}
