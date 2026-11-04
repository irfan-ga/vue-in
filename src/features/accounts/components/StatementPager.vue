<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/components/AppButton.vue'

/**
 * Server-side paging. The counts come from the server's `total`, never from
 * `items.length` — the client only ever holds one page.
 */
type Props = {
  page: number
  pageSize: number
  total: number
  busy?: boolean
}

const { page, pageSize, total, busy = false } = defineProps<Props>()

const emit = defineEmits<{ change: [number] }>()

const pageCount = computed(() => Math.max(1, Math.ceil(total / pageSize)))
const firstRow = computed(() => (page - 1) * pageSize + 1)
const lastRow = computed(() => Math.min(page * pageSize, total))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-slate-600" aria-live="polite">
      Showing {{ firstRow }}–{{ lastRow }} of {{ total }}
    </p>

    <div class="flex items-center gap-2">
      <AppButton
        variant="secondary"
        :disabled="busy || page <= 1"
        @click="emit('change', page - 1)"
      >
        Previous
      </AppButton>
      <p class="text-sm text-slate-600">Page {{ page }} of {{ pageCount }}</p>
      <AppButton
        variant="secondary"
        :disabled="busy || page >= pageCount"
        @click="emit('change', page + 1)"
      >
        Next
      </AppButton>
    </div>
  </div>
</template>
