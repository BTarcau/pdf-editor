import type { PageRef, SourceId } from '../../core/model/types'
import { buildPdf } from './buildPdf'

export interface ExportRequest {
  sourceBytes: Record<SourceId, Uint8Array>
  pages: PageRef[]
}

export type ExportResponse = { ok: true; bytes: Uint8Array } | { ok: false; error: string }

const worker = self as unknown as Worker

worker.onmessage = async (e: MessageEvent<ExportRequest>) => {
  try {
    const bytes = await buildPdf(e.data.sourceBytes, e.data.pages)
    const res: ExportResponse = { ok: true, bytes }
    worker.postMessage(res, [bytes.buffer as ArrayBuffer])
  } catch (err) {
    const res: ExportResponse = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    worker.postMessage(res)
  }
}
