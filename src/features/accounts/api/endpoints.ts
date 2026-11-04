/**
 * Every path this feature calls, in one place (rule 24). They are relative —
 * `lib/http.ts` adds the base URL, which is the only module that knows it.
 */
export const ENDPOINTS = {
  accounts: '/accounts',
  statement: (accountId: string) => `/accounts/${encodeURIComponent(accountId)}/transactions`,
} as const
