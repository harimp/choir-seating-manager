import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: ['./src'],
        additionalData: `@use "styles/variables.scss" as *;`
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
