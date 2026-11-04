import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `config` is evaluated once, at import, so each case needs a fresh module
 * registry. `vi.stubEnv` writes to `import.meta.env` before that evaluation.
 */
async function loadConfig() {
  vi.resetModules()
  const { config } = await import('@/lib/config')
  return config
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('config', () => {
  it('keeps API requests same-origin while MSW is the backend', async () => {
    vi.stubEnv('VITE_ENABLE_MSW', 'true')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1')

    const config = await loadConfig()

    // An absolute URL here would bypass the service worker entirely.
    expect(config.enableMocking).toBe(true)
    expect(config.apiBaseUrl).toBe('/api')
  })

  it('uses the configured base URL once mocking is off', async () => {
    vi.stubEnv('VITE_ENABLE_MSW', 'false')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1')

    const config = await loadConfig()

    expect(config.enableMocking).toBe(false)
    expect(config.apiBaseUrl).toBe('https://api.example.test/v1')
  })

  it('fails the boot, naming the variable, rather than booting half-configured', async () => {
    vi.stubEnv('VITE_APP_ENV', 'staging')

    await expect(loadConfig()).rejects.toThrow(/VITE_APP_ENV/)
  })

  it('rejects a mocking flag that is not a boolean string', async () => {
    vi.stubEnv('VITE_ENABLE_MSW', '1')

    await expect(loadConfig()).rejects.toThrow(/VITE_ENABLE_MSW/)
  })
})
