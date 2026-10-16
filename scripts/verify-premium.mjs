// Run against `vite preview --port 5190`. Override BASE_URL or PLAYWRIGHT_MODULE if needed.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const runtime = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? pathToFileURL(runtime).href)
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5190'
const output = 'node_modules/.tmp/premium-qa'
await mkdir(output, { recursive: true })
// The whole catalog, as src/data/items.ts merges it: Met and Cleveland antiques, then newly forged pieces.
const items = [
  ...JSON.parse(await readFile('src/data/items.json', 'utf8')),
  ...JSON.parse(await readFile('src/data/cleveland.json', 'utf8')),
  ...JSON.parse(await readFile('src/data/modern.json', 'utf8')).items,
]
const categories = ['sword', 'helmet', 'dagger', 'polearm', 'armor', 'shield', 'axe', 'bow']
const objects = categories.map((category) => items.find((item) => item.category === category))
assert.ok(objects.every(Boolean), 'Every test category needs a catalog object')
const values = [2000, 540, 180, 960, 4800, 280, 140, 24]
const seed = {
  version: 2, profile: { name: 'Aldric', arms: { field: 'azure', charge: 'or', ordinary: 'saltire' } },
  onboarded: true, signedIn: true, signInMethod: 'email', balance: 1000,
  settings: { fast: false, force: null }, stats: { spent: 800, opened: 8, soldFor: 123.2 },
  pulls: objects.map((item, index) => ({ uid: `premium-${index}`, itemId: item.id, chestId: 'knight', rarity: ['legendary', 'rare', 'uncommon', 'epic', 'relic', 'common', 'common', 'common'][index], price: 100, value: values[index], at: Date.now() - index * 60000, status: index === 5 ? 'shipping' : index === 6 ? 'sold' : index === 7 ? 'shipped' : 'vaulted', ...(index === 6 ? { soldFor: 123.2 } : {}) })),
}
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const checks = []
const errors = []
const measurements = []
const screenshots = []
const contrasts = []
async function check(name, action) { await action(); checks.push(name); process.stdout.write(`PASS ${name}\n`) }
async function settle(page) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(600) }
async function seedPage(page, state = seed, path = '/vault') {
  await page.goto(`${base}/vault`)
  await page.evaluate((value) => localStorage.setItem('ironbound:v2', JSON.stringify(value)), state)
  await page.goto(base + path)
  await settle(page)
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ironbound:v2')))
async function shot(page, name) { await settle(page); await page.screenshot({ path: `${output}/${name}.png` }); screenshots.push(name) }
async function fits(page, name) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }))
  measurements.push({ name, ...size })
  assert.ok(size.page <= size.viewport, `${name}: ${JSON.stringify(size)}`)
}
async function filters(page, width) {
  if (width < 640) await page.getByRole('button', { name: /^Filter/ }).click()
}
async function action(page, name, width) {
  const root = width < 768 ? page.locator('.ib-detail-mobile-actions') : page.locator('.ib-detail-inline-actions')
  await root.getByRole('button', { name }).click()
}
async function contrast(page, name, selector) {
  const rows = await page.evaluate((scope) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const rgba = (color) => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].map((n, i) => i === 3 ? n / 255 : n) }
    const over = (a, b) => [...a.slice(0, 3).map((n, i) => n * a[3] + b[i] * (1 - a[3])), 1]
    const light = (color) => color.slice(0, 3).map((n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0)
    const result = []
    for (const root of document.querySelectorAll(scope)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const text = walker.currentNode, element = text.parentElement
        if (!element || !text.textContent.trim() || element.closest('.sr-only, [aria-hidden="true"]')) continue
        const rect = element.getBoundingClientRect()
        if (!rect.width || !rect.height) continue
        const styles = []
        let current = element, hidden = false
        while (current) { const style = getComputedStyle(current); if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) hidden = true; styles.push(style); current = current.parentElement }
        if (hidden) continue
        let background = rgba(getComputedStyle(document.documentElement).backgroundColor)
        for (const style of styles.reverse()) background = over(rgba(style.backgroundColor), background)
        const style = getComputedStyle(element)
        let painted = []
        // Compare text with every opaque stop of the nearest painted surface: a gradient on the text's own
        // element or an ancestor, but never one behind a solid background nearer the text (a flat brass
        // button inside a footer that fades to dark is read against the brass).
        for (const parentStyle of [...styles].reverse()) {
          if (!parentStyle.backgroundImage.startsWith('linear-gradient')) { if (rgba(parentStyle.backgroundColor)[3] === 1) break; continue }
          const stops = []
          for (const stop of parentStyle.backgroundImage.match(/(?:oklch|oklab|rgb|color)\([^)]*\)/g) ?? []) {
            const color = rgba(stop)
            if (color[3] === 1) stops.push(color)
          }
          if (stops.length) { painted = stops; break }
        }
        const ratios = (painted.length ? painted : [background]).map((color) => { const a = light(over(rgba(style.color), color)), b = light(color); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) })
        const size = parseFloat(style.fontSize), large = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700
        result.push({ text: text.textContent.trim().slice(0, 70), ratio: Math.min(...ratios), minimum: large ? 3 : 4.5 })
      }
    }
    return result
  }, selector)
  contrasts.push({ name, rows })
  const failures = rows.filter((row) => row.ratio < row.minimum)
  assert.deepEqual(failures, [], `${name} contrast: ${JSON.stringify(failures)}`)
  assert.ok(rows.length > 0, `${name} needs measured text`)
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390 })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`))
    await seedPage(page)
    await check(`${width} ledger retains ownership and rates`, async () => {
      await page.waitForFunction(() => document.querySelector('.ib-vault-total')?.innerText === '$8,784')
      assert.equal(await page.locator('.ib-vault-total').innerText(), '$8,784')
      assert.match(await page.locator('.ib-ledger-return').nth(0).innerText(), /Gain\s*\+\$8,107/)
      // Each offer is whole dollars, as the vault credits it: $7,729 at 88% + $123 sold - $800 spent.
      assert.match(await page.locator('.ib-ledger-return').nth(1).innerText(), /Gain\s*\+\$7,052/)
      const columns = await page.locator('.ib-wall').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
      assert.equal(columns, width === 390 ? 2 : 4)
      assert.equal(await page.locator('a[href^="/vault/"]').count(), 8)
      assert.equal(await page.locator('select').count(), 0)
      await fits(page, 'collection')
    })
    await shot(page, `vault-${width}`)
    await contrast(page, `vault-${width}`, '#vault-main')
    await check(`${width} arms sheet turns pages and saves from any page`, async () => {
      await page.getByTestId('edit-profile').click()
      const sheet = page.getByTestId('profile-sheet')
      await sheet.waitFor()
      assert.equal(await sheet.getByLabel('Your name', { exact: true }).inputValue(), 'Aldric')
      await sheet.getByRole('button', { name: 'Next: Ordinary' }).click()
      await sheet.getByRole('button', { name: 'Cross', exact: true }).click()
      assert.equal(await sheet.getByRole('button', { name: 'Cross', exact: true }).getAttribute('aria-pressed'), 'true')
      const overflow = await page.locator('.ib-profile-sheet').evaluate((e) => e.scrollHeight - e.clientHeight)
      assert.ok(overflow <= 1, `the sheet scrolls ${overflow}px`)
      await sheet.getByRole('button', { name: 'Save', exact: true }).click()
      await sheet.waitFor({ state: 'detached' })
      assert.equal((await stored(page)).profile.arms.ordinary, 'cross')
      await fits(page, 'arms sheet')
    })
    await filters(page, width)
    await check(`${width} text filters and active hairlines`, async () => {
      const types = page.getByRole('group', { name: 'Filter by item type' })
      await types.getByRole('button', { name: 'Daggers', exact: true }).click()
      assert.equal(await page.locator('.ib-wall-entry').count(), 1)
      assert.equal(await types.getByRole('button', { name: 'Daggers' }).getAttribute('aria-pressed'), 'true')
      assert.equal(await types.locator('.ib-filter-line').count(), 1)
      await types.getByRole('button', { name: 'All', exact: true }).click()
      const status = page.getByRole('group', { name: 'Filter by item status' })
      await status.getByRole('button', { name: 'Shipping', exact: true }).click()
      assert.equal(await page.locator('.ib-wall-entry').count(), 2)
      await status.getByRole('button', { name: 'All statuses' }).click()
      const overflow = await types.evaluate((element) => element.scrollWidth > element.clientWidth)
      if (width === 390) assert.equal(overflow, true)
    })
    const sort = page.getByRole('button', { name: /^Sort by/ })
    await check(`${width} listbox selection, arrows, Home, End, Escape`, async () => {
      await sort.focus(); await page.keyboard.press('ArrowDown')
      assert.equal(await page.getByRole('option', { name: 'Newest' }).evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('End')
      assert.equal(await page.getByRole('option', { name: 'Highest rarity' }).evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
      assert.match(await page.locator('.ib-wall-entry').first().innerText(), /\$4,800/)
      assert.equal(await sort.evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('Space'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Escape')
      assert.equal(await sort.getAttribute('aria-expanded'), 'false')
      assert.equal(await sort.evaluate((e) => e === document.activeElement), true)
    })
    await check(`${width} listbox type search, Tab and outside dismissal`, async () => {
      await sort.click(); await page.keyboard.press('n')
      assert.equal(await page.getByRole('option', { name: 'Newest' }).evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('Space')
      assert.match(await sort.innerText(), /Newest/i)
      await sort.click(); await page.keyboard.press('Tab')
      assert.equal(await sort.getAttribute('aria-expanded'), 'false')
      assert.equal(await page.locator('.ib-wall-entry').first().evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('Shift+Tab')
      assert.equal(await sort.evaluate((e) => e === document.activeElement), true)
      await sort.click(); await page.keyboard.press('Shift+Tab')
      assert.equal(await sort.evaluate((e) => e === document.activeElement), true)
      // Tab closes the list a tick later, once native focus has moved.
      await page.getByRole('listbox').waitFor({ state: 'detached', timeout: 2000 })
      await sort.click(); await page.getByRole('heading', { name: 'Aldric’s vault' }).click()
      assert.equal(await sort.getAttribute('aria-expanded'), 'false')
    })
    await sort.click(); await shot(page, `filters-${width}`); await page.keyboard.press('Escape')

    await page.goto(`${base}/vault/premium-0`); await settle(page)
    await check(`${width} floating inspection and keyboard zoom`, async () => {
      const inspect = page.getByRole('group', { name: `Inspect ${objects[0].name}` })
      assert.equal(await page.getByRole('button', { name: 'Zoom out', exact: true }).isDisabled(), true)
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
      assert.match(await page.locator('.ib-viewer-controls').innerText(), /150%/)
      assert.equal(await page.locator('.ib-viewer-help').getAttribute('data-used'), 'true')
      assert.equal(await page.locator('.ib-viewer img').getAttribute('src'), objects[0].image)
      await inspect.focus(); await page.keyboard.press('ArrowRight')
      assert.match(await page.locator('.ib-viewer-object').getAttribute('style'), /translate\(-50px, 0px\)/)
      await page.keyboard.press('0')
      assert.match(await page.locator('.ib-viewer-controls').innerText(), /100%/)
      await fits(page, 'detail')
    })
    await check(`${width} wheel and drag inspection`, async () => {
      await page.locator('.ib-viewer-stage').scrollIntoViewIfNeeded()
      const rect = await page.locator('.ib-viewer-stage').boundingBox()
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
      await page.mouse.move(x, y); await page.mouse.wheel(0, -350); await page.waitForTimeout(250)
      assert.equal(await page.locator('.ib-viewer-stage').getAttribute('data-zoomed'), 'true')
      const before = await page.locator('.ib-viewer-object').evaluate((e) => { const matrix = new DOMMatrix(getComputedStyle(e).transform); return [matrix.m41, matrix.m42] })
      await page.mouse.down(); await page.mouse.move(x + 35, y + 20, { steps: 4 }); await page.mouse.up()
      const after = await page.locator('.ib-viewer-object').evaluate((e) => { const matrix = new DOMMatrix(getComputedStyle(e).transform); return [matrix.m41, matrix.m42] })
      assert.ok(Math.abs(after[0] - before[0] - 35) < 1 && Math.abs(after[1] - before[1] - 20) < 1)
      await page.getByRole('button', { name: 'Reset view' }).click()
    })
    if (width === 390) await check('390 real touch pinch and action clearance', async () => {
      const rect = await page.locator('.ib-viewer-stage').boundingBox()
      const cdp = await context.newCDPSession(page)
      const points = (distance) => [{ x: rect.x + rect.width / 2 - distance / 2, y: rect.y + rect.height / 2, radiusX: 3, radiusY: 3, id: 1 }, { x: rect.x + rect.width / 2 + distance / 2, y: rect.y + rect.height / 2, radiusX: 3, radiusY: 3, id: 2 }]
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(80) })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(160) })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(100)
      assert.match(await page.locator('.ib-viewer-controls').innerText(), /200%/)
      await page.getByRole('button', { name: 'Reset view' }).click()
      const bar = await page.locator('.ib-detail-mobile-actions').boundingBox()
      const nav = await page.locator('nav[aria-label="Primary"]').last().boundingBox()
      assert.ok(nav && bar.y + bar.height <= nav.y + 1)
      measurements.push({ name: 'phone-actions', ...bar })
    })
    await shot(page, `detail-${width}`)
    await contrast(page, `detail-${width}`, '#vault-main')
    await check(`${width} sell confirmation and focus return`, async () => {
      await action(page, /^Sell for/, width)
      await page.getByRole('heading', { name: 'Trade your steel for credit?' }).waitFor()
      assert.equal(await page.locator('#sell-title').evaluate((e) => e === document.activeElement), true)
      await page.getByRole('button', { name: 'Keep in vault', exact: true }).click()
      assert.match(await page.evaluate(() => document.activeElement.textContent), /Sell for/)
      await action(page, /^Sell for/, width)
      await page.getByRole('button', { name: 'Confirm sell-back' }).evaluate((button) => { button.click(); button.click() })
      const state = await stored(page)
      assert.equal(state.balance, 2760)
      assert.equal(state.pulls[0].status, 'sold')
    })
    await seedPage(page, seed, '/vault/premium-1')
    await check(`${width} shipping form, review and single charge`, async () => {
      await action(page, 'Ship', width)
      for (const [label, value] of [['Full name', 'Aldric'], ['Street address', '20 Example Street'], ['City', 'Tbilisi'], ['Country', 'Georgia']]) await page.getByLabel(label, { exact: true }).fill(value)
      await page.getByRole('button', { name: 'Review shipment' }).click()
      await page.getByRole('heading', { name: 'Review your shipment' }).waitFor()
      await fits(page, 'shipping review')
      await shot(page, `shipping-${width}`)
      await page.getByRole('button', { name: 'Confirm demo shipment' }).evaluate((button) => { button.click(); button.click() })
      await page.getByRole('heading', { name: 'Shipping requested' }).waitFor()
      const state = await stored(page)
      assert.equal(state.balance, 972)
      assert.equal(state.pulls[1].status, 'shipping')
      assert.equal(state.stats.spent, 828)
    })

    const guest = { ...seed, profile: null, onboarded: false, signedIn: false, signInMethod: null, balance: 0, pulls: [{ ...seed.pulls[0], chestId: 'trial' }] }
    await seedPage(page, guest)
    await check(`${width} quiet optional invite`, async () => {
      await page.getByTestId('guest-invite').waitFor()
      assert.equal(await page.getByTestId('claim-credit').count(), 1)
      assert.equal(await page.getByTestId('claim-credit').evaluate((e) => e.className.includes('bg-transparent')), true)
      await fits(page, 'invite')
    })
    await shot(page, `guest-${width}`)
    await page.getByTestId('claim-credit').click()
    await page.getByRole('heading', { name: 'Raise your banner.' }).waitFor(); await settle(page)
    await check(`${width} pattern book turns one page at a time`, async () => {
      assert.equal(await page.getByTestId('onboarding').getAttribute('aria-modal'), 'true')
      assert.equal(await page.getByRole('button', { name: 'Cross', exact: true }).count(), 0)
      await page.getByLabel('Your name', { exact: true }).fill('Aldric')
      await page.getByLabel('Your name', { exact: true }).press('Enter')
      await page.getByRole('heading', { name: 'Choose your ordinary' }).waitFor()
      await page.getByRole('button', { name: 'Cross', exact: true }).click()
      assert.equal(await page.getByRole('button', { name: 'Cross', exact: true }).getAttribute('aria-pressed'), 'true')
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      assert.equal(await page.getByLabel('Your name', { exact: true }).inputValue(), 'Aldric')
      await page.getByRole('button', { name: 'Next: Ordinary' }).click()
      await page.getByRole('button', { name: 'Next: Charge' }).click()
      await page.getByRole('button', { name: 'Lion', exact: true }).click()
      await page.getByRole('button', { name: 'Next: Colors' }).click()
      const blue = page.getByRole('button', { name: 'Field: Blue (Azure)', exact: true })
      await blue.focus()
      assert.match(await page.locator('.ib-palette legend').first().textContent(), /Blue · Azure/)
      await blue.click()
      assert.equal(await blue.getAttribute('aria-pressed'), 'true')
      await fits(page, 'banner')
    })
    if (width === 1440) await check('1440 every banner page fits without scrolling', async () => {
      for (const name of ['Name', 'Ordinary', 'Charge', 'Colors']) {
        await page.locator('.ib-book-steps').getByRole('button', { name, exact: true }).click(); await settle(page)
        const size = await page.getByTestId('onboarding').evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }))
        const button = await page.locator('.ib-book-actions button[type="submit"]').boundingBox()
        measurements.push({ name: `desktop-banner-${name}`, ...button, ...size })
        assert.ok(size.scroll <= size.client && button.y + button.height <= 900, JSON.stringify({ name, button, size }))
      }
    })
    await shot(page, `arms-${width}`)
    await contrast(page, `arms-${width}`, '.ib-step')
    await check(`${width} onboarding Tab remains in dialog`, async () => {
      const last = page.getByRole('button', { name: 'Use these arms' })
      await last.focus(); await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[data-testid="onboarding"]'))), true)
      assert.equal(await page.getByRole('button', { name: 'Skip', exact: true }).evaluate((e) => e === document.activeElement), true)
      await page.keyboard.press('Shift+Tab')
      assert.equal(await last.evaluate((e) => e === document.activeElement), true)
    })
    await page.getByRole('button', { name: 'Use these arms' }).click()
    await page.getByRole('heading', { name: 'Claim demo credit.' }).waitFor(); await settle(page)
    await fits(page, 'claim'); await shot(page, `claim-${width}`)
    await contrast(page, `claim-${width}`, '.ib-step')
    await check(`${width} email validity, wallet choices and one credit grant`, async () => {
      await page.getByLabel('Email address').fill('invalid')
      await page.getByRole('button', { name: 'Continue with email' }).click()
      assert.equal((await stored(page)).signedIn, false)
      await page.getByRole('button', { name: 'Connect a Solana wallet' }).click()
      assert.equal(await page.locator('#demo-wallet-picker button').count(), 3)
      await page.getByRole('button', { name: 'Connect a Solana wallet' }).click()
      await page.getByLabel('Email address').fill('aldric@example.com')
      await page.getByRole('button', { name: 'Continue with email' }).evaluate((button) => { button.click(); button.click() })
      await page.getByRole('heading', { name: 'Your purse is ready.' }).waitFor()
      assert.equal((await stored(page)).balance, 1000)
      await fits(page, 'credit receipt')
    })
    await shot(page, `credit-${width}`)
    await page.getByRole('button', { name: 'Enter the armory' }).click()
    await page.getByTestId('onboarding').waitFor({ state: 'detached' })

    await page.goto(base + '/'); await settle(page)
    for (const [id, name] of [['how-it-works', 'how'], ['chest-tiers', 'tiers'], ['trust', 'trust'], ['faq', 'faq']]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded(); await shot(page, `${name}-${width}`)
      await contrast(page, `${name}-${width}`, `#${id} .ib-shell`)
    }
    await check(`${width} chest ledger and named odds`, async () => {
      assert.equal(await page.locator('.ib-tier').count(), 5)
      const row = page.locator('.ib-tier').first()
      await row.scrollIntoViewIfNeeded()
      await row.locator('summary').click()
      assert.equal(await row.locator('.ib-odds-details li').count(), 6)
      assert.match(await row.getByRole('img').getAttribute('aria-label'), /Common 50.35%/)
      assert.equal(await row.getByRole('link', { name: 'Inspect chest' }).getAttribute('href'), '/chests/squire')
      await fits(page, 'tiers')
    })
    await check(`${width} FAQ mouse and keyboard path`, async () => {
      const button = page.getByRole('button', { name: 'Will my collection be saved?' })
      await button.click()
      assert.equal(await button.getAttribute('aria-expanded'), 'true')
      await button.focus(); await page.keyboard.press('Space')
      assert.equal(await button.getAttribute('aria-expanded'), 'false')
      await page.keyboard.press('Enter')
      assert.equal(await button.getAttribute('aria-expanded'), 'true')
      await fits(page, 'FAQ')
    })
    await check(`${width} footer source credits`, async () => {
      assert.equal(await page.locator('footer a[href="https://polyhaven.com/a/treasure_chest"]').count(), 1)
      assert.equal(await page.locator('footer a[href="https://www.metmuseum.org/art/collection"]').count(), 1)
    })
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(`reduced: ${error.message}`))
  await seedPage(page, { ...seed, profile: { ...seed.profile, name: 'VeryLongUnbrokenCollectorName123' }, stats: { ...seed.stats, spent: 1500000 }, pulls: [{ ...seed.pulls[0], value: 1200000 }] })
  await check('reduced motion, long names, million-dollar value and losses', async () => {
    assert.equal(await page.locator('.ib-vault-total').innerText(), '$1,200,000')
    assert.match(await page.locator('.ib-ledger-return').first().innerText(), /Loss\s*-\$299,877/)
    await page.locator('.ib-wall-entry').first().hover()
    assert.equal(await page.locator('.ib-image-fit').first().evaluate((e) => getComputedStyle(e).transform), 'none')
    await fits(page, 'long names and values')
  })
  await seedPage(page, { ...seed, pulls: [{ ...seed.pulls[0], chestId: 'missing' }] })
  await check('missing chest makes sell-back net unavailable', async () => { assert.match(await page.locator('.ib-ledger-return').nth(1).innerText(), /Unavailable/) })
  await seedPage(page, { ...seed, pulls: [] })
  await check('empty collection has a chest path', async () => { await page.getByRole('heading', { name: 'Start your armory.' }).waitFor(); assert.equal(await page.getByRole('link', { name: 'Open a chest' }).getAttribute('href'), '/chests') })
  await seedPage(page, { ...seed, profile: null, signedIn: false, onboarded: false, balance: 0, pulls: [], stats: { spent: 0, opened: 0, soldFor: 0 } }, '/')
  await check('free chest Keep reaches the vault and optional setup', async () => {
    await page.getByTestId('header-cta').click()
    await page.getByTestId('hold-to-open').waitFor({ state: 'visible' })
    await page.getByTestId('hold-to-open').focus()
    await page.keyboard.down('Space'); await page.waitForTimeout(1400); await page.keyboard.up('Space')
    await page.getByTestId('keep').waitFor({ state: 'visible' })
    await page.getByTestId('keep').click()
    await page.getByTestId('guest-invite').waitFor()
    assert.match(page.url(), /\/vault$/)
    await page.locator('a[href^="/vault/"]').waitFor({ state: 'visible' })
    assert.equal(await page.locator('a[href^="/vault/"]').count(), 1)
    await page.getByTestId('claim-credit').click()
    await page.getByRole('heading', { name: 'Raise your banner.' }).waitFor()
    await page.getByRole('button', { name: 'Skip', exact: true }).click()
    await page.getByRole('heading', { name: 'Claim demo credit.' }).waitFor()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('heading', { name: 'Raise your banner.' }).waitFor()
    await page.getByRole('button', { name: 'Skip', exact: true }).click()
    await page.getByRole('heading', { name: 'Claim demo credit.' }).waitFor()
    const moving = await page.locator('[data-testid="onboarding"] [style*="transform"]').evaluateAll((elements) => elements.filter((e) => { const matrix = new DOMMatrix(getComputedStyle(e).transform); return matrix.m41 !== 0 || matrix.m42 !== 0 || matrix.m11 !== 1 || matrix.m22 !== 1 }).length)
    assert.equal(moving, 0)
    await page.getByRole('button', { name: 'Later', exact: true }).click()
    await page.getByTestId('onboarding').waitFor({ state: 'detached' })
    assert.equal((await stored(page)).signedIn, false)
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
  })
  await check('guest can dismiss the invite and leave setup with Escape', async () => {
    await page.getByTestId('guest-invite').getByRole('button', { name: 'Not now' }).click()
    await page.getByTestId('guest-invite').waitFor({ state: 'detached' })
    await page.getByTestId('header-cta').click()
    await page.getByTestId('onboarding').waitFor()
    await page.keyboard.press('Escape')
    await page.getByTestId('onboarding').waitFor({ state: 'detached' })
  })
  await context.close()
  assert.deepEqual(errors, [])
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors, measurements, screenshots, contrasts }, null, 2))
  process.stdout.write(`Completed ${checks.length} browser checks. No page errors.\n`)
} finally { await browser.close() }
