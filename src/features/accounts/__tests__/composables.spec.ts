import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'

import { DEFAULT_PAGE_SIZE, type StatementParams } from '@/features/accounts/api/statement'
import { useAccounts } from '@/features/accounts/composables/useAccounts'
import { useStatement } from '@/features/accounts/composables/useStatement'
import { server } from '@/mocks/node'
import { scenarios } from '@/mocks/scenarios'
import { mountComposable, settled } from '@/test/colada'
import { requestLog } from '@/test/requests'

const SALARY = 'acc_salary'

function statementParams(overrides: Partial<StatementParams> = {}): StatementParams {
  return {
    accountId: SALARY,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: 'occurredAt:desc',
    ...overrides,
  }
}

describe('useAccounts', () => {
  it('resolves to parsed accounts', async () => {
    const { result } = mountComposable(useAccounts)

    expect(result.status.value).toBe('pending')

    await settled(result)

    expect(result.status.value).toBe('success')
    expect(result.data.value?.map((account) => account.id)).toContain(SALARY)
  })

  it('exposes the failure union on error, with no narrowing needed', async () => {
    server.use(...scenarios['accounts-error'])

    const { result } = mountComposable(useAccounts)
    await settled(result)

    expect(result.status.value).toBe('error')
    // Typed as HttpError by src/types/colada.d.ts — this would not compile
    // against Colada's default `Error`.
    expect(result.error.value?.failure).toStrictEqual({
      kind: 'status',
      status: 503,
      message: 'The bank is not responding',
    })
  })

  it('does not refetch a balance that is still fresh', async () => {
    const log = requestLog()
    const { result } = mountComposable(useAccounts)
    await settled(result)

    expect(log.urls).toHaveLength(1)

    // `refresh` respects staleTime; with a staleTime of 0 this would fire.
    await result.refresh()
    expect(log.urls).toHaveLength(1)

    // `refetch` is the explicit "go and ask again" a retry button calls.
    await result.refetch()
    expect(log.urls).toHaveLength(2)
  })
})

describe('useStatement', () => {
  it('resolves to one page of the statement', async () => {
    const { result } = mountComposable(() => useStatement(statementParams()))
    await settled(result)

    expect(result.data.value?.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(result.data.value?.page).toBe(1)
  })

  it('refetches when the page changes, and serves the first page from cache on the way back', async () => {
    const log = requestLog()
    const page = ref(1)
    const { result } = mountComposable(() =>
      useStatement(() => statementParams({ page: page.value })),
    )
    await settled(result)

    expect(log.urls).toHaveLength(1)

    page.value = 2
    await settled(result)

    expect(log.urls).toHaveLength(2)
    expect(result.data.value?.page).toBe(2)

    // Still fresh, so going back is free — which is only true if the page is
    // part of the key.
    page.value = 1
    await settled(result)

    expect(log.urls).toHaveLength(2)
    expect(result.data.value?.page).toBe(1)
  })

  it('refetches when the sort changes', async () => {
    const log = requestLog()
    const sort = ref<StatementParams['sort']>('occurredAt:desc')
    const { result } = mountComposable(() =>
      useStatement(() => statementParams({ sort: sort.value })),
    )
    await settled(result)

    sort.value = 'amount:asc'
    await settled(result)

    expect(log.urls).toHaveLength(2)

    const amounts = result.data.value?.items.map((entry) => entry.amount) ?? []
    expect(amounts).toStrictEqual([...amounts].sort((a, b) => a - b))
  })

  it('refetches when the date filter changes', async () => {
    const log = requestLog()
    const from = ref<string | undefined>(undefined)
    const { result } = mountComposable(() =>
      useStatement(() => statementParams({ from: from.value })),
    )
    await settled(result)

    const unfiltered = result.data.value?.total ?? 0

    from.value = new Date().toISOString().slice(0, 10)
    await settled(result)

    expect(log.urls).toHaveLength(2)
    expect(result.data.value?.total).toBeLessThan(unfiltered)
  })

  it('keeps the current page on screen while the next one loads', async () => {
    const page = ref(1)
    const { result } = mountComposable(() =>
      useStatement(() => statementParams({ page: page.value })),
    )
    await settled(result)

    const firstPageIds = result.data.value?.items.map((entry) => entry.id)

    page.value = 2
    await nextTick()

    // Mid-flight: the table is still showing page one, dimmed rather than gone.
    expect(result.asyncStatus.value).toBe('loading')
    expect(result.isPlaceholderData.value).toBe(true)
    expect(result.data.value?.items.map((entry) => entry.id)).toStrictEqual(firstPageIds)

    await settled(result)

    expect(result.isPlaceholderData.value).toBe(false)
    expect(result.data.value?.page).toBe(2)
  })
})
