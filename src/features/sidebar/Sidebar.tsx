import { useRef } from 'react'
import { Button } from '../../components/Button'
import { PinIcon, TrashIcon } from '../../components/icons'
import { useDocStore } from '../../core/store/docStore'
import { t } from '../../strings'
import { deletePagesWithFeedback } from './deleteActions'
import { Thumbnail } from './Thumbnail'

interface Props {
  open: boolean
  pinned: boolean
  onClose: () => void
  onTogglePin: () => void
  canEdit: boolean
}

export function Sidebar({ open, pinned, onClose, onTogglePin, canEdit }: Props) {
  const doc = useDocStore((s) => s.doc)
  const selectAll = useDocStore((s) => s.selectAll)
  const clearSelection = useDocStore((s) => s.clearSelection)
  const listRef = useRef<HTMLDivElement>(null)
  if (!doc) return null

  const selected = new Set(doc.selection)

  return (
    <>
      {open && !pinned && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label={t.pages}
        onClick={(e) => {
          // An unpinned drawer closes once a page is chosen, but not while multi-selecting.
          const plain = !(e.shiftKey || e.ctrlKey || e.metaKey)
          if (open && !pinned && plain && (e.target as HTMLElement).closest('[data-thumb-btn]')) {
            onClose()
          }
        }}
        className={
          'flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 ' +
          'dark:border-neutral-800 dark:bg-neutral-900 md:static md:translate-x-0 ' +
          (pinned
            ? 'static'
            : 'fixed inset-y-0 left-0 z-30 transition-transform ' +
              (open ? 'translate-x-0' : '-translate-x-full'))
        }
      >
        <div className="flex h-12 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold whitespace-nowrap">
            {t.pages} <span className="font-normal text-neutral-500">({doc.pages.length})</span>
          </h2>
          <button
            type="button"
            onClick={onTogglePin}
            aria-pressed={pinned}
            aria-label={pinned ? t.unpinSidebar : t.pinSidebar}
            title={pinned ? t.unpinSidebar : t.pinSidebar}
            className={
              'rounded p-1.5 focus-visible:outline-2 focus-visible:outline-blue-500 md:hidden ' +
              (pinned
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800')
            }
          >
            <PinIcon filled={pinned} />
          </button>
          {canEdit && (
            <div className="flex gap-1 text-xs whitespace-nowrap">
              <button
                type="button"
                onClick={selectAll}
                className="rounded px-1.5 py-1 text-blue-700 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:bg-neutral-800"
              >
                {t.selectAll}
              </button>
              {doc.selection.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded px-1.5 py-1 text-blue-700 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:bg-neutral-800"
                >
                  {t.clearSelection}
                </button>
              )}
            </div>
          )}
        </div>

        {canEdit && doc.selection.length > 0 && (
          <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
            <Button
              variant="danger"
              className="w-full"
              onClick={() => deletePagesWithFeedback(doc.selection)}
            >
              <TrashIcon />
              {t.deleteSelected(doc.selection.length)}
            </Button>
          </div>
        )}

        {canEdit && (
          <p className="border-b border-neutral-200 px-3 py-1.5 text-[11px] leading-snug text-neutral-500 dark:border-neutral-800">
            {t.selectHint}
          </p>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          <ol className="flex flex-col gap-1">
            {doc.pages.map((page, i) => {
              const size = doc.sources[page.sourceId]!.pageSizes[page.sourcePageIndex]!
              return (
                <Thumbnail
                  key={page.id}
                  page={page}
                  number={i + 1}
                  size={size}
                  selected={selected.has(page.id)}
                  active={doc.activePageId === page.id}
                  canEdit={canEdit}
                  scrollRoot={listRef}
                />
              )
            })}
          </ol>
        </div>
      </aside>
    </>
  )
}
