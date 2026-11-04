import { getJson, type RequestContext } from '@/lib/http'

import { statementPageSchema, type StatementPage } from '../schemas/statement'
import { ENDPOINTS } from './endpoints'

/** The sorts the statement endpoint accepts; anything else is a 400. */
export const STATEMENT_SORTS = [
  'occurredAt:desc',
  'occurredAt:asc',
  'amount:desc',
  'amount:asc',
] as const

export type StatementSort = (typeof STATEMENT_SORTS)[number]

export const DEFAULT_PAGE_SIZE = 20

export type StatementParams = {
  accountId: string
  page: number
  pageSize: number
  sort: StatementSort
  /** Inclusive `YYYY-MM-DD` bounds. */
  from?: string
  to?: string
}

/**
 * One page of a statement, parsed. Pagination, sorting and filtering are the
 * server's job: the client asks for a page and renders what it gets, which is
 * the only version of this that works once a statement has ten thousand rows.
 */
export async function fetchStatement(
  params: StatementParams,
  context: RequestContext = {},
): Promise<StatementPage> {
  return getJson(ENDPOINTS.statement(params.accountId), statementPageSchema, {
    ...context,
    query: {
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
      from: params.from,
      to: params.to,
    },
  })
}
