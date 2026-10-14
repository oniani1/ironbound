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
