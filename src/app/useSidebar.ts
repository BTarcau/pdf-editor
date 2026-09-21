import { useCallback, useEffect, useState } from 'react'

const PINNED_KEY = 'pdf-editor:sidebar-pinned'

function readPinned(): boolean {
  try {
    return localStorage.getItem(PINNED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Page-list sidebar state. On wide screens it's always docked; on narrow ones
 * it's a slide-out drawer that can be pinned open (remembered across visits).
 */
export function useSidebar() {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(readPinned)

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_KEY, pinned ? '1' : '0')
    } catch {
      // Storage can be unavailable (private mode); pinning just won't persist.
    }
  }, [pinned])

  const close = useCallback(() => setOpen(false), [])
  const togglePin = useCallback(() => {
    setPinned((p) => !p)
    setOpen(false)
  }, [])
  /** The top-bar button: opens/closes the drawer, or hides it if it's pinned. */
  const toggle = useCallback(() => {
    if (pinned) setPinned(false)
    setOpen((o) => (pinned ? false : !o))
  }, [pinned])

  return { open, pinned, close, togglePin, toggle }
}
