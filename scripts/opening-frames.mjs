// Films one opening frame by frame and records phase timings. Load with the Playwright MCP
// browser_run_code_unsafe tool's `filename` option. Writes .playwright-mcp/frames/*.png.
// The tool keeps no globals between calls, so each run launches its own headless Chrome and
// closes it at the end. To change the chest, rarity or size, write a copy with the CFG
// marker replaced, e.g.
//   sed "s|/\*CFG\*/{}|{ chest: 'squire', force: 'common' }|" scripts/opening-frames.mjs > .playwright-mcp/run-frames.mjs
// To film one piece, pass item: '<id>': the run watches its opening from the item page.
// every: ms between frames once the seal breaks. dir: subfolder of .playwright-mcp/frames.
async (mcpPage) => {
  const cfg = { chest: 'warlord', force: 'legendary', width: 1440, height: 900, every: 450, dir: 'run', ...(/*CFG*/{}) }
  const browser = await mcpPage.context().browser().browserType().launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height } })
    const errors = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 200))
    })
    await page.goto('http://localhost:5183/')
    await page.evaluate(
      ({ force, fast }) => {
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
            settings: { fast, force },
            stats: { spent: 0, opened: 0, soldFor: 0 },
          }),
        )
      },
      { force: cfg.force, fast: !!cfg.fast },
    )
    await page.goto(cfg.item ? `http://localhost:5183/item/${cfg.item}` : `http://localhost:5183/chests/${cfg.chest}`)
    await page.waitForTimeout(2000)
    const phase = () => page.getByTestId('opening-overlay').getAttribute('data-phase').catch(() => null)
    const t0 = Date.now()
    const marks = []
    let last = null
    let n = 0
    const shot = async (tag) => {
      await page.screenshot({ path: `.playwright-mcp/frames/${cfg.dir}/${String(n++).padStart(2, '0')}-${tag}.png` })
    }
    const mark = async () => {
      const p = await phase()
      if (p !== last) {
        marks.push(`${p}@${Date.now() - t0}`)
        last = p
      }
      return p
    }
    const waitFor = async (want, ms) => {
      const end = Date.now() + ms
      while (Date.now() < end) {
        if ((await mark()) === want) return true
        await page.waitForTimeout(40)
      }
      return false
    }
    if (cfg.item) await page.getByTestId('watch-pull').click()
    else {
      const desk = page.getByTestId('open-chest')
      await ((await desk.isVisible()) ? desk : page.getByTestId('open-chest-mobile')).click()
    }
    for (const at of [250, 800, 1400, 2000]) {
      while (Date.now() - t0 < at) {
        await mark()
        await page.waitForTimeout(30)
      }
      await shot(`intro-${at}`)
    }
    if (!cfg.item) {
      if (!(await waitFor('await', 8000))) return { stuck: 'await', marks, errors }
      await page.waitForTimeout(300)
      await shot('await')
      await page.getByTestId('hold-to-open').hover()
      await page.mouse.down()
      await page.waitForTimeout(900)
      await shot('charging')
      await page.waitForTimeout(800)
      await page.mouse.up()
    }
    // From the broken seal to the title stage: a frame every cfg.every ms, 35 s at most.
    const deadline = Date.now() + 35000
    let p = null
    while (Date.now() < deadline) {
      p = await mark()
      if (p === 'title' || p === 'reveal') break
      // No auto-wait here: the facts are absent for most of the run.
      const facts = await page.evaluate(() => document.querySelector('[data-testid="reveal-facts"]')?.getAttribute('data-beat') ?? null)
      await shot(`${p ?? 'none'}${facts !== null ? '-f' + facts : ''}`)
      await page.waitForTimeout(cfg.every)
    }
    // The title stage builds the name, provenance and value; Fast goes straight to the receipt.
    if (p === 'title') {
      await page.waitForTimeout(450)
      await shot('title')
      await page.waitForTimeout(1700)
      await shot('title-built')
    } else if (!cfg.fast) return { stuck: 'title', marks, errors }
    if (!(await waitFor('reveal', Math.max(1000, deadline - Date.now())))) return { stuck: 'reveal', marks, errors }
    // The receipt counts as arrived once Keep can take focus (it sits invisible under the title stage).
    const spectating = !!cfg.item
    const ready = await page
      .waitForFunction((id) => (document.querySelector(`[data-testid="${id}"]`)?.tabIndex ?? -1) === 0, spectating ? 'spectate-open' : 'keep', { timeout: 6000 })
      .then(() => true, () => false)
    if (!ready) return { stuck: spectating ? 'spectate-open' : 'keep', marks, errors }
    marks.push(`card@${Date.now() - t0}`)
    await page.waitForTimeout(1300)
    await shot('card')
    return { cfg, marks, errors, frames: n }
  } finally {
    await browser.close()
  }
}
