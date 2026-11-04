<script setup lang="ts">
import { formatDay } from '@/lib/format'
import { formatPaise } from '@/lib/money'

import type { StatementSort } from '../api/statement'
import type { Transaction } from '../schemas/statement'

/**
 * The statement rows. Presentational: it is handed a page and reports what the
 * customer clicked — fetching, paging and filtering belong to the view.
 */
type Props = {
  items: Transaction[]
  sort: StatementSort
  /** Dims the table while the next page is on its way. */
  stale?: boolean
}

const { items, sort, stale = false } = defineProps<Props>()

const emit = defineEmits<{ sort: [StatementSort] }>()

/** Which way to sort next: the same column flips, a new column starts newest. */
function toggle(field: 'occurredAt' | 'amount'): StatementSort {
  return sort === `${field}:desc` ? `${field}:asc` : `${field}:desc`
}

function ariaSort(field: 'occurredAt' | 'amount'): 'ascending' | 'descending' | 'none' {
  if (sort === `${field}:asc`) return 'ascending'
  if (sort === `${field}:desc`) return 'descending'

  return 'none'
}
</script>

<template>
  <div
    :class="[
      'border-surface-border bg-surface overflow-x-auto rounded-lg border transition-opacity',
      stale ? 'opacity-60' : 'opacity-100',
    ]"
  >
    <table class="w-full text-sm">
      <caption class="sr-only">
        Transactions, newest first unless sorted otherwise
      </caption>
      <thead class="bg-surface-muted text-left text-slate-600">
        <tr>
          <th scope="col" class="px-4 py-2" :aria-sort="ariaSort('occurredAt')">
            <button type="button" class="font-medium" @click="emit('sort', toggle('occurredAt'))">
              Date
            </button>
          </th>
          <th scope="col" class="px-4 py-2 font-medium">Details</th>
          <th scope="col" class="px-4 py-2 text-right" :aria-sort="ariaSort('amount')">
            <button type="button" class="font-medium" @click="emit('sort', toggle('amount'))">
              Amount
            </button>
          </th>
          <th scope="col" class="px-4 py-2 text-right font-medium">Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in items" :key="entry.id" class="border-surface-border border-t">
          <td class="px-4 py-3 whitespace-nowrap text-slate-600">
            {{ formatDay(entry.occurredAt) }}
          </td>
          <td class="px-4 py-3">
            <span class="text-slate-900">{{ entry.narration }}</span>
            <span
              v-if="entry.status === 'pending'"
              class="bg-pending-soft text-pending ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
            >
              Pending
            </span>
          </td>
          <td
            :class="[
              'amount px-4 py-3 text-right font-medium whitespace-nowrap',
              entry.direction === 'credit' ? 'text-credit' : 'text-debit',
            ]"
          >
            <!-- The sign carries the meaning; the colour only reinforces it. -->
            <span class="sr-only">{{ entry.direction === 'credit' ? 'Credit' : 'Debit' }}</span>
            {{ entry.direction === 'credit' ? '+' : '−' }}{{ formatPaise(entry.amount) }}
          </td>
          <td class="amount px-4 py-3 text-right whitespace-nowrap text-slate-600">
            <!-- A pending entry has not moved the balance, so there is none. -->
            {{ entry.status === 'posted' ? formatPaise(entry.balanceAfter) : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
