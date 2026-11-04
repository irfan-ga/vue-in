<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { maskAccountNumber } from '@/lib/format'
import { formatPaise } from '@/lib/money'

import { STATEMENT_ROUTE } from '../routes'
import type { Account } from '../schemas/account'

const { account } = defineProps<{ account: Account }>()

const TYPE_LABELS: Record<Account['type'], string> = {
  savings: 'Savings',
  current: 'Current',
}

/*
 * Only the states that change what the customer can do are badged. An "Active"
 * badge on every card is noise, and noise is what stops anyone reading the one
 * that says "Frozen".
 */
const STATUS_BADGES: Record<Account['status'], string | undefined> = {
  active: undefined,
  dormant: 'Dormant',
  frozen: 'Frozen',
}
</script>

<template>
  <RouterLink
    :to="{ name: STATEMENT_ROUTE, params: { accountId: account.id } }"
    class="border-surface-border bg-surface hover:border-brand-300 block rounded-lg border p-4 transition"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-medium text-slate-900">{{ account.label }}</p>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ TYPE_LABELS[account.type] }} · {{ maskAccountNumber(account.number) }}
        </p>
      </div>
      <span
        v-if="STATUS_BADGES[account.status]"
        class="bg-pending-soft text-pending rounded-full px-2 py-0.5 text-xs font-medium"
      >
        {{ STATUS_BADGES[account.status] }}
      </span>
    </div>

    <p class="amount mt-4 text-2xl font-semibold text-slate-900">
      {{ formatPaise(account.balance) }}
    </p>
    <p class="amount mt-1 text-sm text-slate-500">{{ formatPaise(account.available) }} available</p>
  </RouterLink>
</template>
