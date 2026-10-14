import { describe, expect, it } from 'vitest'
import { CHESTS, VISIBLE_CHESTS } from '../config/chests'
import { RARITY_ORDER } from '../config/rarity'
import { ITEMS } from '../data/items'
import { chestPool, expectedValue, oddsTotal, rollItem, tellSequence } from './gacha'

describe('chest configuration', () => {
  it.each(CHESTS.map((c) => [c.id, c] as const))('%s odds sum to 1', (_, chest) => {
    expect(oddsTotal(chest)).toBeCloseTo(1, 6)
  })

  it.each(VISIBLE_CHESTS.map((c) => [c.id, c] as const))('%s has at least two items in every band', (_, chest) => {
    for (const { band, items } of chestPool(chest, ITEMS)) {
      expect(items.length, `${chest.id} ${band.rarity}`).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(VISIBLE_CHESTS.map((c) => [c.id, c] as const))('%s expected value is 85 to 95 percent of price', (_, chest) => {
    const ratio = expectedValue(chest, ITEMS) / chest.price
    expect(ratio).toBeGreaterThanOrEqual(0.85)
    expect(ratio).toBeLessThanOrEqual(0.95)
  })

  it('bands are contiguous and ascending', () => {
    for (const chest of VISIBLE_CHESTS) {
      chest.bands.forEach((b, i) => {
        const next = chest.bands[i + 1]
        if (next) expect(next.min).toBe(b.max)
        expect(RARITY_ORDER.indexOf(b.rarity)).toBe(i)
      })
    }
  })
})

describe('rolling', () => {
  it('lands in the band chosen by the odds', () => {
    const chest = VISIBLE_CHESTS[0]!
    // r1 just above zero picks the first band; just below one picks the last.
    expect(rollItem(chest, ITEMS, 0.000001, 0.5).rarity).toBe('common')
    expect(rollItem(chest, ITEMS, 0.999999, 0.5).rarity).toBe('relic')
  })

  it('matches the published odds over many rolls', () => {
    const chest = VISIBLE_CHESTS[1]!
    const n = 40000
    const counts: Record<string, number> = {}
    for (let i = 0; i < n; i++) {
      const r = rollItem(chest, ITEMS)
      counts[r.rarity] = (counts[r.rarity] ?? 0) + 1
    }
    for (const band of chest.bands.slice(0, 3)) {
      expect((counts[band.rarity] ?? 0) / n).toBeCloseTo(band.odds, 1)
    }
  })

  it('always returns an item whose value fits its band', () => {
    for (const chest of VISIBLE_CHESTS) {
      for (let i = 0; i < 300; i++) {
        const { item, rarity } = rollItem(chest, ITEMS)
        const band = chest.bands.find((b) => b.rarity === rarity)!
        expect(item.value).toBeGreaterThanOrEqual(band.min)
        expect(item.value).toBeLessThan(band.max)
        if (chest.filter) expect(chest.filter(item)).toBe(true)
      }
    }
  })
})

describe('rarity tell', () => {
  it('climbs one step at a time and ends on the real rarity', () => {
    for (const rarity of RARITY_ORDER) {
      for (const r of [0, 0.29, 0.31, 0.44, 0.46, 0.99]) {
        const seq = tellSequence(rarity, r)
        expect(seq[seq.length - 1]).toBe(rarity)
        seq.forEach((s, i) => {
          if (i > 0) expect(RARITY_ORDER.indexOf(s)).toBe(RARITY_ORDER.indexOf(seq[i - 1]!) + 1)
        })
      }
    }
  })
})
