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
  await expect(page.locator('#app')).toBeAttached()
  expect(errors).toEqual([])
})
