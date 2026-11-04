import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],

  /*
   * Dedicated ports, and `strictPort` so a clash fails loudly instead of
   * quietly moving to the next free one. Vite's default 5173 is every Vite
   * project's default: with another one already running, this app silently
   * landed on 5174 while Playwright — pointed at 5173 — happily tested the
   * other project and reported green.
   */
  server: {
    port: 5180,
    strictPort: true,
  },

  preview: {
    port: 4180,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
