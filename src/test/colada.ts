import type { AsyncStatus } from '@pinia/colada'
import { PiniaColada } from '@pinia/colada'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

/**
 * Runs a composable inside a real component — `useQuery` needs a component
 * instance and an effect scope, not just an app.
 *
 * Each call gets its own Pinia and so its own Colada cache, which keeps one
 * test's cached query from satisfying the next one's assertion about requests.
 * The global `staleTime: 0` mirrors src/main.ts: a fail-safe, never a default a
 * query is allowed to lean on (rule 2).
 */
export function mountComposable<Result>(composable: () => Result): {
  result: Result
  unmount: () => void
} {
  let result: Result | undefined

  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()

        return () => h('div')
      },
    }),
    {
      global: {
        plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]],
      },
    },
  )

  if (result === undefined) {
    throw new Error('the composable under test returned undefined')
  }

  return { result, unmount: () => wrapper.unmount() }
}

/**
 * Waits for a query to stop fetching.
 *
 * `flushPromises` is not enough: the mock backend's `delay()` is a real timer,
 * so a response lands a tick later than any microtask drain. The `nextTick`
 * first lets a changed key start its fetch, so this cannot return while the
 * query is about to become busy.
 */
export async function settled(query: {
  asyncStatus: { readonly value: AsyncStatus }
}): Promise<void> {
  await nextTick()
  await vi.waitUntil(() => query.asyncStatus.value === 'idle', { interval: 5, timeout: 2000 })
}
