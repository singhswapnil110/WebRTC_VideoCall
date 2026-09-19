import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    // The caption ASR worker pulls in onnxruntime-web, whose `import.meta.url`
    // shim dereferences `document`. Rollup only guards that for UMD output, so
    // the default IIFE worker format throws "document is not defined" as soon
    // as the built worker loads. ES workers keep native `import.meta.url`.
    format: 'es',
  },
})
