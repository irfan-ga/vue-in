/** Every path this feature calls, in one place (rule 24). */
export const ENDPOINTS = {
  transfers: '/transfers',
  transfer: (transferId: string) => `/transfers/${encodeURIComponent(transferId)}`,
} as const
