import type { RouteRecordRaw } from 'vue-router'

/** Route names in one place (rule 24); no view spells one out as a string. */
export const ACCOUNTS_ROUTE = 'accounts'
export const STATEMENT_ROUTE = 'accounts.statement'

/**
 * The feature owns its routes and `src/router/` composes them, which keeps the
 * router wiring rather than deciding (rule 16).
 *
 * Both components are loaded lazily, so a feature costs nothing until someone
 * navigates to it. `props: true` hands the route param to the view as a prop,
 * so the component can be mounted in a test without a router pretending to be
 * somewhere.
 */
export const accountsRoutes: RouteRecordRaw[] = [
  {
    path: '/accounts',
    name: ACCOUNTS_ROUTE,
    component: () => import('./components/AccountsView.vue'),
  },
  {
    path: '/accounts/:accountId',
    name: STATEMENT_ROUTE,
    component: () => import('./components/StatementView.vue'),
    props: true,
  },
]
