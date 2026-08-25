import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      // E2E/CIはWorkers AIのremote proxy（API token必須）を開かない。
      remoteBindings: process.env.E2E !== 'true',
    }),
    tanstackStart(),
    viteReact(),
  ],
})
