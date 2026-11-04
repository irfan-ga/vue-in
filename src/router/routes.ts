import type { RouteRecordRaw } from 'vue-router'

import NotFoundView from '@/components/NotFoundView.vue'
import { ACCOUNTS_ROUTE, accountsRoutes } from '@/features/accounts/routes'

/**
 * The route table. Each feature owns its own records and this composes them —
 * the router wires, it does not decide (rule 16).
 *
 * Exported separately from the router instance so that a test can build a
 * router with memory history over the same table.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ACCOUNTS_ROUTE } },
  ...accountsRoutes,
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]
