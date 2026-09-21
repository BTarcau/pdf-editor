# Roadmap

Phases are guidelines; items can move between phases without affecting the others. Each phase builds on the architecture in [ARCHITECTURE.md](ARCHITECTURE.md) rather than changing it.

## Phase 1: View & Delete (done)

Upload (picker + drag-and-drop), main viewer, thumbnail sidebar, delete single/multiple pages, undo/redo, download.

## Phase 2: Organize pages

Insert, reorder and merge share the same page list and sidebar UI, so they ship together.

- Drag-and-drop reorder in the sidebar (`@dnd-kit`)
- Rotate pages (`PageRef.rotation` and `buildPdf` already support it)
- Insert blank page
- Merge / insert pages from other PDFs (multiple `Source`s, page-range picker)
- Extract / split selected pages into a new PDF
- Duplicate page
- Image (JPG/PNG) to PDF page

## Phase 3: Fill & Sign

Form filling and signatures are both annotations on a page that get flattened at export, so one annotation system serves both.

- AcroForm field filling (pdf.js reads fields, overlay inputs, `pdf-lib` form API on export)
- Free text, date, checkmark stamps
- Signature box: draw / type / upload image, stored locally (IndexedDB, never uploaded), draggable and resizable, flattened on export
- Out of scope: cryptographic/digital signatures

## Phase 4: Markup & optimize

- Highlight, freehand draw, shapes
- Redaction that truly removes the underlying content (needs careful testing)
- Page numbers, watermark
- File-size compression
- Document metadata editing

## Phase 5: Reach & polish

- PWA / offline install
- Translations (all copy is already in `src/strings.ts`)
- Search in document, print
- Keyboard shortcut help, accessibility audit
- Optional cookieless analytics

## Known limitations today

- Password-protected PDFs can be opened and viewed (with the password) but not edited or downloaded.
- Exported PDFs are rebuilt page by page, so document-level bookmarks/outlines, tags and interactive form field definitions are not carried over.
- Very large files are limited by browser memory (200 MB hard limit).
