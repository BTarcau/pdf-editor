# Contributing

Thanks for helping out! This is a small, privacy-first project: **PDFs must never be uploaded anywhere**. Please don't add server calls, third-party scripts, or analytics that would change that.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires Node 22+.

## Before opening a PR

```bash
npm run format       # Prettier
npm run typecheck
npm run lint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright (first time: npx playwright install chromium)
```

## Guidelines

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. Edits go through the pure model in `src/core/model`; PDF bytes are turned back into a file in exactly one place, `src/features/export/buildPdf.ts`.
- Put user-facing text in `src/strings.ts`.
- Add a unit test for model changes and an e2e test for user-visible flows.
- Keep features in their own folder under `src/features/`.
- Check [docs/ROADMAP.md](docs/ROADMAP.md) before proposing new features.
