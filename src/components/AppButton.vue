<script setup lang="ts">
type Props = {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
}

const { variant = 'primary', type = 'button', disabled = false } = defineProps<Props>()
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'primary'
        ? 'bg-brand-600 text-white hover:bg-brand-700'
        : 'border-surface-border bg-surface hover:bg-surface-muted border text-slate-700',
    ]"
  >
    <slot />
  </button>
</template>
