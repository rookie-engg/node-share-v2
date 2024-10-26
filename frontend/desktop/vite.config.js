import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../../backend/main/src/ui'
  },
  server: {
    port: 3001,
    '/': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
})
