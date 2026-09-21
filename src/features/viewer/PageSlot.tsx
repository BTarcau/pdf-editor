import { useEffect, useRef, type RefObject } from 'react'
import { useNearViewport } from '../../components/useNearViewport'
import type { PageRef, PageSize } from '../../core/model/types'
import { renderer } from '../../core/pdf/PdfRenderer'
import { t } from '../../strings'

/** Keep any single canvas under this many pixels; iOS Safari caps around 16M. */
const MAX_CANVAS_PIXELS = 16_000_000

interface Props {
  page: PageRef
  number: number
  total: number
  size: PageSize
  scale: number
  scrollRoot: RefObject<HTMLElement | null>
}

function pixelRatioFor(width: number, height: number): number {
  let ratio = Math.min(window.devicePixelRatio || 1, 2)
  while (width * height * ratio * ratio > MAX_CANVAS_PIXELS && ratio > 0.25) ratio *= 0.85
  return ratio
}

export function PageSlot({ page, number, total, size, scale, scrollRoot }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const near = useNearViewport(frameRef, scrollRoot, '1200px 0px')

  const rotated = page.rotation === 90 || page.rotation === 270
  const cssWidth = (rotated ? size.height : size.width) * scale
  const cssHeight = (rotated ? size.width : size.height) * scale

  useEffect(() => {
    const canvas = canvasRef.current
    if (!near || !canvas) return
    const handle = renderer.render(
      page.sourceId,
      page.sourcePageIndex,
      page.rotation,
      canvas,
      scale,
      pixelRatioFor(cssWidth, cssHeight),
    )
    handle.done.catch(() => {
      // Leave the placeholder in place if a page fails to render.
    })
    return () => handle.cancel()
  }, [near, page.sourceId, page.sourcePageIndex, page.rotation, scale, cssWidth, cssHeight])

  return (
    <div className="flex flex-col items-center gap-1.5" data-page-id={page.id}>
      <div
        ref={frameRef}
        role="img"
        aria-label={t.pageOf(number, total)}
        className="overflow-hidden bg-white shadow-md ring-1 ring-black/10"
        style={{ width: cssWidth, height: cssHeight }}
      >
        {near && <canvas ref={canvasRef} className="block h-full w-full" />}
      </div>
      <span className="text-xs text-neutral-500 tabular-nums">{number}</span>
    </div>
  )
}
