import { useEffect, useState } from 'react'
import { Toast } from '../components/Toast'
import { useToastStore } from '../components/toastStore'
import { useDocStore } from '../core/store/docStore'
import { downloadBytes, editedFileName, exportPdf } from '../features/export/exportPdf'
import { Sidebar } from '../features/sidebar/Sidebar'
import { DropZone } from '../features/upload/DropZone'
import { PasswordDialog } from '../features/upload/PasswordDialog'
import { useOpenPdf } from '../features/upload/useOpenPdf'
import { MainViewer } from '../features/viewer/MainViewer'
import { t } from '../strings'
import { GlobalDropTarget } from './GlobalDropTarget'
import { TopBar } from './TopBar'
import { useShortcuts } from './useShortcuts'

export function App() {
  const doc = useDocStore((s) => s.doc)
  const dirty = useDocStore((s) => s.dirty)
  const { busy, pending, openFile, submitPassword, cancelPassword } = useOpenPdf()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const canEdit = doc !== null && !Object.values(doc.sources).some((s) => s.encrypted)
  useShortcuts(canEdit)

  // Warn before the tab closes with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const download = async () => {
    const state = useDocStore.getState()
    if (!state.doc || downloading) return
    setDownloading(true)
    try {
      const bytes = await exportPdf(state.doc.sources, state.doc.pages)
      const first = Object.values(state.doc.sources)[0]
      downloadBytes(bytes, editedFileName(first?.name ?? 'document'))
      state.markSaved()
    } catch (err) {
      useToastStore.getState().show(t.errExport(err instanceof Error ? err.message : String(err)))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      {doc ? (
        <>
          <TopBar
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onOpenFile={openFile}
            onDownload={download}
            downloading={downloading}
            canEdit={canEdit}
          />
          {!canEdit && (
            <p
              role="status"
              className="bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {t.readOnlyBanner}
            </p>
          )}
          <div className="flex min-h-0 flex-1">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} canEdit={canEdit} />
            <MainViewer />
          </div>
          <GlobalDropTarget onFile={openFile} />
        </>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-auto px-4 py-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{t.appName}</h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">{t.tagline}</p>
          </div>
          <DropZone onFile={openFile} busy={busy} />
          <footer className="text-xs text-neutral-500">
            {t.footerNote} ·{' '}
            <a
              className="underline hover:text-neutral-700 dark:hover:text-neutral-300"
              href="https://github.com/BTarcau/pdf-editor"
              target="_blank"
              rel="noreferrer"
            >
              {t.githubLabel}
            </a>{' '}
            ·{' '}
            <a
              className="underline hover:text-neutral-700 dark:hover:text-neutral-300"
              href="/privacy.html"
            >
              {t.privacyLabel}
            </a>
          </footer>
        </main>
      )}
      <PasswordDialog
        pending={pending}
        busy={busy}
        onSubmit={submitPassword}
        onCancel={cancelPassword}
      />
      <Toast />
    </div>
  )
}
