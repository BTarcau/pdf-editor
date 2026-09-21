export type SourceId = string

export interface PageSize {
  /** Width in PDF points at scale 1, including the page's intrinsic rotation. */
  width: number
  height: number
}

/** An uploaded PDF. Its bytes are immutable for the lifetime of the session. */
export interface Source {
  id: SourceId
  name: string
  bytes: Uint8Array
  pageCount: number
  pageSizes: PageSize[]
  /** Opened with a password. Viewable, but not editable/exportable yet. */
  encrypted: boolean
}

/**
 * Placeholder for Phase 3 (form fills, text, signatures). Coordinates will be
 * stored in PDF page points so they are independent of zoom.
 */
export interface Annotation {
  id: string
  kind: string
}

export type Rotation = 0 | 90 | 180 | 270

/** One entry per page of the *output* document. */
export interface PageRef {
  id: string
  sourceId: SourceId
  sourcePageIndex: number
  rotation: Rotation
  annotations: Annotation[]
}

export interface DocState {
  sources: Record<SourceId, Source>
  /** The edit list: the output document is these pages, in this order. */
  pages: PageRef[]
  selection: string[]
  /** Anchor for shift-click range selection. */
  selectionAnchor: string | null
  activePageId: string | null
  history: { past: PageRef[][]; future: PageRef[][] }
}
