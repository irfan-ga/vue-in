/// <reference types="vite/client" />

/**
 * Typed environment variables. Keep in sync with .env.example.
 *
 * Everything prefixed with VITE_ is inlined into the client bundle and is
 * therefore public. Never put a secret here.
 */
interface ImportMetaEnv {
  /** Base URL of the bank API. Ignored while VITE_ENABLE_MSW is 'true'. */
  readonly VITE_API_BASE_URL: string
  /** 'true' runs the MSW mock backend in the browser. */
  readonly VITE_ENABLE_MSW: string
  /** Surfaced in the UI to make clear this is not a real bank. */
  readonly VITE_APP_ENV: 'development' | 'test' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
