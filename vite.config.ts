import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

// maplibre-gl 6 loads its worker from ./maplibre-gl-worker.mjs next to the bundled chunk (derived from
// import.meta.url at runtime), which Vite can't see. Emit the worker file there so production finds it.
function maplibreWorker(): Plugin {
  let assetsDir = 'assets'
  return {
    name: 'maplibre-worker',
    apply: 'build',
    configResolved(config) {
      assetsDir = config.build.assetsDir
    },
    generateBundle() {
      const workerPath = createRequire(import.meta.url).resolve('maplibre-gl/dist/maplibre-gl-worker.mjs')
      this.emitFile({ type: 'asset', fileName: `${assetsDir}/maplibre-gl-worker.mjs`, source: readFileSync(workerPath) })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
    maplibreWorker(),
  ],
  // maplibre-gl 6 spawns its worker via new URL(..., import.meta.url); esbuild pre-bundling breaks that path
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
