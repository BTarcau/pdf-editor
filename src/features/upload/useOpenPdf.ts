import { useCallback, useState } from 'react'
import { useToastStore } from '../../components/toastStore'
import { PdfPasswordError, renderer } from '../../core/pdf/PdfRenderer'
import { useDocStore } from '../../core/store/docStore'
import { t } from '../../strings'
import { FileValidationError, readPdfFile } from './validateFile'

export interface PendingPassword {
  name: string
  bytes: Uint8Array
  /** The previous attempt was wrong. */
  incorrect: boolean
  /** Increments per prompt so the form resets between attempts. */
  attempt: number
}

/** Owns the "open a PDF" flow, including the password prompt. */
export function useOpenPdf() {
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingPassword | null>(null)

  const load = useCallback(async (name: string, bytes: Uint8Array, password?: string) => {
    const id = crypto.randomUUID()
    try {
      const { pageCount, pageSizes } = await renderer.load(id, bytes, password)
      const previous = useDocStore.getState().doc
      useDocStore.getState().openSource({
        id,
        name,
        bytes,
        pageCount,
        pageSizes,
        encrypted: password !== undefined,
      })
      if (previous) {
        for (const sourceId of Object.keys(previous.sources)) void renderer.destroy(sourceId)
      }
      setPending(null)
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        setPending((prev) => ({
          name,
          bytes,
          incorrect: err.incorrect,
          attempt: (prev?.attempt ?? 0) + 1,
        }))
        return
      }
      setPending(null)
      useToastStore.getState().show(t.errLoad(err instanceof Error ? err.message : String(err)))
    }
  }, [])

  const openFile = useCallback(
    async (file: File) => {
      if (useDocStore.getState().dirty && !window.confirm(t.unsavedConfirm)) return
      setBusy(true)
      try {
        const bytes = await readPdfFile(file)
        await load(file.name, bytes)
      } catch (err) {
        const message = err instanceof FileValidationError ? err.message : t.errLoad(String(err))
        useToastStore.getState().show(message)
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  const submitPassword = useCallback(
    async (password: string) => {
      if (!pending) return
      setBusy(true)
      try {
        await load(pending.name, pending.bytes, password)
      } finally {
        setBusy(false)
      }
    },
    [load, pending],
  )

  const cancelPassword = useCallback(() => setPending(null), [])

  return { busy, pending, openFile, submitPassword, cancelPassword }
}
