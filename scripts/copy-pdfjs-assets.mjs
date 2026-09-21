// Copies the pdf.js runtime assets (CMaps, standard fonts, wasm decoders, ICC
// profiles) into public/pdfjs so they are served from our own origin. Runs
// before dev/build; the output is gitignored.
import { cp, mkdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'))
const dest = join(process.cwd(), 'public', 'pdfjs')

await rm(dest, { recursive: true, force: true })
await mkdir(dest, { recursive: true })
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  await cp(join(pdfjsRoot, dir), join(dest, dir), { recursive: true })
}
console.log('Copied pdf.js assets to public/pdfjs')
