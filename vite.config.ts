import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5183, strictPort: true },
  build: {
    chunkSizeWarningLimit: 1600,
    // Artifact builds inline fonts so they never depend on the host's font policy.
    assetsInlineLimit: process.env.VITE_HASH_ROUTER === '1' ? 64 * 1024 : 4096,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/[\/]node_modules[\/](three|three-stdlib|@react-three|postprocessing|maath|camera-controls)[\/]/.test(id)) return 'three'
          return undefined
        },
      },
    },
  },
})
