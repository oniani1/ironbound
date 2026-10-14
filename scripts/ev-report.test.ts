// Prints expected value, band coverage and chance to beat the price for every chest.
// Run: node node_modules/vitest/vitest.mjs run scripts/ev-report.test.ts (or via the test runner's TS support).
import { test } from 'vitest'
import { VISIBLE_CHESTS } from '../src/config/chests'
import { ITEMS } from '../src/data/items'
import { chanceToBeatPrice, chestPool, expectedValue } from '../src/lib/gacha'

test('ev report', () => {
  for (const chest of VISIBLE_CHESTS) {
    const ev = expectedValue(chest, ITEMS)
    const lines = chestPool(chest, ITEMS).map(({ band, items }) => {
      const mean = items.length ? items.reduce((s, i) => s + i.value, 0) / items.length : 0
      return `  ${band.rarity.padEnd(9)} odds ${(band.odds * 100).toFixed(2).padStart(6)}%  items ${String(items.length).padStart(3)}  mean $${Math.round(mean).toLocaleString().padStart(9)}  contrib $${(band.odds * mean).toFixed(1)}`
    })
    console.log(`${chest.name} $${chest.price}: EV $${ev.toFixed(1)} (${((ev / chest.price) * 100).toFixed(1)}%), beats price ${(chanceToBeatPrice(chest, ITEMS) * 100).toFixed(1)}%\n${lines.join('\n')}`)
  }
})
