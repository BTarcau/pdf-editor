import type { PageRef, Source, SourceId } from '../../core/model/types'
import type { ExportRequest, ExportResponse } from './export.worker'

/** Builds the edited PDF in a Web Worker so large files don't freeze the UI. */
export function exportPdf(
  sources: Record<SourceId, Source>,
  pages: readonly PageRef[],
): Promise<Uint8Array> {
  const used = new Set(pages.map((p) => p.sourceId))
  const sourceBytes: ExportRequest['sourceBytes'] = {}
  for (const id of used) {
    const source = sources[id]
    if (source) sourceBytes[id] = source.bytes
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./export.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<ExportResponse>) => {
      worker.terminate()
      if (e.data.ok) resolve(e.data.bytes)
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message || 'Export worker failed'))
    }
    const request: ExportRequest = { sourceBytes, pages: [...pages] }
    worker.postMessage(request)
  })
}

export function editedFileName(name: string): string {
  return `${name.replace(/\.pdf$/i, '') || 'document'}-edited.pdf`
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
