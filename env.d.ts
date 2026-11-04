/// <reference types="vite/client" />

/*
 * @vue/tsconfig targets lib ES2022 and leaves newer built-ins to the project to
 * opt into, so that browser support is a deliberate choice. This one adds the
 * Intl NumberFormat V3 string input that lib/money.ts formats paise through —
 * Chrome 106, Safari 15.4 and Firefox 116, all 2022-23. Referenced here rather
 * than set in tsconfig.app.json, because `lib` replaces rather than extends and
 * restating the inherited list would silently drift from it.
 */
/// <reference lib="es2023.intl" />

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
