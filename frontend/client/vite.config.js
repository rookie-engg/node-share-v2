import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../../backend/file-server/static'
  },
  server: {
    host: true,
    port: 3000,
    '/': {
      target: 'http://localhost:8080',
    },
  },
});
