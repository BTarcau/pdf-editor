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

test('ctrl/cmd-click and shift-click select multiple pages from the thumbnails', async ({
  page,
}) => {
  await openPdf(page, 8)
  const thumb = (n: number) => thumbs(page).nth(n - 1)
  const checked = () => page.locator('aside input[type=checkbox]:checked')

  await thumb(2).click({ modifiers: ['ControlOrMeta'] })
  await thumb(4).click({ modifiers: ['ControlOrMeta'] })
  await thumb(6).click({ modifiers: ['ControlOrMeta'] })
  await expect(checked()).toHaveCount(3)
  await thumb(4).click({ modifiers: ['ControlOrMeta'] })
  await expect(checked()).toHaveCount(2)

  // A plain click moves the range anchor; Shift-click then selects through it.
  await thumb(3).click()
  await thumb(6).click({ modifiers: ['Shift'] })
  await expect(checked()).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Delete 4 selected' })).toBeVisible()

  await page.keyboard.press('Delete')
  expect(await download(page)).toEqual([0, 1, 6, 7].map(pageWidth))
})

test.describe('narrow screens', () => {
  test.use({ viewport: { width: 500, height: 800 } })

  test('the page list drawer can be pinned, and multi-select does not close it', async ({
    page,
  }) => {
    await openPdf(page, 6)
    const sidebar = page.getByRole('complementary', { name: 'Pages' })
    const menu = page.getByRole('button', { name: 'Toggle page list' })

    // Unpinned: the drawer is off-screen until opened, and closes after picking a page.
    await expect(sidebar).not.toBeInViewport()
    await menu.click()
    await expect(sidebar).toBeInViewport()
    await thumbs(page).nth(2).click()
    await expect(sidebar).not.toBeInViewport()

    // Pinned: it stays docked while selecting several pages.
    await menu.click()
    await page.getByRole('button', { name: 'Pin page list open' }).click()
    await expect(sidebar).toBeInViewport()
    await thumbs(page)
      .nth(1)
      .click({ modifiers: ['ControlOrMeta'] })
    await thumbs(page)
      .nth(4)
      .click({ modifiers: ['ControlOrMeta'] })
    await expect(sidebar).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Delete 2 selected' })).toBeVisible()

    // The pin is remembered.
    await page.reload()
    await page.getByTestId('file-input').setInputFiles({
      name: 'sample.pdf',
      mimeType: 'application/pdf',
      buffer: makePdf(3),
    })
    await expect(sidebar).toBeInViewport()

    // The top-bar button hides a pinned list again.
    await menu.click()
    await expect(sidebar).not.toBeInViewport()
  })
})
