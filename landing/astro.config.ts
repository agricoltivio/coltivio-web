import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  site: 'https://coltivio.ch',
  output: 'static',
  // Share public/ folder with the app at the repo root
  publicDir: '../public',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'fr', 'it', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
