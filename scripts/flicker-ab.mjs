// Flicker A/B. Load with the Playwright MCP browser_run_code_unsafe tool's `filename` option.
// Serve two production builds first (for example the last commit on 5190 and the working
// tree on 5191, each with `python -m http.server <port> --directory <dist>`). Records every
// composited frame with a CDP screencast while the pointer sweeps the hero fast, then through
// a whole trial opening, and counts frames whose canvas region drops far below its
// neighbours (a black flash). To change the builds, replace the CFG marker with a list of
// [name, port] pairs.
async (mcpPage) => {
  const browserType = mcpPage.context().browser().browserType()
  const runs = []
  const builds = /*CFG*/[
    ['prev', 5190],
    ['new', 5191],
  ]
  for (const [name, port] of builds) {
    const browser = await browserType.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
    })
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      page.setDefaultTimeout(20000)
      const base = `http://127.0.0.1:${port}`
      await page.goto(base + '/')
      await page.evaluate(() => localStorage.clear())
      await page.goto(base + '/')
      await page.waitForTimeout(4500)
      const cdp = await page.context().newCDPSession(page)
      const frames = []
      let phase = 'hero'
      cdp.on('Page.screencastFrame', async (f) => {
        frames.push({ t: f.metadata.timestamp, phase, data: f.data })
        try {
          await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId })
        } catch {}
      })
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 40, maxWidth: 720, maxHeight: 450, everyNthFrame: 1 })
      // Fast zigzags over the hero, the header links and the call to action.
      const t0 = Date.now()
      let k = 0
      while (Date.now() - t0 < 9000) {
        const x = 40 + ((k * 197) % 1360)
        const y = 30 + ((k * 89) % 820)
        await page.mouse.move(x, y, { steps: 3 })
        k++
      }
      // A whole trial opening, with the pointer still moving fast.
      phase = 'opening'
      await page.getByTestId('hero-cta').click()
      const waitPhase = async (want, ms) => {
        const end = Date.now() + ms
        while (Date.now() < end) {
          const p = await page.evaluate(() => document.querySelector('[data-testid="opening-overlay"]')?.getAttribute('data-phase') ?? null)
          if (p === want) return true
          await page.mouse.move(100 + Math.random() * 1240, 100 + Math.random() * 300, { steps: 2 })
        }
        return false
      }
      await waitPhase('await', 9000)
      await page.getByTestId('hold-to-open').hover()
      await page.mouse.down()
      await page.waitForTimeout(1500)
      await page.mouse.up()
      // Through the whole opening to the receipt's arrival (Keep can take focus), 35 s at most.
      const t1 = Date.now()
      while (Date.now() - t1 < 35000) {
        await page.mouse.move(100 + Math.random() * 1240, 80 + Math.random() * 260, { steps: 2 })
        if (await page.evaluate(() => document.querySelector('[data-testid="keep"]')?.tabIndex === 0)) break
      }
      await page.waitForTimeout(1000)
      await cdp.send('Page.stopScreencast')
      await page.waitForTimeout(300)
      // Measure each frame: mean luminance of the canvas region.
      const lum = await page.evaluate(async (list) => {
        const out = []
        const c = new OffscreenCanvas(72, 45)
        const g = c.getContext('2d', { willReadFrequently: true })
        for (const item of list) {
          const img = new Image()
          img.src = 'data:image/jpeg;base64,' + item.data
          await img.decode()
          g.drawImage(img, 0, 0, 72, 45)
          const d = g.getImageData(0, 0, 72, 45).data
          // Hero canvas sits on the right half; the opening fills the screen.
          const x0 = item.phase === 'hero' ? 36 : 0
          let s = 0
          let n = 0
          for (let y = 6; y < 40; y++) {
            for (let x = x0; x < 72; x++) {
              const i = (y * 72 + x) * 4
              s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
              n++
            }
          }
          out.push(+(s / n).toFixed(2))
        }
        return out
      }, frames.map((f) => ({ phase: f.phase, data: f.data })))
      const dips = []
      for (let i = 0; i < lum.length; i++) {
        const win = lum.slice(Math.max(0, i - 6), i).concat(lum.slice(i + 1, i + 7)).sort((a, b) => a - b)
        const med = win[Math.floor(win.length / 2)] ?? lum[i]
        if (med > 6 && lum[i] < med * 0.45) dips.push({ i, phase: frames[i].phase, lum: lum[i], med: +med.toFixed(1) })
      }
      const by = (p) => frames.filter((f) => f.phase === p).length
      runs.push({ name, frames: frames.length, hero: by('hero'), opening: by('opening'), dips: dips.length, sample: dips.slice(0, 8) })
    } finally {
      await browser.close()
    }
  }
  return JSON.stringify(runs, null, 1)
}
