<script setup lang="ts">
/**
 * An empty or error state. Presentational: it is told what to say and renders a
 * slot for whatever action goes with it (rule 13).
 *
 * An error carries `role="alert"`, so it is announced rather than only coloured
 * red — see the accessibility notes in docs/CONVENTIONS.md.
 */
type Props = {
  title: string
  description?: string
  tone?: 'info' | 'error'
}

const { title, description, tone = 'info' } = defineProps<Props>()
</script>

<template>
  <div
    :class="[
      'rounded-lg border p-6 text-center',
      tone === 'error' ? 'border-debit/30 bg-debit-soft' : 'border-surface-border bg-surface',
    ]"
    :role="tone === 'error' ? 'alert' : undefined"
  >
    <p :class="['font-medium', tone === 'error' ? 'text-debit' : 'text-slate-900']">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-slate-600">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4 flex justify-center gap-2"><slot /></div>
  </div>
</template>
