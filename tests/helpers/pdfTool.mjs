// Fixture helpers shared by unit tests (imported) and e2e tests (run as a CLI,
// because Playwright's CJS loader can't load pdf-lib in-process).
//
//   node tests/helpers/pdfTool.mjs make <pageCount>   -> base64 PDF on stdout
//   node tests/helpers/pdfTool.mjs widths <file.pdf>  -> JSON array of page widths
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts } from 'pdf-lib'

/** Page `i` (0-based) is `200 + i * 10` points wide, so tests can identify pages by width. */
export function pageWidth(index) {
  return 200 + index * 10
}

export async function makePdf(pageCount) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([pageWidth(i), 300])
    page.drawText(`Page ${i + 1}`, { x: 20, y: 150, size: 32, font })
  }
  return doc.save()
}

export async function pageWidths(bytes) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => p.getWidth())
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2)
  if (cmd === 'make') {
    process.stdout.write(Buffer.from(await makePdf(Number(arg))).toString('base64'))
  } else if (cmd === 'widths') {
    process.stdout.write(JSON.stringify(await pageWidths(await readFile(arg))))
  } else {
    console.error('usage: pdfTool.mjs make <n> | widths <file>')
    process.exit(1)
  }
}
