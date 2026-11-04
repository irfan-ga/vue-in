<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'

/**
 * The date-range filter. Reports a change and holds no state of its own, so the
 * view can reset the page in the same handler — a filter that narrows the
 * results while leaving you on page seven is a blank screen.
 */
type Props = {
  from: string
  to: string
  disabled?: boolean
}

const { from, to, disabled = false } = defineProps<Props>()

const emit = defineEmits<{ change: [{ from: string; to: string }] }>()
</script>

<template>
  <form class="flex flex-wrap items-end gap-3" @submit.prevent>
    <div>
      <label class="block text-xs font-medium text-slate-600" for="statement-from">From</label>
      <input
        id="statement-from"
        :value="from"
        type="date"
        :max="to || undefined"
        :disabled="disabled"
        class="border-surface-border bg-surface mt-1 rounded-md border px-2 py-1.5 text-sm"
        @change="emit('change', { from: ($event.target as HTMLInputElement).value, to })"
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-slate-600" for="statement-to">To</label>
      <input
        id="statement-to"
        :value="to"
        type="date"
        :min="from || undefined"
        :disabled="disabled"
        class="border-surface-border bg-surface mt-1 rounded-md border px-2 py-1.5 text-sm"
        @change="emit('change', { from, to: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <AppButton
      v-if="from !== '' || to !== ''"
      variant="secondary"
      @click="emit('change', { from: '', to: '' })"
    >
      Clear dates
    </AppButton>
  </form>
</template>
