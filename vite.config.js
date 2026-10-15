import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Split the big engine/vendor libs into their own cacheable chunks.
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          react: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
})
