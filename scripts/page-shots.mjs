// Captures quick page screenshots for design checks. Load with the Playwright MCP
// browser_run_code_unsafe tool's `filename` option. Writes .playwright-mcp/pages/*.png.
// Each run launches its own headless Chrome and closes it. To choose pages, write a copy with
// the CFG marker replaced by a list of shots, e.g.
//   sed "s|/\*CFG\*/\[\]|[{ name: 'chests', path: '/chests' }]|" scripts/page-shots.mjs > .playwright-mcp/run-pages.mjs
// A shot takes { name, path, width?, height?, scroll?, full?, guest?, wait? }.
async (mcpPage) => {
  const DEFAULT = [
    { name: 'd-landing', path: '/', guest: true },
    { name: 'd-chests', path: '/chests', full: true },
    { name: 'd-detail', path: '/chests/warlord', full: true },
    { name: 'm-landing', path: '/', guest: true, width: 390, height: 844 },
    { name: 'm-chests', path: '/chests', width: 390, height: 844, full: true },
    { name: 'm-detail', path: '/chests/warlord', width: 390, height: 844, full: true },
  ]
  const custom = /*CFG*/[]
  const shots = custom.length ? custom : DEFAULT
  const browser = await mcpPage.context().browser().browserType().launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 200))
    })
    const out = []
    for (const s of shots) {
      await page.setViewportSize({ width: s.width ?? 1440, height: s.height ?? 900 })
      await page.goto('http://localhost:5183/')
      await page.evaluate((guest) => {
        if (guest) localStorage.removeItem('ironbound:v2')
        else
          localStorage.setItem(
            'ironbound:v2',
            JSON.stringify({
              version: 2,
              profile: { name: 'Nika', arms: { field: 'azure', charge: 'or', ordinary: 'saltire' } },
              onboarded: true,
              signedIn: true,
              signInMethod: 'email',
              balance: 25000,
              pulls: [],
              settings: { fast: false, force: null },
              stats: { spent: 0, opened: 0, soldFor: 0 },
            }),
          )
      }, !!s.guest)
      await page.goto('http://localhost:5183' + s.path)
      await page.waitForTimeout(s.wait ?? 2200)
      if (s.scroll) {
        await page.mouse.wheel(0, s.scroll)
        await page.waitForTimeout(900)
      }
      if (s.full) {
        // Scroll through once so reveal-on-scroll content is shown, then shoot the whole page.
        const h = await page.evaluate(() => document.documentElement.scrollHeight)
        for (let y = 0; y < h; y += 700) {
          await page.mouse.wheel(0, 700)
          await page.waitForTimeout(120)
        }
        await page.waitForTimeout(500)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(400)
      }
      await page.screenshot({ path: `.playwright-mcp/pages/${s.name}.png`, fullPage: !!s.full })
      out.push(s.name)
    }
    return { out, errors }
  } finally {
    await browser.close()
  }
}
