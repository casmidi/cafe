import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Subdomain cafe.quantum.or.id = root path
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy opsional jika ingin menghindari CORS di local dev
    // proxy: {
    //   '/api': 'http://localhost/resto-backend/api'
    // }
  }
})