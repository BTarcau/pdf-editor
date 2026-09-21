import { useEffect, useRef, useState, type RefObject } from 'react'
import { TrashIcon } from '../../components/icons'
import { useNearViewport } from '../../components/useNearViewport'
import { renderer } from '../../core/pdf/PdfRenderer'
import type { PageRef, PageSize } from '../../core/model/types'
import { useDocStore } from '../../core/store/docStore'
import { t } from '../../strings'
import { deletePagesWithFeedback } from './deleteActions'

export const THUMB_WIDTH = 132

interface Props {
  page: PageRef
  number: number
  size: PageSize
  selected: boolean
  active: boolean
  canEdit: boolean
  scrollRoot: RefObject<HTMLElement | null>
}

function useThumbnailUrl(page: PageRef, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    renderer
      .thumbnail(page.sourceId, page.sourcePageIndex, page.rotation, THUMB_WIDTH, pixelRatio)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {
        // A failed thumbnail just stays as a blank placeholder.
      })
    return () => {
      cancelled = true
    }
  }, [enabled, page.sourceId, page.sourcePageIndex, page.rotation])
  return enabled ? url : null
}

export function Thumbnail({ page, number, size, selected, active, canEdit, scrollRoot }: Props) {
  const ref = useRef<HTMLLIElement>(null)
  const near = useNearViewport(ref, scrollRoot, '400px 0px')
  const url = useThumbnailUrl(page, near)
  const goToPage = useDocStore((s) => s.goToPage)
  const toggleSelected = useDocStore((s) => s.toggleSelected)
  const selectRange = useDocStore((s) => s.selectRange)

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const rotated = page.rotation === 90 || page.rotation === 270
  const aspect = rotated ? size.height / size.width : size.width / size.height

  const onClick = (e: React.MouseEvent) => {
    if (e.shiftKey && canEdit) selectRange(page.id)
    else if ((e.metaKey || e.ctrlKey) && canEdit) toggleSelected(page.id)
    else goToPage(page.id)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const pages = useDocStore.getState().doc?.pages ?? []
    const index = pages.findIndex((p) => p.id === page.id)
    const neighbor = pages[index + (e.key === 'ArrowDown' ? 1 : -1)]
    if (!neighbor) return
    e.preventDefault()
    goToPage(neighbor.id)
    document.querySelector<HTMLElement>(`[data-thumb-btn="${neighbor.id}"]`)?.focus()
  }

  return (
    <li ref={ref} className="group relative">
      <button
        type="button"
        data-thumb-btn={page.id}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={t.page(number)}
        aria-current={active ? 'true' : undefined}
        className={
          'flex w-full flex-col items-center gap-1 rounded-lg p-2 transition-colors ' +
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ' +
          (selected
            ? 'bg-blue-100 dark:bg-blue-950 '
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-800 ') +
          (active ? 'ring-2 ring-blue-500' : '')
        }
      >
        <div
          className="overflow-hidden rounded-sm bg-white shadow ring-1 ring-black/10"
          style={{ width: THUMB_WIDTH, aspectRatio: String(aspect) }}
        >
          {url && <img src={url} alt="" draggable={false} className="h-full w-full" />}
        </div>
        <span className="text-xs text-neutral-600 tabular-nums dark:text-neutral-400">
          {number}
        </span>
      </button>

      {canEdit && (
        <>
          <input
            type="checkbox"
            checked={selected}
            aria-label={t.select(number)}
            onChange={(e) => {
              if ((e.nativeEvent as MouseEvent).shiftKey) selectRange(page.id)
              else toggleSelected(page.id)
            }}
            className={
              'absolute top-3 left-3 h-4 w-4 cursor-pointer accent-blue-600 ' +
              (selected ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')
            }
          />
          <button
            type="button"
            aria-label={t.deletePage(number)}
            title={t.deletePage(number)}
            onClick={() => deletePagesWithFeedback([page.id])}
            className="absolute top-3 right-3 rounded bg-white/90 p-1 text-neutral-700 opacity-0 shadow ring-1 ring-black/10 group-hover:opacity-100 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-neutral-900/90 dark:text-neutral-300"
          >
            <TrashIcon />
          </button>
        </>
      )}
    </li>
  )
}
