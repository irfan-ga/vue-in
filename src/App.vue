<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { config } from './lib/config'
</script>

<template>
  <div class="min-h-screen">
    <header class="border-surface-border bg-surface border-b">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <RouterLink to="/" class="text-brand-700 text-base font-semibold">Vue-In Bank</RouterLink>
        <!-- The one thing that must never be ambiguous about this app. -->
        <p class="bg-pending-soft text-pending rounded-full px-3 py-1 text-xs font-medium">
          Demo · not a real bank · {{ config.appEnv }}
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
