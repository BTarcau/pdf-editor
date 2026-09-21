import { PDFDocument, degrees } from 'pdf-lib'
import type { PageRef, SourceId } from '../../core/model/types'

export const PRODUCER = 'pdf-editor (github.com/BTarcau/pdf-editor)'

/**
 * Builds the output PDF from the edit list. This is the single place where
 * the document model is turned back into PDF bytes; new features (rotation,
 * merge, annotations) extend this function rather than adding export paths.
 *
 * Pages are copied into a fresh document rather than removed in place:
 * pdf-lib doesn't garbage-collect removed pages, so an in-place delete would
 * leave the "deleted" content inside the downloaded file.
 */
export async function buildPdf(
  sourceBytes: Record<SourceId, Uint8Array>,
  pages: readonly PageRef[],
): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error('Cannot build a PDF with no pages')

  const out = await PDFDocument.create()
  const loaded = new Map<SourceId, PDFDocument>()

  const load = async (id: SourceId) => {
    let doc = loaded.get(id)
    if (!doc) {
      const bytes = sourceBytes[id]
      if (!bytes) throw new Error(`Missing source ${id}`)
      doc = await PDFDocument.load(bytes, { updateMetadata: false })
      loaded.set(id, doc)
    }
    return doc
  }

  // Copy consecutive pages from the same source in one call so pdf-lib can
  // share fonts/images between them instead of duplicating.
  let i = 0
  while (i < pages.length) {
    const first = pages[i]!
    let j = i
    while (j < pages.length && pages[j]!.sourceId === first.sourceId) j++
    const run = pages.slice(i, j)
    const src = await load(first.sourceId)
    const copied = await out.copyPages(
      src,
      run.map((p) => p.sourcePageIndex),
    )
    copied.forEach((page, k) => {
      const ref = run[k]!
      if (ref.rotation !== 0) {
        page.setRotation(degrees((page.getRotation().angle + ref.rotation) % 360))
      }
      out.addPage(page)
    })
    i = j
  }

  const first = loaded.get(pages[0]!.sourceId)!
  const title = first.getTitle()
  if (title) out.setTitle(title)
  const author = first.getAuthor()
  if (author) out.setAuthor(author)
  out.setProducer(PRODUCER)
  out.setCreator(PRODUCER)
  out.setModificationDate(new Date())

  return out.save()
}
