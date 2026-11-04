import { z } from 'zod'

/**
 * The only module that reads `import.meta.env` (rule 15).
 *
 * Every variable is validated once, here, at module load, so a missing or
 * malformed one fails the boot with a message that names it instead of
 * surfacing as `undefined` three screens later.
 *
 * Nothing here is secret, and nothing here can be: every VITE_ variable is
 * inlined into the client bundle and ships to the browser in plain text.
 */
const envSchema = z.object({
  VITE_ENABLE_MSW: z.enum(['true', 'false']),
  VITE_API_BASE_URL: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'test', 'production']),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`)
}

const enableMocking = parsed.data.VITE_ENABLE_MSW === 'true'

export const config = {
  /** Run the MSW mock backend instead of calling a real API — see ADR 0004. */
  enableMocking,

  /**
   * Same-origin while MSW is the backend: the service worker only intercepts
   * this origin, so an absolute URL would sail straight past it to a server
   * that does not exist.
   */
  apiBaseUrl: enableMocking ? '/api' : parsed.data.VITE_API_BASE_URL,

  /** Surfaced in the UI so that nobody mistakes this for a real bank. */
  appEnv: parsed.data.VITE_APP_ENV,
} as const
