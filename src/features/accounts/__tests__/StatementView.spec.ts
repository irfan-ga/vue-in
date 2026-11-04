import { describe, expect, it } from 'vitest'

import StatementView from '@/features/accounts/components/StatementView.vue'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'
import { requestLog } from '@/test/requests'
import { button, loaded, mountView, until } from '@/test/view'

/** The amount column, as numbers, in the order the table is showing them. */
function amounts(wrapper: {
  findAll: (selector: string) => { findAll: (s: string) => { text: () => string }[] }[]
}): number[] {
  return wrapper
    .findAll('tbody tr')
    .map((row) => Number((row.findAll('td')[2]?.text() ?? '').replace(/[^\d]/g, '')))
}

const SALARY = { accountId: 'acc_salary' }
const DORMANT = { accountId: 'acc_dormant' }

describe('StatementView', () => {
  it('shows a skeleton before the first page arrives', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)

    expect(wrapper.text()).toContain('Loading transactions')
  })

  it('renders a page of rows, headed by the account it belongs to', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    expect(wrapper.text()).toContain('Salary')
    expect(wrapper.text()).toContain('•••• 6789')
    expect(wrapper.findAll('tbody tr')).toHaveLength(20)
  })

  it('signs every amount, so colour is never the only cue', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    const rows = wrapper.findAll('tbody tr')
    const amounts = rows.map((row) => row.findAll('td')[2]?.text() ?? '')

    expect(amounts.every((amount) => /^(Credit|Debit)\s*[+−]₹/.test(amount))).toBe(true)
  })

  it('leaves the running balance blank on an entry that has not posted', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    const pending = wrapper.findAll('tbody tr').filter((row) => row.text().includes('Pending'))
    expect(pending.length).toBeGreaterThan(0)

    for (const row of pending) {
      expect(row.findAll('td')[3]?.text()).toBe('—')
    }
  })

  it('counts from the server total, not from the rows on screen', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    expect(wrapper.text()).toMatch(/Showing 1–20 of \d{3}/)
    expect(button(wrapper, 'Previous').attributes('disabled')).toBeDefined()
  })

  it('pages forward without losing the table while it loads', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    const firstRow = wrapper.find('tbody tr').text()

    await button(wrapper, 'Next').trigger('click')

    // Mid-flight the old page is still there, dimmed rather than gone.
    expect(wrapper.find('tbody tr').exists()).toBe(true)

    await until(() => wrapper.text().includes('Showing 21–40'))

    expect(wrapper.find('tbody tr').text()).not.toBe(firstRow)
    expect(button(wrapper, 'Previous').attributes('disabled')).toBeUndefined()
  })

  it('sorts on the server when a column is used, and says which way', async () => {
    const log = requestLog()
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    await button(wrapper, 'Amount').trigger('click')
    // Sorting is the server's job: the client asks, it does not reorder a page.
    await until(() => log.urls.some((url) => url.includes('sort=amount%3Adesc')))

    expect(wrapper.findAll('th')[2]?.attributes('aria-sort')).toBe('descending')

    await button(wrapper, 'Amount').trigger('click')
    await until(() => {
      const shown = amounts(wrapper)

      return (
        shown.length > 0 &&
        shown.every((value, index) => index === 0 || value >= (shown[index - 1] ?? 0))
      )
    })

    expect(wrapper.findAll('th')[2]?.attributes('aria-sort')).toBe('ascending')
    expect(amounts(wrapper)).toStrictEqual([...amounts(wrapper)].sort((a, b) => a - b))
  })

  it('narrows by date and explains an empty result differently', async () => {
    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    const today = new Date().toISOString().slice(0, 10)
    const fromInput = wrapper.find('#statement-from')
    await fromInput.setValue(today)
    await fromInput.trigger('change')

    await until(() => wrapper.text().includes('No transactions'))

    // The ledger ends yesterday, so today is empty — and says why.
    expect(wrapper.text()).toContain('No transactions in those dates')
    expect(wrapper.text()).toContain('clear the dates')
  })

  it('shows the empty state for an account that has never been used', async () => {
    const { wrapper } = await mountView(StatementView, DORMANT)
    await loaded(wrapper)

    expect(wrapper.text()).toContain('No transactions yet')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('announces a failed statement and recovers on retry', async () => {
    server.use(...scenarios['statement-retry'])

    const { wrapper } = await mountView(StatementView, SALARY)
    await loaded(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await button(wrapper, 'Try again').trigger('click')
    await until(() => !wrapper.find('[role="alert"]').exists())

    expect(wrapper.findAll('tbody tr')).toHaveLength(20)
  })
})
