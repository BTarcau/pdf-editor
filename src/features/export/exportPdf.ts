import type { PageRef, Source, SourceId } from '../../core/model/types'
import type { ExportRequest, ExportResponse } from './export.worker'

/**
 * Builds the edited PDF in a Web Worker so large files don't freeze the UI.
 * If the worker itself can't run (fails to load, crashes), falls back to
 * building on the main thread so the user still gets their file, or at least
 * a real error message instead of a generic one.
 */
export async function exportPdf(
  sources: Record<SourceId, Source>,
  pages: readonly PageRef[],
): Promise<Uint8Array> {
  const used = new Set(pages.map((p) => p.sourceId))
  const sourceBytes: ExportRequest['sourceBytes'] = {}
  for (const id of used) {
    const source = sources[id]
    if (source) sourceBytes[id] = source.bytes
  }

  try {
    return await exportInWorker({ sourceBytes, pages: [...pages] })
  } catch (err) {
    if (!(err instanceof WorkerFailure)) throw err
    console.warn('Export worker failed, building on the main thread:', err.message)
    const { buildPdf } = await import('./buildPdf')
    return buildPdf(sourceBytes, pages)
  }
}

/** The worker could not run at all (as opposed to buildPdf reporting an error). */
class WorkerFailure extends Error {}

function exportInWorker(request: ExportRequest): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<ExportResponse>) => {
      worker.terminate()
      if (e.data.ok) resolve(e.data.bytes)
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(
        new WorkerFailure(e.message || `Export worker failed to run (${e.filename || 'unknown'})`),
      )
    }
    worker.onmessageerror = () => {
      worker.terminate()
      reject(new WorkerFailure('Export worker sent an unreadable message'))
    }
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
