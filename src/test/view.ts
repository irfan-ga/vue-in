import { PiniaColada } from '@pinia/colada'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { vi } from 'vitest'
import { nextTick, type Component } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { routes } from '@/router/routes'

/**
 * Mounts a view with everything the app gives it: a fresh Pinia and Colada
 * cache per call, and a real router over the real route table so that a
 * `RouterLink` renders the href it would in the browser.
 */
export async function mountView(
  component: Component,
  props: Record<string, unknown> = {},
): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(component, {
    props,
    global: {
      plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }], router],
    },
  })

  return { wrapper, router }
}

/**
 * Waits for something about the rendered view to become true. The mock backend
 * answers on a timer, so a microtask drain is not enough.
 */
export async function until(predicate: () => boolean): Promise<void> {
  await vi.waitUntil(predicate, { interval: 5, timeout: 2000 })
  await nextTick()
}

/**
 * Waits for a view to stop showing its skeleton. Every loading region in this
 * app marks itself `aria-busy`, which is both how a screen reader knows and how
 * a test knows.
 *
 * It returns at once when nothing is loading — a refetch after an error keeps
 * the error on screen rather than going back to a skeleton, so wait for what
 * you actually expect with `until` instead.
 */
export async function loaded(wrapper: VueWrapper): Promise<void> {
  await until(() => !wrapper.find('[aria-busy="true"]').exists())
}

/** Finds a button by the words on it, the way a customer would. */
export function button(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((candidate) => candidate.text() === label)

  if (!match) {
    const seen = wrapper
      .findAll('button')
      .map((candidate) => candidate.text())
      .join(', ')

    throw new Error(`no button labelled "${label}"; found: ${seen || 'none'}`)
  }

  return match
}
