import { useEffect, useState } from 'react'
import { UploadIcon } from '../components/icons'
import { t } from '../strings'

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/** Lets a PDF be dropped anywhere on the page while a document is open. */
export function GlobalDropTarget({ onFile }: { onFile: (file: File) => void }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    // dragenter/dragleave fire for every child element, so count depth.
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setActive(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      const file = e.dataTransfer?.files[0]
      if (file) onFile(file)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [onFile])

  if (!active) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-600/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-blue-500 bg-white/90 px-12 py-10 text-lg font-semibold dark:bg-neutral-900/90">
        <UploadIcon width={36} height={36} className="text-blue-600" />
        {t.dropActive}
      </div>
    </div>
  )
}
