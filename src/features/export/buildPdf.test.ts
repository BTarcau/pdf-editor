import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { makePdf, pageWidth } from '../../../tests/helpers/pdfTool.mjs'
import { createDoc, deletePages } from '../../core/model/doc'
import type { PageRef, Source } from '../../core/model/types'
import { buildPdf } from './buildPdf'

async function widths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => p.getWidth())
}

async function setup(pageCount: number) {
  const bytes = await makePdf(pageCount)
  const source: Source = {
    id: 's1',
    name: 'test.pdf',
    bytes,
    pageCount,
    pageSizes: [],
    encrypted: false,
  }
  return { bytes, doc: createDoc(source) }
}

describe('buildPdf', () => {
  it('exports all pages unchanged when nothing was deleted', async () => {
    const { bytes, doc } = await setup(4)
    const out = await buildPdf({ s1: bytes }, doc.pages)
    expect(await widths(out)).toEqual([0, 1, 2, 3].map(pageWidth))
  })

  it.each([
    ['first', [0], [1, 2, 3, 4]],
    ['middle', [2], [0, 1, 3, 4]],
    ['last', [4], [0, 1, 2, 3]],
    ['several', [0, 2, 4], [1, 3]],
  ])('deleting the %s page keeps the right pages in order', async (_name, del, keep) => {
    const { bytes, doc } = await setup(5)
    const next = deletePages(
      doc,
      del.map((i) => doc.pages[i]!.id),
    )
    const out = await buildPdf({ s1: bytes }, next.pages)
    expect(await widths(out)).toEqual(keep.map(pageWidth))
  })

  it('applies page rotation', async () => {
    const { bytes, doc } = await setup(2)
    const pages: PageRef[] = doc.pages.map((p, i) => (i === 1 ? { ...p, rotation: 90 } : p))
    const out = await PDFDocument.load(await buildPdf({ s1: bytes }, pages))
    expect(out.getPage(0).getRotation().angle).toBe(0)
    expect(out.getPage(1).getRotation().angle).toBe(90)
  })

  it('rejects an empty page list', async () => {
    const { bytes } = await setup(1)
    await expect(buildPdf({ s1: bytes }, [])).rejects.toThrow()
  })

  it("does not leave deleted pages' content in the output file", async () => {
    // Give every page a large unique payload, delete all but one, and make
    // sure the output is not carrying the deleted pages around.
    const src = await PDFDocument.create()
    for (let i = 0; i < 5; i++) {
      const page = src.addPage([200, 200])
      // Incompressible payload so the size comparison is meaningful.
      const noise = Array.from({ length: 1500 }, () => Math.random().toString(36).slice(2, 4)).join(
        '',
      )
      page.drawText(`SECRET-${i}-${noise}`, { x: 5, y: 100, size: 8 })
    }
    const bytes = await src.save({ useObjectStreams: false })
    const doc = createDoc({
      id: 's1',
      name: 'a.pdf',
      bytes,
      pageCount: 5,
      pageSizes: [],
      encrypted: false,
    })
    const next = deletePages(
      doc,
      doc.pages.slice(1).map((p) => p.id),
    )
    const out = await buildPdf({ s1: bytes }, next.pages)
    expect(out.length).toBeLessThan(bytes.length / 2)
  })

  it('does not drag deleted pages in through internal link annotations', async () => {
    const src = await PDFDocument.create()
    const pages = [0, 1, 2].map(() => src.addPage([200, 200]))
    // Page dictionaries are written uncompressed, so this marker is greppable.
    pages[2]!.node.set(PDFName.of('Marker'), PDFString.of('LINK-TARGET'))
    const link = src.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [0, 0, 100, 100],
      Border: [0, 0, 0],
      Dest: [pages[2]!.ref, PDFName.of('Fit')],
    })
    pages[0]!.node.set(PDFName.of('Annots'), src.context.obj([src.context.register(link)]))
    const bytes = await src.save({ useObjectStreams: false })
    const doc = createDoc({
      id: 's1',
      name: 'a.pdf',
      bytes,
      pageCount: 3,
      pageSizes: [],
      encrypted: false,
    })
    const next = deletePages(doc, [doc.pages[2]!.id])
    const out = await buildPdf({ s1: bytes }, next.pages)
    // Sanity check: the marker really is in the source.
    expect(Buffer.from(bytes).toString('latin1')).toContain('LINK-TARGET')
    expect(Buffer.from(out).toString('latin1')).not.toContain('LINK-TARGET')
  })
})
