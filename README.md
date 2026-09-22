# PDF Editor

[![CI](https://github.com/BTarcau/pdf-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/BTarcau/pdf-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A free, open-source PDF editor that runs **entirely in your browser**. Your files are never uploaded; there is no server that sees them.

## Features (Phase 1)

- Open a PDF by drag-and-drop or file picker (password-protected PDFs open for viewing)
- Scrollable main viewer with zoom and fit-to-width
- Thumbnail sidebar synced with the viewer
- Delete pages: per-thumbnail trash button, or multi-select (click checkboxes, Shift-click ranges) and `Delete`
- Undo / redo (`Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z`)
- Download the edited PDF. Deleted pages are truly removed from the file, not just hidden
- Responsive layout, dark mode, keyboard accessible

Coming next: reorder, rotate, insert and merge pages, form filling and signatures. See the [roadmap](docs/ROADMAP.md).

## Privacy

- No uploads, no backend, no cookies, no analytics, no third-party requests.
- A strict Content-Security-Policy is applied in production ([`public/_headers`](public/_headers)).
- See [`public/privacy.html`](public/privacy.html).

## Development

Requires Node 22+.

```bash
npm install
npm run dev            # http://localhost:5173
npm run typecheck
npm run lint
npm test               # unit tests (Vitest)
npm run test:e2e       # end-to-end (Playwright; first: npx playwright install chromium)
npm run build && npm run preview
```

The architecture is designed so later features are additive. Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploying

The build output (`dist/`) is fully static. [Cloudflare Pages](https://pages.cloudflare.com/) is the recommended host because it applies `public/_headers` (the CSP).

- Framework preset: **Vite** (or None)
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: **22** (set via `.nvmrc`, or the `NODE_VERSION` environment variable if Cloudflare doesn't pick it up automatically)

GitHub Pages also works but cannot set security headers.

## Known limitations

- Password-protected PDFs can be viewed but not edited or downloaded yet.
- Exported PDFs are rebuilt page by page, so document-level bookmarks/outlines, tags and interactive form field definitions aren't carried over.
- Files over 200 MB are rejected; browser memory is the real limit.

## License

[MIT](LICENSE). Built on [pdf.js](https://github.com/mozilla/pdf.js) (Apache-2.0) and [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT).
