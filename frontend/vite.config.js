import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    host: true, // atau '0.0.0.0'
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'flamestreet.test',      // Tambahkan domain valet kamu di sini
      '.flamestreet.test'     // Gunakan titik di depan untuk mengizinkan subdomain jika ada
    ],
    hmr: {
      host: 'flamestreet.test',
    },
  },
})
