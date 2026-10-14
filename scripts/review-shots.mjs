// Captures the review screenshots for a design round, using the Playwright MCP page.
// Load with the browser_run_code_unsafe tool's `filename` option. Writes .playwright-mcp/review/*.png.
async (page) => {
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
  const waitPhase = async (phase, max = 60) => {
    for (let i = 0; i < max; i++) {
      const p = await page.getByTestId('opening-overlay').getAttribute('data-phase').catch(() => null)
      if (p === phase) return true
      await page.waitForTimeout(150)
    }
    return false
  }

  for (const [w, h, tag] of [
    [1440, 900, 'd'],
    [390, 844, 'm'],
  ]) {
    await page.setViewportSize({ width: w, height: h })

    // First visit: landing and onboarding.
    await fresh(null)
    await page.goto(BASE + '/')
    await page.waitForTimeout(2600)
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

    await page.goto(BASE + '/')
    await page.waitForTimeout(1200)
    const cta = page.getByTestId('hero-cta')
    if (await cta.count()) {
      await cta.click()
      await page.waitForTimeout(1200)
      await shot(`${tag}-05-onboard-arms`)
      const submit = page.locator('[data-testid="onboarding"] button[type="submit"]').first()
      if (await submit.count()) await submit.click()
      await page.waitForTimeout(1500)
      await shot(`${tag}-06-onboard-how`)
      const skip = page.getByText('Skip to my free chest')
      if (await skip.count()) await skip.first().click()
      await page.waitForTimeout(1200)
      await shot(`${tag}-07-onboard-trial`)
      const openTrial = page.getByTestId('open-trial')
      if (await openTrial.count()) {
        await openTrial.click()
        await waitPhase('await')
        await page.waitForTimeout(400)
        await shot(`${tag}-08-trial-await`)
        const hold = page.getByTestId('hold-to-open')
        await hold.hover()
        await page.mouse.down()
        await page.waitForTimeout(700)
        await shot(`${tag}-09-trial-charging`)
        await page.waitForTimeout(700)
        await page.mouse.up()
        await waitPhase('reveal')
        await page.waitForTimeout(2200)
        await shot(`${tag}-10-trial-reveal`)
        const keep = page.getByTestId('keep')
        if (await keep.count()) await keep.click()
        await page.waitForTimeout(1400)
        await shot(`${tag}-11-onboard-claim`)
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
    await page.getByTestId('open-chest').click()
    await waitPhase('await')
    await page.waitForTimeout(300)
    await page.getByTestId('hold-to-open').hover()
    await page.mouse.down()
    await page.waitForTimeout(1300)
    await page.mouse.up()
    await page.waitForTimeout(900)
    await shot(`${tag}-14-open-tell`)
    await waitPhase('burst')
    await page.waitForTimeout(250)
    await shot(`${tag}-15-open-burst`)
    await waitPhase('rise')
    await page.waitForTimeout(700)
    await shot(`${tag}-16-open-rise`)
    await waitPhase('reveal')
    await page.waitForTimeout(2300)
    await shot(`${tag}-17-open-reveal`)
    const close = page.getByLabel('Close')
    if (await close.count()) await close.first().click()
    await page.waitForTimeout(600)

    await page.goto(BASE + '/vault')
    await page.waitForTimeout(2000)
    await shot(`${tag}-18-vault`)
    const first = page.locator('a[href^="/vault/"]').first()
    if (await first.count()) {
      await first.click()
      await page.waitForTimeout(1800)
      await shot(`${tag}-19-vault-item`)
    }
  }
  return out
}
