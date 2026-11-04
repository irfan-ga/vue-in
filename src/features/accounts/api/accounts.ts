import { getJson, type RequestContext } from '@/lib/http'

import { accountListSchema, type Account } from '../schemas/account'
import { ENDPOINTS } from './endpoints'

/**
 * The customer's accounts, parsed. Throws `HttpError` on any failure (rule 7) —
 * callers branch on `error.failure.kind`, never on a status code they dug out
 * themselves.
 *
 * The `{ accounts: [...] }` envelope stops here: it is a transport detail, and
 * nothing above this line should have to know the server wraps its lists.
 */
export async function fetchAccounts(context: RequestContext = {}): Promise<Account[]> {
  const { accounts } = await getJson(ENDPOINTS.accounts, accountListSchema, context)

  return accounts
}
