import { useRef } from 'react'
import { Button } from '../components/Button'
import {
  DownloadIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from '../components/icons'
import { canRedo, canUndo } from '../core/model/doc'
import { ZOOM_STEPS, useDocStore, type Zoom } from '../core/store/docStore'
import { t } from '../strings'

interface Props {
  onToggleSidebar: () => void
  onOpenFile: (file: File) => void
  onDownload: () => void
  downloading: boolean
  canEdit: boolean
}

const ZOOM_PRESETS = [0.5, 0.75, 0.85, 1] as const

const zoomValue = (zoom: Zoom): string => String(zoom)
const parseZoom = (value: string): Zoom =>
  value === 'fit' || value === 'page' ? value : Number(value)

function stepZoom(zoom: Zoom, direction: 1 | -1): number {
  const current = typeof zoom === 'number' ? zoom : 1
  if (direction === 1)
    return ZOOM_STEPS.find((z) => z > current + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]!
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? ZOOM_STEPS[0]!
}

export function TopBar({ onToggleSidebar, onOpenFile, onDownload, downloading, canEdit }: Props) {
  const doc = useDocStore((s) => s.doc)
  const zoom = useDocStore((s) => s.zoom)
  const setZoom = useDocStore((s) => s.setZoom)
  const undo = useDocStore((s) => s.undo)
  const redo = useDocStore((s) => s.redo)
  const inputRef = useRef<HTMLInputElement>(null)
  if (!doc) return null

  const name = Object.values(doc.sources)[0]?.name ?? ''

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-900">
      <Button
        variant="ghost"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label={t.toggleSidebar}
      >
        <MenuIcon />
      </Button>
      <span className="hidden text-sm font-semibold sm:inline">{t.appName}</span>
      <span
        className="mx-2 min-w-0 flex-1 truncate text-sm text-neutral-600 dark:text-neutral-400"
        title={name}
      >
        {name}
      </span>

      {canEdit && (
        <>
          <Button
            variant="ghost"
            onClick={undo}
            disabled={!canUndo(doc)}
            aria-label={t.undo}
            title={`${t.undo} (Ctrl/⌘+Z)`}
          >
            <UndoIcon />
          </Button>
          <Button
            variant="ghost"
            onClick={redo}
            disabled={!canRedo(doc)}
            aria-label={t.redo}
            title={`${t.redo} (Ctrl/⌘+Shift+Z)`}
          >
            <RedoIcon />
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
        </>
      )}

      <div className="hidden items-center gap-0.5 sm:flex">
        <Button
          variant="ghost"
          onClick={() => setZoom(stepZoom(zoom, -1))}
          aria-label={t.zoomOut}
          title={t.zoomOut}
        >
          <MinusIcon />
        </Button>
        <select
          aria-label={t.zoomLevel}
          title={t.zoomLevel}
          value={zoomValue(zoom)}
          onChange={(e) => setZoom(parseZoom(e.target.value))}
          className="rounded border-0 bg-transparent py-1 pr-1 pl-1 text-xs tabular-nums hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-neutral-800"
        >
          {ZOOM_PRESETS.map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)}%
            </option>
          ))}
          <option value="fit">{t.fitWidth}</option>
          <option value="page">{t.fitPage}</option>
          {/* A level reached with +/- that isn't one of the presets. */}
          {typeof zoom === 'number' && !ZOOM_PRESETS.some((z) => z === zoom) && (
            <option value={zoom}>{Math.round(zoom * 100)}%</option>
          )}
        </select>
        <Button
          variant="ghost"
          onClick={() => setZoom(stepZoom(zoom, 1))}
          aria-label={t.zoomIn}
          title={t.zoomIn}
        >
          <PlusIcon />
        </Button>
      </div>

      <span className="mx-1 hidden h-5 w-px bg-neutral-300 sm:block dark:bg-neutral-700" />
      <Button className="max-sm:hidden" onClick={() => inputRef.current?.click()}>
        {t.openAnother}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onOpenFile(file)
          e.target.value = ''
        }}
      />
      <Button variant="primary" onClick={onDownload} disabled={!canEdit || downloading}>
        <DownloadIcon />
        <span className="hidden sm:inline">{downloading ? t.building : t.download}</span>
      </Button>
    </header>
  )
}
