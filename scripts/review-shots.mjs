// Captures the review screenshots for a design round. Load with the Playwright MCP
// browser_run_code_unsafe tool's `filename` option. Writes .playwright-mcp/review/*.png.
// Runs in a headless Chrome launched from the MCP process: the headed MCP window drops
// requestAnimationFrame to about 1 fps when the display sleeps, which stalls GSAP. The tool
// keeps no globals between calls, so the browser is closed at the end of every run.
async (mcpPage) => {
  const browser = await mcpPage.context().browser().browserType().launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    const BASE = 'http://localhost:5183'
    const out = []
    const shot = async (name, opts = {}) => {
      await page.screenshot({ path: `.playwright-mcp/review/${name}.png`, ...opts })
      out.push(name)
    }
    const fresh = async (state) => {
      await page.goto(BASE + '/')
      await page.evaluate((s) => {
        if (s) localStorage.setItem('ironbound:v2', JSON.stringify(s))
        else localStorage.removeItem('ironbound:v2')
      }, state)
    }
    const signed = (extra = {}) => ({
      version: 2,
      profile: { name: 'Nika', arms: { field: 'azure', charge: 'or', ordinary: 'saltire' } },
      onboarded: true,
      signedIn: true,
      signInMethod: 'email',
      balance: 25000,
      pulls: [],
      settings: { sound: false, fast: false, force: null },
      stats: { spent: 0, opened: 0, soldFor: 0 },
      ...extra,
    })
    const waitPhase = async (phase, max = 80) => {
      for (let i = 0; i < max; i++) {
        const p = await page.getByTestId('opening-overlay').getAttribute('data-phase').catch(() => null)
        if (p === phase) return true
        await page.waitForTimeout(100)
      }
      return false
    }
    const hold = async (ms = 1400) => {
      await page.getByTestId('hold-to-open').hover()
      await page.mouse.down()
      await page.waitForTimeout(ms)
      await page.mouse.up()
    }
    // Single openings pause with the lid hanging open until the player lifts it.
    const liftLid = async (tag) => {
      if (!(await waitPhase('lift', 200))) return false
      await page.waitForTimeout(600)
      if (tag) await shot(tag)
      await page.getByTestId('lift-surface').click()
      return true
    }
    const openFromDetail = async () => {
      const button = page.locator('[data-testid="open-chest"]:visible, [data-testid="open-chest-mobile"]:visible').first()
      try {
        await button.click({ timeout: 15000 })
      } catch (e) {
        await page.screenshot({ path: '.playwright-mcp/review/zz-failed-open.png' })
        throw e
      }
    }

    for (const [w, h, tag] of [
      [1440, 900, 'd'],
      [390, 844, 'm'],
    ]) {
      await page.setViewportSize({ width: w, height: h })

      // First visit: landing.
      await fresh(null)
      await page.goto(BASE + '/')
      await page.waitForTimeout(3800)
      await shot(`${tag}-01-landing`)
      await page.mouse.wheel(0, h)
      await page.waitForTimeout(900)
      await shot(`${tag}-02-landing-scroll1`)
      await page.mouse.wheel(0, h)
      await page.waitForTimeout(900)
      await shot(`${tag}-03-landing-scroll2`)
      await page.mouse.wheel(0, h * 2)
      await page.waitForTimeout(900)
      await shot(`${tag}-04-landing-scroll3`)

      // The free chest opens on the first click. Banner and demo credit come after.
      await page.goto(BASE + '/')
      await page.waitForTimeout(1200)
      await page.getByTestId('hero-cta').click()
      if (await waitPhase('await')) {
        await page.waitForTimeout(400)
        await shot(`${tag}-05-trial-await`)
        await page.getByTestId('hold-to-open').hover()
        await page.mouse.down()
        await page.waitForTimeout(700)
        await shot(`${tag}-06-trial-charging`)
        await page.waitForTimeout(700)
        await page.mouse.up()
        await liftLid()
        await waitPhase('reveal')
        await page.waitForTimeout(3800)
        await shot(`${tag}-07-trial-reveal`)
        const inspect = page.getByRole('button', { name: 'Hide the card and inspect the piece' })
        if (await inspect.count()) {
          await inspect.click()
          await page.waitForTimeout(1300)
          await shot(`${tag}-08-trial-inspect`)
          await page.getByRole('button', { name: 'Show details' }).click()
          await page.waitForTimeout(500)
        }
        // Keep lands in the vault with an invitation; setup opens only on request.
        await page.getByTestId('keep').click()
        await page.waitForTimeout(1600)
        await shot(`${tag}-09-trial-kept-vault`)
        const claim = page.getByTestId('claim-credit')
        if (await claim.count()) {
          await claim.click()
          await page.waitForTimeout(1500)
          await shot(`${tag}-10-setup-banner`)
          const submit = page.locator('[data-testid="onboarding"] button[type="submit"]').first()
          if (await submit.count()) await submit.click()
          await page.waitForTimeout(1500)
          await shot(`${tag}-11-setup-claim`)
        }
      }

      // Signed-in flows.
      await fresh(signed({ settings: { sound: false, fast: false, force: 'legendary' } }))
      await page.goto(BASE + '/chests')
      await page.waitForTimeout(2000)
      await shot(`${tag}-12-chests`)
      await page.goto(BASE + '/chests/warlord')
      await page.waitForTimeout(2500)
      await shot(`${tag}-13-detail`)
      await openFromDetail()
      await waitPhase('await')
      await page.waitForTimeout(300)
      await page.getByTestId('hold-to-open').hover()
      await page.mouse.down()
      await page.waitForTimeout(1300)
      await page.mouse.up()
      await page.waitForTimeout(900)
      await shot(`${tag}-14-open-tell`)
      await liftLid(`${tag}-14b-open-lift`)
      await waitPhase('burst', 200)
      await page.waitForTimeout(250)
      await shot(`${tag}-15-open-burst`)
      await waitPhase('rise')
      await page.waitForTimeout(450)
      await shot(`${tag}-16-open-macro`)
      await waitPhase('reveal')
      await page.waitForTimeout(3800)
      await shot(`${tag}-17-open-reveal`)
      const inspect = page.getByRole('button', { name: 'Hide the card and inspect the piece' })
      if (await inspect.count()) {
        await inspect.click()
        await page.waitForTimeout(1300)
        await shot(`${tag}-18-open-inspect`)
        // Zoom in on the steel.
        await page.mouse.move(w / 2, h * 0.4)
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel(0, -120)
          await page.waitForTimeout(40)
        }
        await page.waitForTimeout(1300)
        await shot(`${tag}-19-inspect-zoom`)
      }
      await page.getByLabel('Close').first().click()
      await page.waitForTimeout(600)

      // Fast mode: final values and actions at once.
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('ironbound:v2'))
        s.settings.fast = true
        s.settings.force = 'epic'
        localStorage.setItem('ironbound:v2', JSON.stringify(s))
      })
      await page.goto(BASE + '/chests/knight')
      await page.waitForTimeout(1800)
      await openFromDetail()
      await page.getByTestId('keep').waitFor({ state: 'attached', timeout: 8000 })
      await page.waitForTimeout(250)
      await shot(`${tag}-20-fast-result`)
      await page.getByLabel('Close').first().click()
      await page.waitForTimeout(500)

      // Batch of three: face down, flipped, two selected.
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('ironbound:v2'))
        s.settings.fast = false
        s.settings.force = 'rare'
        localStorage.setItem('ironbound:v2', JSON.stringify(s))
      })
      await page.goto(BASE + '/chests/knight')
      await page.waitForTimeout(1800)
      await page.getByRole('radio', { name: '×3' }).last().click()
      await openFromDetail()
      await waitPhase('await')
      await page.waitForTimeout(300)
      await hold(1300)
      await liftLid()
      await waitPhase('reveal', 200)
      await page.waitForTimeout(1500)
      await shot(`${tag}-21-batch-facedown`)
      await page.getByTestId('reveal-all').click()
      await page.waitForTimeout(3800)
      const sel = page.getByTestId('multi-select')
      if ((await sel.count()) >= 2) {
        await sel.nth(0).click()
        await sel.nth(1).click()
      }
      await page.waitForTimeout(400)
      await shot(`${tag}-22-batch-selected`)
      await page.getByRole('button', { name: /^Inspect / }).first().click()
      await page.waitForTimeout(700)
      await shot(`${tag}-23-batch-inspect`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      await page.getByTestId('sell-selected').click()
      await page.waitForTimeout(900)
      await shot(`${tag}-24-batch-sold`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)

      await page.goto(BASE + '/vault')
      await page.waitForTimeout(2000)
      await shot(`${tag}-25-vault`)
      const first = page.locator('a[href^="/vault/"]').first()
      if (await first.count()) {
        await first.click()
        await page.waitForTimeout(1800)
        await shot(`${tag}-26-vault-item`)
      }
    }
    return out
  } finally {
    await browser.close()
  }
}
