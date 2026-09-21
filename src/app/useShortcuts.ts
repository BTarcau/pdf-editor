import { useEffect } from 'react'
import { useDocStore } from '../core/store/docStore'
import { deletePagesWithFeedback } from '../features/sidebar/deleteActions'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Global keyboard shortcuts: Delete removes selected pages; Ctrl/Cmd+Z / Shift+Z undo/redo. */
export function useShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      // Checkboxes are inputs but shouldn't swallow page shortcuts.
      const typing = isTypingTarget(e.target) && (e.target as HTMLInputElement).type !== 'checkbox'
      if (typing) return
      const mod = e.metaKey || e.ctrlKey
      const store = useDocStore.getState()

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        store.redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        const selection = store.doc?.selection ?? []
        if (selection.length > 0) {
          e.preventDefault()
          deletePagesWithFeedback(selection)
        }
      } else if (e.key === 'Escape') {
        store.clearSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
