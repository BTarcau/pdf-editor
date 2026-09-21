import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

/** Reads the `/*` block of public/_headers so `vite preview` serves the production headers. */
function productionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    const match = /^\s+([\w-]+):\s*(.+)$/.exec(line)
    if (match) headers[match[1]!] = match[2]!
  }
  return headers
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  // pdf.js ships its own worker and dynamic imports; pre-bundling it breaks them in dev.
  optimizeDeps: { exclude: ['pdfjs-dist'] },
  preview: { headers: productionHeaders() },
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
})
