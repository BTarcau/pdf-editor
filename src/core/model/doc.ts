import type { DocState, PageRef, Source } from './types'

/** Cap on undo steps; snapshots share PageRef objects so this is cheap. */
export const MAX_HISTORY = 100

export function createDoc(source: Source): DocState {
  const pages: PageRef[] = Array.from({ length: source.pageCount }, (_, i) => ({
    id: crypto.randomUUID(),
    sourceId: source.id,
    sourcePageIndex: i,
    rotation: 0,
    annotations: [],
  }))
  return {
    sources: { [source.id]: source },
    pages,
    selection: [],
    selectionAnchor: null,
    activePageId: pages[0]?.id ?? null,
    history: { past: [], future: [] },
  }
}

/** Replaces the page list, recording the previous list for undo. */
function commit(state: DocState, pages: PageRef[]): DocState {
  const past = [...state.history.past, state.pages].slice(-MAX_HISTORY)
  return { ...state, pages, history: { past, future: [] } }
}

/** Keeps selection/active page valid after the page list changed. */
function reconcile(state: DocState, preferredIndex: number): DocState {
  const ids = new Set(state.pages.map((p) => p.id))
  const selection = state.selection.filter((id) => ids.has(id))
  const anchorValid = state.selectionAnchor !== null && ids.has(state.selectionAnchor)
  let activePageId = state.activePageId
  if (activePageId === null || !ids.has(activePageId)) {
    const fallback = state.pages[Math.min(preferredIndex, state.pages.length - 1)]
    activePageId = fallback?.id ?? null
  }
  return {
    ...state,
    selection,
    selectionAnchor: anchorValid ? state.selectionAnchor : null,
    activePageId,
  }
}

export type DeleteCheck = 'ok' | 'nothing' | 'would-empty'

export function checkDelete(state: DocState, ids: readonly string[]): DeleteCheck {
  const doomed = new Set(ids)
  const count = state.pages.filter((p) => doomed.has(p.id)).length
  if (count === 0) return 'nothing'
  if (count === state.pages.length) return 'would-empty'
  return 'ok'
}

/** Removes the given pages. Returns `state` unchanged if the delete isn't allowed. */
export function deletePages(state: DocState, ids: readonly string[]): DocState {
  if (checkDelete(state, ids) !== 'ok') return state
  const doomed = new Set(ids)
  const firstDoomedIndex = state.pages.findIndex((p) => doomed.has(p.id))
  const pages = state.pages.filter((p) => !doomed.has(p.id))
  return reconcile(commit(state, pages), firstDoomedIndex)
}

export function canUndo(state: DocState): boolean {
  return state.history.past.length > 0
}

export function canRedo(state: DocState): boolean {
  return state.history.future.length > 0
}

export function undo(state: DocState): DocState {
  const { past, future } = state.history
  const previous = past[past.length - 1]
  if (!previous) return state
  const activeIndex = state.pages.findIndex((p) => p.id === state.activePageId)
  return reconcile(
    {
      ...state,
      pages: previous,
      history: { past: past.slice(0, -1), future: [state.pages, ...future] },
    },
    Math.max(activeIndex, 0),
  )
}

export function redo(state: DocState): DocState {
  const { past, future } = state.history
  const next = future[0]
  if (!next) return state
  const activeIndex = state.pages.findIndex((p) => p.id === state.activePageId)
  return reconcile(
    {
      ...state,
      pages: next,
      history: { past: [...past, state.pages], future: future.slice(1) },
    },
    Math.max(activeIndex, 0),
  )
}

export function setActivePage(state: DocState, id: string): DocState {
  if (state.activePageId === id || !state.pages.some((p) => p.id === id)) return state
  return { ...state, activePageId: id }
}

export function toggleSelected(state: DocState, id: string): DocState {
  if (!state.pages.some((p) => p.id === id)) return state
  const selected = state.selection.includes(id)
  return {
    ...state,
    selection: selected ? state.selection.filter((s) => s !== id) : [...state.selection, id],
    selectionAnchor: id,
  }
}

/**
 * Selects every page between the anchor and `id` (inclusive), replacing the selection.
 * The anchor is the last page clicked, or the page being viewed if none was.
 */
export function selectRange(state: DocState, id: string): DocState {
  const to = state.pages.findIndex((p) => p.id === id)
  if (to === -1) return state
  const anchorId = state.selectionAnchor ?? state.activePageId
  const anchorIndex = state.pages.findIndex((p) => p.id === anchorId)
  const from = anchorIndex === -1 ? to : anchorIndex
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  return {
    ...state,
    selection: state.pages.slice(lo, hi + 1).map((p) => p.id),
    selectionAnchor: anchorId ?? id,
  }
}

export function selectAll(state: DocState): DocState {
  return { ...state, selection: state.pages.map((p) => p.id) }
}

export function clearSelection(state: DocState): DocState {
  return state.selection.length === 0 ? state : { ...state, selection: [], selectionAnchor: null }
}
