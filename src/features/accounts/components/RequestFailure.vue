<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/components/AppButton.vue'
import AppNotice from '@/components/AppNotice.vue'
import type { HttpFailure } from '@/lib/http'

/**
 * The user-facing half of `lib/http.ts`'s failure union.
 *
 * `http.ts` deliberately carries no copy — only the view knows what the user
 * was doing. This is that view, in one place, so the accounts list and the
 * statement cannot drift into describing the same outage differently.
 */
type Props = {
  failure: HttpFailure
  /** A retry already in flight; the button says so instead of looking dead. */
  retrying?: boolean
}

const { failure, retrying = false } = defineProps<Props>()

const emit = defineEmits<{ retry: [] }>()

const COPY: Record<HttpFailure['kind'], { title: string; description: string }> = {
  network: {
    title: 'No connection to the bank',
    description: 'The request did not get through. Check your connection and try again.',
  },
  timeout: {
    title: 'The bank took too long',
    description: 'Nothing was changed. Trying again usually works.',
  },
  cancelled: {
    title: 'That request was interrupted',
    description: 'Nothing was changed. Try again when you are ready.',
  },
  status: {
    title: 'The bank could not complete that',
    description: 'Nothing was changed.',
  },
  malformed: {
    title: 'Something is wrong at our end',
    description:
      'The bank answered with something this app cannot read. Retrying is unlikely to help — please report it.',
  },
}

/*
 * A `status` failure is the one case where the server has said something
 * specific and useful ("Account frozen"), so it is shown instead of the
 * generic line.
 */
const copy = computed(() => {
  const base = COPY[failure.kind]

  return failure.kind === 'status' ? { ...base, description: failure.message } : base
})
</script>

<template>
  <AppNotice tone="error" :title="copy.title" :description="copy.description">
    <AppButton :disabled="retrying" @click="emit('retry')">
      {{ retrying ? 'Trying again…' : 'Try again' }}
    </AppButton>
  </AppNotice>
</template>
