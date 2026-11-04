import type { StatementParams } from '../api/statement'

/**
 * Query keys, in one place (rule 24).
 *
 * A key is the identity of a cache entry. If a parameter changes the response
 * but not the key, Colada hands back the wrong page and no request goes out —
 * a bug that looks like a caching feature.
 *
 * `statementKey` therefore carries the whole params object instead of a
 * hand-written list of its fields, so a filter cannot be added to the request
 * and forgotten here. Colada hashes key segments with `JSON.stringify` over
 * sorted object keys, so this is stable whatever order the properties are in.
 * The account id is also its own segment, which leaves room to invalidate every
 * statement of one account by key prefix later.
 */
export const accountsKey = ['accounts'] as const

export function statementKey(params: StatementParams) {
  return ['accounts', params.accountId, 'statement', { ...params }] as const
}
