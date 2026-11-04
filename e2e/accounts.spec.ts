import { expect, test } from '@playwright/test'

/**
 * The Phase 1 journey, end to end: the list, a statement, and a failure the
 * customer can recover from. The failure arrives through the same named MSW
 * scenario a developer can apply from the URL (see src/mocks/scenarios.ts), so
 * what this test exercises is what `pnpm dev` shows.
 */
test('opens an account and reads its statement', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Your accounts' })).toBeVisible()
  await expect(page.getByText('Salary')).toBeVisible()
  // Indian grouping, at the display edge, in a real browser.
  await expect(page.getByText(/₹\d{1,2},\d{2},\d{3}\.\d{2}/).first()).toBeVisible()

  await page.getByText('Salary').click()

  await expect(page).toHaveURL(/\/accounts\/acc_salary$/)
  await expect(page.locator('tbody tr')).toHaveCount(20)
  await expect(page.getByText(/Showing 1–20 of \d+/)).toBeVisible()
})

test('pages forward and back through a statement', async ({ page }) => {
  await page.goto('/accounts/acc_salary')
  await expect(page.locator('tbody tr').first()).toBeVisible()

  const dateCell = (row: 'first' | 'last') =>
    page.locator('tbody tr')[row]().locator('td').first().innerText()

  const oldestOnPageOne = await dateCell('last')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText(/Showing 21–40/)).toBeVisible()

  /*
   * Page two continues where page one stopped rather than restarting: with the
   * default newest-first sort, its top row cannot be newer than the bottom row
   * of the page before it. A server that ignored `page` would fail this.
   */
  const newestOnPageTwo = await dateCell('first')
  expect(Date.parse(newestOnPageTwo)).toBeLessThanOrEqual(Date.parse(oldestOnPageOne))

  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page.getByText(/Showing 1–20/)).toBeVisible()
})

test('says nothing is there when an account has no transactions', async ({ page }) => {
  await page.goto('/accounts/acc_dormant')

  await expect(page.getByText('No transactions yet')).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)
})

test('recovers from a failing bank when the customer retries', async ({ page }) => {
  await page.goto('/?scenario=accounts-retry')

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()

  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(alert).toHaveCount(0)
  await expect(page.getByText('Salary')).toBeVisible()
})
