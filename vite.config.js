import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

const apiTarget = `http://127.0.0.1:${process.env.BILLSGO_API_PORT || 4000}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { proxy: { '/api': apiTarget } },
  server: {
    port: 2500,
    strictPort: true,
    proxy: { '/api': apiTarget },
  },
})
