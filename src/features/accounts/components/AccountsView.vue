<script setup lang="ts">
import { computed } from 'vue'

import AppNotice from '@/components/AppNotice.vue'
import AppSkeleton from '@/components/AppSkeleton.vue'

import { useAccounts } from '../composables/useAccounts'
import AccountCard from './AccountCard.vue'
import RequestFailure from './RequestFailure.vue'

const { state, asyncStatus, refetch } = useAccounts()

/** How many placeholder cards to show; roughly what a customer tends to have. */
const SKELETON_CARDS = 3

/*
 * The four states of rule 5, as a union rather than a stack of booleans
 * (rule 17). Deriving it here instead of in the template keeps the narrowing
 * honest: `data` only exists on the branch that has it.
 */
const view = computed(() => {
  if (state.value.status === 'pending') return { kind: 'loading' } as const
  if (state.value.status === 'error') {
    return { kind: 'failed', failure: state.value.error.failure } as const
  }
  if (state.value.data.length === 0) return { kind: 'empty' } as const

  return { kind: 'ready', accounts: state.value.data } as const
})
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold text-slate-900">Your accounts</h1>

    <div
      v-if="view.kind === 'loading'"
      role="status"
      aria-busy="true"
      class="mt-4 grid gap-3 sm:grid-cols-2"
    >
      <span class="sr-only">Loading your accounts</span>
      <AppSkeleton v-for="card in SKELETON_CARDS" :key="card" class="h-32 w-full" />
    </div>

    <RequestFailure
      v-else-if="view.kind === 'failed'"
      class="mt-4"
      :failure="view.failure"
      :retrying="asyncStatus === 'loading'"
      @retry="refetch()"
    />

    <AppNotice
      v-else-if="view.kind === 'empty'"
      class="mt-4"
      title="No accounts yet"
      description="When the bank opens an account in your name, it will appear here."
    />

    <ul v-else class="mt-4 grid gap-3 sm:grid-cols-2">
      <li v-for="account in view.accounts" :key="account.id">
        <AccountCard :account="account" />
      </li>
    </ul>
  </section>
</template>
