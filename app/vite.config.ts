import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Chemins relatifs pour Electron
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: Number(process.env.VITE_DEV_SERVER_PORT || 5273),
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
