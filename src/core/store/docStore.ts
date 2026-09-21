import { create } from 'zustand'
import {
  checkDelete,
  clearSelection,
  createDoc,
  deletePages,
  redo,
  selectAll,
  selectRange,
  setActivePage,
  toggleSelected,
  undo,
  type DeleteCheck,
} from '../model/doc'
import type { DocState, Source } from '../model/types'

export type Zoom = 'fit' | number

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const

interface ScrollRequest {
  pageId: string
  /** Bumped on every request so repeating the same target still fires. */
  nonce: number
}

interface DocStore {
  doc: DocState | null
  /** Unsaved edits exist (cleared after a successful download). */
  dirty: boolean
  zoom: Zoom
  scrollRequest: ScrollRequest | null

  openSource: (source: Source) => void
  closeDoc: () => void
  goToPage: (pageId: string) => void
  /** Updates the active page from scrolling, without requesting a scroll. */
  setActiveFromScroll: (pageId: string) => void
  deletePages: (ids: readonly string[]) => DeleteCheck
  undo: () => void
  redo: () => void
  toggleSelected: (id: string) => void
  selectRange: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  markSaved: () => void
  setZoom: (zoom: Zoom) => void
}

let nonce = 0

export const useDocStore = create<DocStore>((set, get) => {
  /** Applies a model transition and, if the active page changed, scrolls to it. */
  const apply = (fn: (d: DocState) => DocState, opts: { edit?: boolean } = {}) => {
    const { doc } = get()
    if (!doc) return
    const next = fn(doc)
    if (next === doc) return
    const activeChanged = next.activePageId !== doc.activePageId
    set({
      doc: next,
      dirty: opts.edit ? true : get().dirty,
      scrollRequest:
        activeChanged && next.activePageId
          ? { pageId: next.activePageId, nonce: ++nonce }
          : get().scrollRequest,
    })
  }

  return {
    doc: null,
    dirty: false,
    zoom: 'fit',
    scrollRequest: null,

    openSource: (source) => {
      const doc = createDoc(source)
      set({
        doc,
        dirty: false,
        scrollRequest: doc.activePageId ? { pageId: doc.activePageId, nonce: ++nonce } : null,
      })
    },
    closeDoc: () => set({ doc: null, dirty: false, scrollRequest: null }),

    goToPage: (pageId) => {
      const { doc } = get()
      if (!doc) return
      const next = { ...setActivePage(doc, pageId), selectionAnchor: pageId }
      set({ doc: next, scrollRequest: { pageId, nonce: ++nonce } })
    },
    setActiveFromScroll: (pageId) => {
      const { doc } = get()
      if (!doc) return
      const next = setActivePage(doc, pageId)
      if (next !== doc) set({ doc: next })
    },

    deletePages: (ids) => {
      const { doc } = get()
      if (!doc) return 'nothing'
      const check = checkDelete(doc, ids)
      if (check === 'ok') apply((d) => deletePages(d, ids), { edit: true })
      return check
    },
    undo: () => apply(undo, { edit: true }),
    redo: () => apply(redo, { edit: true }),

    toggleSelected: (id) => apply((d) => toggleSelected(d, id)),
    selectRange: (id) => apply((d) => selectRange(d, id)),
    selectAll: () => apply(selectAll),
    clearSelection: () => apply(clearSelection),

    markSaved: () => set({ dirty: false }),
    setZoom: (zoom) => set({ zoom }),
  }
})
