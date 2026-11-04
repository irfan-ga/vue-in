import { createRouter, createWebHistory } from 'vue-router'

import { config } from '@/lib/config'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(config.baseUrl),
  routes,
})

export default router
