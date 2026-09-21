# Architecture

A pure client-side single-page app: Vite + React + TypeScript, `pdfjs-dist` for rendering, `pdf-lib` for producing the output file, Zustand for state, Tailwind for styling. There is no backend; PDFs never leave the browser.

## The core idea: a non-destructive edit list

The uploaded PDF's bytes are never modified while editing. The document being edited is an **ordered list of page references** into immutable sources:

```ts
Source  { id, name, bytes, pageCount, pageSizes, encrypted }   // one per uploaded PDF
PageRef { id, sourceId, sourcePageIndex, rotation, annotations } // one per *output* page
DocState { sources, pages: PageRef[], selection, activePageId, history }
```

Every feature is an operation on this model:

| Feature               | Model operation                                                                  |
| --------------------- | -------------------------------------------------------------------------------- |
| Delete pages          | remove `PageRef`s                                                                |
| Reorder               | reorder `pages`                                                                  |
| Insert / merge        | add a `Source`, splice new `PageRef`s                                            |
| Rotate                | change `rotation`                                                                |
| Form fill / signature | push `Annotation`s (in PDF points, so zoom-independent)                          |
| Undo / redo           | snapshot the `pages` array (cheap: `PageRef`s are shared, sources are immutable) |

## Layers

```
src/core/model    Pure, UI-free reducers (doc.ts) and types. Unit-tested.
src/core/pdf      PdfRenderer: pdf.js wrapper (documents, page + thumbnail rendering, caching, cancellation)
src/core/store    Zustand store wiring the model to the UI (plus scroll requests, zoom, dirty flag)
src/features/*    Vertical slices: upload, viewer, sidebar, export
src/app           App shell, top bar, keyboard shortcuts
src/strings.ts    All user-facing copy (i18n-ready)
```

`core/model` has no React or DOM dependencies. Add new operations there (with tests), expose them through the store, then build UI in a feature folder.

## Rendering

`PdfRenderer` keeps one pdf.js document per source. The main viewer and thumbnails both render through it, so deleting or reordering pages never re-parses a file. Pages and thumbnails render lazily with `IntersectionObserver` and are dropped again when far from the viewport; thumbnails are cached as object URLs in a small LRU. Page sizes are read up front so scrolling layout is stable before any page has rendered.

Canvas size is capped (about 16M pixels) to stay inside mobile browser limits. pdf.js runtime assets (CMaps, standard fonts, wasm decoders) are copied to `public/pdfjs` by `scripts/copy-pdfjs-assets.mjs` and served from our own origin.

## Export

`buildPdf(sourceBytes, pages)` is the only place the model becomes a PDF. It runs in a Web Worker (`export.worker.ts`) so large files don't block the UI. It copies pages into a **new** document rather than deleting from the original: `pdf-lib` does not garbage-collect removed pages, so an in-place delete would leave the "deleted" content inside the downloaded file. This is covered by tests. The trade-off is that document-level outlines/tags aren't carried over.

Later features extend this one function: rotation (already applied), merged sources (already handled: runs of pages are copied per source), and flattening annotations (Phase 3).

## Security & privacy

- No network calls with user data; e2e tests assert no non-GET requests happen during a full flow.
- Strict CSP and other headers in `public/_headers` (also applied to `vite preview`, so e2e tests run under the production policy).
- PDF-embedded JavaScript is never executed.
- Passwords are used only to open a document in-memory.
