import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite's proxy prepends the target's path to the incoming request path, so a
// VITE_API_URL that already ends in /api/v1 would turn
// /api/v1/auth/register into /api/v1/api/v1/auth/register (a 404 that surfaces
// as "Server returned an unexpected response"). Keep the origin only, so both
// `http://host:3000` and `http://host:3000/api/v1` work.
const apiTarget = (process.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/v1\/?$/, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
