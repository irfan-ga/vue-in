<script setup lang="ts">
import { computed, ref } from 'vue'

import AppNotice from '@/components/AppNotice.vue'
import AppSkeleton from '@/components/AppSkeleton.vue'
import { maskAccountNumber } from '@/lib/format'

import { DEFAULT_PAGE_SIZE, type StatementParams, type StatementSort } from '../api/statement'
import { useAccounts } from '../composables/useAccounts'
import { useStatement } from '../composables/useStatement'
import RequestFailure from './RequestFailure.vue'
import StatementFilters from './StatementFilters.vue'
import StatementPager from './StatementPager.vue'
import StatementTable from './StatementTable.vue'

/** From the route (`props: true`), so this mounts in a test without a router. */
const { accountId } = defineProps<{ accountId: string }>()

const SKELETON_ROWS = 6

const page = ref(1)
const sort = ref<StatementSort>('occurredAt:desc')
const from = ref('')
const to = ref('')

const params = computed<StatementParams>(() => ({
  accountId,
  page: page.value,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: sort.value,
  // An empty input is no filter at all, not a filter on the empty string.
  ...(from.value === '' ? {} : { from: from.value }),
  ...(to.value === '' ? {} : { to: to.value }),
}))

const { state, asyncStatus, isPlaceholderData, refetch } = useStatement(params)

/*
 * Only for the heading. Coming from the account list this is already cached, so
 * it costs nothing; on a deep link it is one extra request and the heading falls
 * back until it lands. It has no error branch on purpose — a statement that
 * renders is not worth failing over a title.
 */
const { data: accounts } = useAccounts()

const account = computed(() => accounts.value?.find((candidate) => candidate.id === accountId))

/* The four states of rule 5 as one union, narrowed here rather than in the
 * template (rule 17). */
const view = computed(() => {
  if (state.value.status === 'pending') return { kind: 'loading' } as const
  if (state.value.status === 'error') {
    return { kind: 'failed', failure: state.value.error.failure } as const
  }
  if (state.value.data.total === 0) return { kind: 'empty' } as const

  return { kind: 'ready', statement: state.value.data } as const
})

const filtered = computed(() => from.value !== '' || to.value !== '')

/* Any change to what is being asked for starts again at page one: narrowing a
 * statement while standing on page seven is a blank screen. */
function changeSort(next: StatementSort): void {
  sort.value = next
  page.value = 1
}

function changeDates(next: { from: string; to: string }): void {
  from.value = next.from
  to.value = next.to
  page.value = 1
}
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold text-slate-900">
      {{ account?.label ?? 'Statement' }}
    </h1>
    <p v-if="account" class="mt-0.5 text-sm text-slate-500">
      {{ maskAccountNumber(account.number) }}
    </p>

    <StatementFilters
      class="mt-4"
      :from="from"
      :to="to"
      :disabled="view.kind === 'loading'"
      @change="changeDates"
    />

    <div v-if="view.kind === 'loading'" role="status" aria-busy="true" class="mt-4 space-y-2">
      <span class="sr-only">Loading transactions</span>
      <AppSkeleton v-for="row in SKELETON_ROWS" :key="row" class="h-10 w-full" />
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
      :title="filtered ? 'No transactions in those dates' : 'No transactions yet'"
      :description="
        filtered
          ? 'Try a wider date range, or clear the dates to see everything.'
          : 'Transactions will appear here as soon as money moves.'
      "
    />

    <div v-else class="mt-4 space-y-3">
      <StatementTable
        :items="view.statement.items"
        :sort="sort"
        :stale="isPlaceholderData"
        @sort="changeSort"
      />
      <StatementPager
        :page="view.statement.page"
        :page-size="view.statement.pageSize"
        :total="view.statement.total"
        :busy="asyncStatus === 'loading'"
        @change="page = $event"
      />
    </div>
  </section>
</template>
