import { defineConfig } from 'vitest/config'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    mockReset: true,
    env: {
      VITE_SUPABASE_URL: 'https://yziorfskmdwjumjwabxa.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6aW9yZnNrbWR3anVtandhYnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTY3MDgsImV4cCI6MjA5OTYzMjcwOH0.wMoISIpd_BSDd3BEgeXBN3WLVaVcXP5FGnNHVs34WEk',
    },
    fileParallelism: false,
  },
})
