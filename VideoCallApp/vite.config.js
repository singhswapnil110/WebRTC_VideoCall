import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // onnxruntime's import.meta.url shim reads `document`, which an IIFE worker lacks.
  worker: { format: 'es' },
})
