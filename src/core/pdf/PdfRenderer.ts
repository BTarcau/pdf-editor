import {
  GlobalWorkerOptions,
  PasswordResponses,
  RenderingCancelledException,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import type { PageSize, Rotation, SourceId } from '../model/types'

// Let Vite bundle and construct the worker (the documented pdf.js + Vite setup). Handing
// pdf.js a bare node_modules URL is fragile in dev: if the URL can't be fetched, pdf.js
// falls back to a "fake worker" and fails with a confusing dynamic-import error.
GlobalWorkerOptions.workerPort = new PdfWorker()

// Runtime assets are copied to /pdfjs by scripts/copy-pdfjs-assets.mjs and
// served from our own origin (no CDN).
const ASSET_BASE = `${import.meta.env.BASE_URL}pdfjs/`

export class PdfPasswordError extends Error {
  readonly incorrect: boolean
  constructor(incorrect: boolean) {
    super(incorrect ? 'Incorrect password' : 'Password required')
    this.name = 'PdfPasswordError'
    this.incorrect = incorrect
  }
}

export class PdfInvalidError extends Error {
  constructor(message = 'This file is not a valid PDF') {
    super(message)
    this.name = 'PdfInvalidError'
  }
}

export interface LoadedPdf {
  pageCount: number
  pageSizes: PageSize[]
}

export interface RenderHandle {
  /** Resolves when drawing has finished; resolves quietly if cancelled. */
  done: Promise<void>
  cancel: () => void
}

const THUMB_CACHE_LIMIT = 300

/**
 * Thin wrapper around pdf.js. All page rendering goes through here so the
 * thumbnail sidebar and the main viewer share parsed documents, and so
 * deleting/reordering pages never requires re-parsing a file.
 */
export class PdfRenderer {
  private docs = new Map<SourceId, PDFDocumentProxy>()
  /** key -> object URL, in insertion (LRU) order. */
  private thumbs = new Map<string, string>()

  async load(id: SourceId, bytes: Uint8Array, password?: string): Promise<LoadedPdf> {
    // pdf.js transfers the buffer to its worker, so always hand it a copy;
    // the original bytes are needed later for export.
    const task = getDocument({
      data: bytes.slice(),
      password,
      cMapUrl: `${ASSET_BASE}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
      wasmUrl: `${ASSET_BASE}wasm/`,
      iccUrl: `${ASSET_BASE}iccs/`,
    })
    let doc: PDFDocumentProxy
    try {
      doc = await task.promise
    } catch (err) {
      throw translateLoadError(err, password)
    }

    try {
      const sizes: PageSize[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        sizes.push({ width: vp.width, height: vp.height })
        page.cleanup()
      }
      this.docs.set(id, doc)
      return { pageCount: doc.numPages, pageSizes: sizes }
    } catch (err) {
      void doc.loadingTask.destroy()
      throw new PdfInvalidError(err instanceof Error ? err.message : undefined)
    }
  }

  async destroy(id: SourceId): Promise<void> {
    const doc = this.docs.get(id)
    this.docs.delete(id)
    this.clearThumbnails()
    await doc?.loadingTask.destroy()
  }

  /** Draws a page onto `canvas` at `scale` (CSS px per PDF point) times `pixelRatio`. */
  render(
    id: SourceId,
    pageIndex: number,
    rotation: Rotation,
    canvas: HTMLCanvasElement,
    scale: number,
    pixelRatio: number,
  ): RenderHandle {
    let cancelled = false
    let cancelTask: () => void = () => {}

    const done = (async () => {
      const doc = this.requireDoc(id)
      const page = await doc.getPage(pageIndex + 1)
      if (cancelled) return
      const viewport = page.getViewport({
        scale: scale * pixelRatio,
        rotation: (page.rotate + rotation) % 360,
      })
      // Draw offscreen and copy on success so a cancelled render never leaves
      // a half-painted visible canvas.
      const buffer = document.createElement('canvas')
      buffer.width = Math.max(1, Math.floor(viewport.width))
      buffer.height = Math.max(1, Math.floor(viewport.height))
      const task = page.render({ canvas: buffer, viewport })
      cancelTask = () => task.cancel()
      try {
        await task.promise
      } catch (err) {
        if (err instanceof RenderingCancelledException) return
        throw err
      } finally {
        page.cleanup()
      }
      if (cancelled) return
      canvas.width = buffer.width
      canvas.height = buffer.height
      canvas.getContext('2d')?.drawImage(buffer, 0, 0)
    })()

    return {
      done,
      cancel: () => {
        cancelled = true
        cancelTask()
      },
    }
  }

  /** Renders a thumbnail and returns a cached object URL for it. */
  async thumbnail(
    id: SourceId,
    pageIndex: number,
    rotation: Rotation,
    width: number,
    pixelRatio: number,
  ): Promise<string> {
    const key = `${id}:${pageIndex}:${rotation}:${width}:${pixelRatio}`
    const hit = this.thumbs.get(key)
    if (hit) {
      this.thumbs.delete(key)
      this.thumbs.set(key, hit)
      return hit
    }
    const doc = this.requireDoc(id)
    const page = await doc.getPage(pageIndex + 1)
    const rot = (page.rotate + rotation) % 360
    const base = page.getViewport({ scale: 1, rotation: rot })
    const viewport = page.getViewport({
      scale: (width / base.width) * pixelRatio,
      rotation: rot,
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    try {
      await page.render({ canvas, viewport }).promise
    } finally {
      page.cleanup()
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Could not encode thumbnail')
    const url = URL.createObjectURL(blob)
    this.thumbs.set(key, url)
    while (this.thumbs.size > THUMB_CACHE_LIMIT) {
      const oldest = this.thumbs.keys().next().value
      if (oldest === undefined) break
      URL.revokeObjectURL(this.thumbs.get(oldest)!)
      this.thumbs.delete(oldest)
    }
    return url
  }

  clearThumbnails(): void {
    for (const url of this.thumbs.values()) URL.revokeObjectURL(url)
    this.thumbs.clear()
  }

  private requireDoc(id: SourceId): PDFDocumentProxy {
    const doc = this.docs.get(id)
    if (!doc) throw new Error(`PDF ${id} is not loaded`)
    return doc
  }
}

function translateLoadError(err: unknown, password: string | undefined): Error {
  const name = err instanceof Error ? err.name : ''
  const code = (err as { code?: number } | null)?.code
  if (name === 'PasswordException') {
    return new PdfPasswordError(
      password !== undefined && code === PasswordResponses.INCORRECT_PASSWORD,
    )
  }
  if (name === 'InvalidPDFException' || name === 'MissingPDFException') {
    return new PdfInvalidError()
  }
  return new PdfInvalidError(err instanceof Error ? err.message : undefined)
}

export const renderer = new PdfRenderer()
