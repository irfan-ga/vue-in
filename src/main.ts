import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

import App from './App.vue'
import router from './router'
import './assets/main.css'

/**
 * Start the MSW mock backend when enabled. This is awaited before mounting so
 * that no request can escape to the network during the first render.
 *
 * Enabled via VITE_ENABLE_MSW rather than `import.meta.env.DEV`, because the
 * production preview build also needs a backend for Playwright on CI.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return

  const { worker } = await import('./mocks/browser')
  await worker.start({
    // A request with no handler is an unfinished feature; make it visible.
    onUnhandledFrame: 'warn',
  })
}

async function bootstrap(): Promise<void> {
  await enableMocking()

  const app = createApp(App)

  app.use(createPinia())

  app.use(PiniaColada, {
    queryOptions: {
      /*
       * Colada's own default is 5 seconds. It is lowered to 0 here on purpose:
       * forgetting to set staleTime then costs an extra request rather than
       * showing a stale balance or a stale transaction status.
       *
       * This is a safety net, not a licence to omit it — every query states its
       * own staleTime. See docs/adr/0002-pinia-colada-for-server-state.md.
       */
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  })

  app.use(router)

  app.mount('#app')
}

/*
 * Nothing here can report through the app, because the app is what failed to
 * start — so render a plain fallback and re-throw, which surfaces the error in
 * devtools and, from Phase 5, in structured error reporting.
 */
bootstrap().catch((error: unknown) => {
  const root = document.getElementById('app')
  if (root) {
    root.textContent = 'Something went wrong while starting the app. Please reload the page.'
  }
  throw error
})
