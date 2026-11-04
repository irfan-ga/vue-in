import { describe, expect, it } from 'vitest'

import AccountsView from '@/features/accounts/components/AccountsView.vue'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'
import { button, loaded, mountView, until } from '@/test/view'

describe('AccountsView', () => {
  it('shows a skeleton before anything has arrived', async () => {
    const { wrapper } = await mountView(AccountsView)

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading your accounts')
  })

  it('renders every account with a masked number and Indian currency', async () => {
    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    const cards = wrapper.findAll('li')
    expect(cards).toHaveLength(4)

    const salary = wrapper.text()
    expect(salary).toContain('Salary')
    expect(salary).toContain('•••• 6789')
    expect(salary).toMatch(/₹[\d,]+\.\d{2}/)
    // Grouping is lakh/crore, so a seven-figure balance has a 2-digit group.
    expect(salary).toMatch(/₹\d{1,2},\d{2},\d{3}\.\d{2}/)
  })

  it('badges only the accounts whose state limits what you can do', async () => {
    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    expect(wrapper.text()).toContain('Frozen')
    expect(wrapper.text()).toContain('Dormant')
    expect(wrapper.text()).not.toContain('Active')
  })

  it('links each account to its own statement', async () => {
    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    const targets = wrapper.findAll('a').map((link) => link.attributes('href'))

    expect(targets).toContain('/accounts/acc_salary')
    expect(targets).toContain('/accounts/acc_dormant')
  })

  it('says so plainly when there are no accounts', async () => {
    server.use(...scenarios['accounts-empty'])

    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    expect(wrapper.text()).toContain('No accounts yet')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('announces a failure and shows what the bank said', async () => {
    server.use(...scenarios['accounts-error'])

    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    // Announced, not just coloured red.
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('The bank could not complete that')
    expect(wrapper.text()).toContain('The bank is not responding')
  })

  it('recovers when the retry button is pressed', async () => {
    server.use(...scenarios['accounts-retry'])

    const { wrapper } = await mountView(AccountsView)
    await loaded(wrapper)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    await button(wrapper, 'Try again').trigger('click')
    await until(() => !wrapper.find('[role="alert"]').exists())

    expect(wrapper.findAll('li')).toHaveLength(4)
  })
})
