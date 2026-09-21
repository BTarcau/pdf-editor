import { useEffect, useRef, useState } from 'react'
import { useDocStore } from '../../core/store/docStore'
import { PageSlot } from './PageSlot'

/** Horizontal gray margin around a fitted page: the wrapper's px-4 on each side. */
const PADDING_X = 32
/** Vertical room around a fitted page: py-4 above and below plus the page-number label. */
const PADDING_Y = 56
const MAX_FIT_SCALE = 3
/** After a programmatic scroll, ignore scroll-derived active-page updates briefly. */
const SUPPRESS_MS = 250

export function MainViewer() {
  const doc = useDocStore((s) => s.doc)
  const zoom = useDocStore((s) => s.zoom)
  const scrollRequest = useDocStore((s) => s.scrollRequest)
  const setActiveFromScroll = useDocStore((s) => s.setActiveFromScroll)
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressUntil = useRef(0)
  const [container, setContainer] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setContainer({
        width: entry?.contentRect.width ?? 0,
        height: entry?.contentRect.height ?? 0,
      }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Scroll to the page the sidebar/store asked for.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !scrollRequest) return
    const el = container.querySelector<HTMLElement>(`[data-page-id="${scrollRequest.pageId}"]`)
    if (!el) return
    suppressUntil.current = performance.now() + SUPPRESS_MS
    const top =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
    container.scrollTo({ top: top - 12 })
  }, [scrollRequest])

  // Derive the active page from the scroll position.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let frame = 0
    const update = () => {
      frame = 0
      if (performance.now() < suppressUntil.current) return
      const probe = container.getBoundingClientRect().top + container.clientHeight * 0.3
      let current: string | null = null
      for (const el of container.querySelectorAll<HTMLElement>('[data-page-id]')) {
        if (el.getBoundingClientRect().top <= probe) current = el.dataset.pageId ?? current
        else break
      }
      if (current) setActiveFromScroll(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [setActiveFromScroll])

  if (!doc) return null

  const sizeOf = (i: number) => {
    const page = doc.pages[i]!
    const size = doc.sources[page.sourceId]!.pageSizes[page.sourcePageIndex]!
    return page.rotation === 90 || page.rotation === 270
      ? { width: size.height, height: size.width }
      : size
  }
  // Fit width sizes each page on its own so every page fills the viewer with the same
  // gray margin on both sides, even when a document mixes page sizes.
  const scaleFor = (i: number) => {
    if (typeof zoom === 'number') return zoom
    const size = sizeOf(i)
    const byWidth = (container.width - PADDING_X) / size.width
    // 'page' also keeps the whole page (plus its number label) within the viewer height.
    const fit =
      zoom === 'page' ? Math.min(byWidth, (container.height - PADDING_Y) / size.height) : byWidth
    return Math.min(MAX_FIT_SCALE, Math.max(0.1, fit))
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-neutral-200 dark:bg-neutral-950"
      tabIndex={-1}
    >
      <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4 px-4 py-4">
        {doc.pages.map((page, i) => (
          <PageSlot
            key={page.id}
            page={page}
            number={i + 1}
            total={doc.pages.length}
            size={doc.sources[page.sourceId]!.pageSizes[page.sourcePageIndex]!}
            scale={scaleFor(i)}
            scrollRoot={containerRef}
          />
        ))}
      </div>
    </div>
  )
}
