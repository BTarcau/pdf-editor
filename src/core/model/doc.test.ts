import { beforeEach, describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
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
} from './doc'
import type { DocState, Source } from './types'

function makeSource(pageCount: number): Source {
  return {
    id: 's1',
    name: 'test.pdf',
    bytes: new Uint8Array(),
    pageCount,
    pageSizes: Array.from({ length: pageCount }, () => ({
      width: 100,
      height: 100,
    })),
    encrypted: false,
  }
}

const indexes = (s: DocState) => s.pages.map((p) => p.sourcePageIndex)

describe('doc model', () => {
  let doc: DocState
  beforeEach(() => {
    doc = createDoc(makeSource(5))
  })

  it('creates one PageRef per source page with unique ids', () => {
    expect(indexes(doc)).toEqual([0, 1, 2, 3, 4])
    expect(new Set(doc.pages.map((p) => p.id)).size).toBe(5)
    expect(doc.activePageId).toBe(doc.pages[0]!.id)
  })

  describe('deletePages', () => {
    it('deletes a single page', () => {
      const next = deletePages(doc, [doc.pages[2]!.id])
      expect(indexes(next)).toEqual([0, 1, 3, 4])
    })

    it('deletes multiple non-contiguous pages', () => {
      const next = deletePages(doc, [doc.pages[0]!.id, doc.pages[4]!.id, doc.pages[2]!.id])
      expect(indexes(next)).toEqual([1, 3])
    })

    it('refuses to delete every page', () => {
      expect(
        checkDelete(
          doc,
          doc.pages.map((p) => p.id),
        ),
      ).toBe('would-empty')
      expect(
        deletePages(
          doc,
          doc.pages.map((p) => p.id),
        ),
      ).toBe(doc)
    })

    it('ignores unknown ids', () => {
      expect(checkDelete(doc, ['nope'])).toBe('nothing')
      expect(deletePages(doc, ['nope'])).toBe(doc)
    })

    it('never mutates the previous state', () => {
      const before = [...doc.pages]
      deletePages(doc, [doc.pages[1]!.id])
      expect(doc.pages).toEqual(before)
    })

    it('drops deleted pages from the selection and moves the active page', () => {
      let s = setActivePage(doc, doc.pages[2]!.id)
      s = toggleSelected(s, doc.pages[2]!.id)
      s = toggleSelected(s, doc.pages[3]!.id)
      const next = deletePages(s, [doc.pages[2]!.id])
      expect(next.selection).toEqual([doc.pages[3]!.id])
      expect(next.activePageId).toBe(doc.pages[3]!.id) // the page that took its place
    })

    it('falls back to the last page when the tail is deleted', () => {
      const s = setActivePage(doc, doc.pages[4]!.id)
      const next = deletePages(s, [doc.pages[4]!.id])
      expect(next.activePageId).toBe(doc.pages[3]!.id)
    })
  })

  describe('history', () => {
    it('undoes and redoes a delete', () => {
      const deleted = deletePages(doc, [doc.pages[1]!.id])
      expect(canUndo(deleted)).toBe(true)
      expect(canRedo(deleted)).toBe(false)

      const undone = undo(deleted)
      expect(indexes(undone)).toEqual([0, 1, 2, 3, 4])
      expect(canRedo(undone)).toBe(true)

      const redone = redo(undone)
      expect(indexes(redone)).toEqual([0, 2, 3, 4])
    })

    it('clears the redo stack on a new edit', () => {
      const a = deletePages(doc, [doc.pages[0]!.id])
      const b = undo(a)
      const c = deletePages(b, [b.pages[3]!.id])
      expect(canRedo(c)).toBe(false)
    })

    it('is a no-op when there is nothing to undo/redo', () => {
      expect(undo(doc)).toBe(doc)
      expect(redo(doc)).toBe(doc)
    })

    it('restores PageRef identity on undo so thumbnails can be reused', () => {
      const target = doc.pages[1]!
      const undone = undo(deletePages(doc, [target.id]))
      expect(undone.pages[1]).toBe(target)
    })
  })

  describe('selection', () => {
    it('toggles pages and records the anchor', () => {
      const id = doc.pages[1]!.id
      const on = toggleSelected(doc, id)
      expect(on.selection).toEqual([id])
      expect(on.selectionAnchor).toBe(id)
      expect(toggleSelected(on, id).selection).toEqual([])
    })

    it('selects an inclusive range from the anchor in either direction', () => {
      const anchored = toggleSelected(doc, doc.pages[1]!.id)
      expect(selectRange(anchored, doc.pages[3]!.id).selection).toEqual(
        doc.pages.slice(1, 4).map((p) => p.id),
      )
      const reversed = toggleSelected(doc, doc.pages[3]!.id)
      expect(selectRange(reversed, doc.pages[1]!.id).selection).toEqual(
        doc.pages.slice(1, 4).map((p) => p.id),
      )
    })

    it('selects all and clears', () => {
      const all = selectAll(doc)
      expect(all.selection).toHaveLength(5)
      expect(clearSelection(all).selection).toEqual([])
    })
  })
})
