import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'

const TOOL = 'tests/helpers/pdfTool.mjs'
const pageWidth = (index: number) => 200 + index * 10

function makePdf(pageCount: number): Buffer {
  return Buffer.from(execFileSync('node', [TOOL, 'make', String(pageCount)]).toString(), 'base64')
}

async function openPdf(page: Page, pageCount: number) {
  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(pageCount),
  })
  await expect(page.getByRole('heading', { name: /Pages/ })).toContainText(`(${pageCount})`)
}

const thumbs = (page: Page) => page.locator('[data-thumb-btn]')

async function download(page: Page): Promise<number[]> {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(dl.suggestedFilename()).toBe('sample-edited.pdf')
  return JSON.parse(execFileSync('node', [TOOL, 'widths', (await dl.path())!]).toString())
}

test('shows the drop zone and privacy note before a file is opened', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Drop a PDF here')).toBeVisible()
  await expect(page.getByText(/never leaves your device/)).toBeVisible()
})

test('renders thumbnails and the main view after upload', async ({ page }) => {
  await openPdf(page, 5)
  await expect(thumbs(page)).toHaveCount(5)
  await expect(page.locator('[data-page-id] canvas').first()).toBeVisible()
  await expect(page.locator('aside img').first()).toBeVisible()
})

test('deletes a page, undoes it, then deletes again and downloads the result', async ({ page }) => {
  await openPdf(page, 5)

  await page.getByRole('button', { name: 'Delete page 2' }).click({ force: true })
  await expect(thumbs(page)).toHaveCount(4)
  await expect(page.getByRole('status')).toContainText('Deleted 1 page')

  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(thumbs(page)).toHaveCount(5)

  await page.getByRole('button', { name: 'Delete page 2' }).click({ force: true })
  await expect(thumbs(page)).toHaveCount(4)

  expect(await download(page)).toEqual([0, 2, 3, 4].map(pageWidth))
})

test('deletes multiple selected pages with the keyboard', async ({ page }) => {
  await openPdf(page, 6)
  await page.getByLabel('Select page 2').check()
  await page.getByLabel('Select page 4').check()
  await page.getByLabel('Select page 5').check()
  await expect(page.getByRole('button', { name: 'Delete 3 selected' })).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(thumbs(page)).toHaveCount(3)
  expect(await download(page)).toEqual([0, 2, 5].map(pageWidth))

  // Ctrl+Z restores them.
  await page.keyboard.press('ControlOrMeta+z')
  await expect(thumbs(page)).toHaveCount(6)
})

test('refuses to delete every page', async ({ page }) => {
  await openPdf(page, 2)
  await page.getByRole('button', { name: 'Select all' }).click()
  await page.getByRole('button', { name: 'Delete 2 selected' }).click()
  await expect(page.getByRole('status')).toContainText('at least one page')
  await expect(thumbs(page)).toHaveCount(2)
})

test('rejects files that are not PDFs', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('definitely not a pdf'),
  })
  await expect(page.getByRole('status')).toContainText('does not look like a PDF')
  await expect(page.getByText('Drop a PDF here')).toBeVisible()
})

test('never sends the PDF over the network', async ({ page }) => {
  const posts: string[] = []
  page.on('request', (r) => {
    if (r.method() !== 'GET' || r.postData()) posts.push(`${r.method()} ${r.url()}`)
  })
  await openPdf(page, 3)
  await page.getByRole('button', { name: 'Delete page 1' }).click({ force: true })
  await download(page)
  expect(posts).toEqual([])
})

test('runs cleanly under the production Content-Security-Policy', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
    )
  })
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")

  await openPdf(page, 3)
  await expect(page.locator('[data-page-id] canvas').first()).toBeVisible()
  await expect(page.locator('aside img').first()).toBeVisible()
  await page.getByRole('button', { name: 'Delete page 1' }).click({ force: true })
  await download(page)
  expect(problems).toEqual([])
})
