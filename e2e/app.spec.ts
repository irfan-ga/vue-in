import { expect, test } from '@playwright/test'

/**
 * The boot smoke test: not what the app shows, but that it starts at all.
 *
 * It deliberately asserts nothing about rendered copy. A test pinned to the
 * current screen gets deleted the next time that screen changes, which is how a
 * suite quietly stops being run (rule 27) — each feature brings its own screen
 * assertions, while this one stays true for all of them.
 *
 * An uncaught error here includes a failed bootstrap: `src/main.ts` re-throws
 * when MSW or the app fails to start, rather than leaving a blank page.
 */
test('boots without an uncaught error', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => {
    errors.push(error)
  })

  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  /*
   * The title pins which app answered. Vite's default port is shared with every
   * other Vite project, and this suite once passed against a different app
   * entirely on a reused dev server — `#app` exists everywhere.
   */
  await expect(page).toHaveTitle('Vue-In Bank')
  await expect(page.locator('#app')).toBeAttached()
  expect(errors).toEqual([])
})

/**
 * The mock backend is a service worker, so "is there an API" is a real question
 * in the browser and not just in Vitest. Polled because the worker registers
 * during the first load and the page is served before it controls the client.
 */
test('serves the mock bank through the service worker', async ({ page }) => {
  await page.goto('/')

  await expect
    .poll(async () => page.evaluate(async () => (await fetch('/api/accounts')).status))
    .toBe(200)
})
