import { describe, expect, it } from 'vitest'
import { CHESTS, TRIAL_ITEM_ID, VISIBLE_CHESTS } from '../config/chests'
import { RARITIES, RARITY_ORDER } from '../config/rarity'
import { ARCHIVE_BY_ID, ITEM_BY_ID, ITEMS } from '../data/items'
import { buybackOffer, chestPool, expectedValue, oddsTotal, rollItem } from './gacha'
import { revealFacts } from './facts'

describe('chest configuration', () => {
  it.each(CHESTS.map((c) => [c.id, c] as const))('%s odds sum to 1', (_, chest) => {
    expect(oddsTotal(chest)).toBeCloseTo(1, 6)
  })

  it.each(VISIBLE_CHESTS.map((c) => [c.id, c] as const))('%s has three pieces in Common and Uncommon and two in every other band', (_, chest) => {
    for (const { band, items } of chestPool(chest, ITEMS)) {
      expect(items.length, `${chest.id} ${band.rarity}`).toBeGreaterThanOrEqual(band.rarity === 'common' || band.rarity === 'uncommon' ? 3 : 2)
    }
  })

  it.each(VISIBLE_CHESTS.map((c) => [c.id, c] as const))('%s expected value is 88 to 92 percent of price', (_, chest) => {
    const ratio = expectedValue(chest, ITEMS) / chest.price
    expect(ratio).toBeGreaterThanOrEqual(0.88)
    expect(ratio).toBeLessThanOrEqual(0.92)
  })

  it('the trial chest draws a piece, and the piece every new player receives is in the catalog', () => {
    const trial = CHESTS.find((c) => c.id === 'trial')!
    expect(chestPool(trial, ITEMS)[0]!.items.length).toBeGreaterThan(0)
    expect(ITEM_BY_ID[TRIAL_ITEM_ID]).toBeDefined()
  })

  // The founder's third review: not always a Common. Uncommon and better come up about half the time.
  it.each(VISIBLE_CHESTS.map((c) => [c.id, c] as const))('%s gives better than Common about half the time', (_, chest) => {
    const odds = (r: string) => chest.bands.find((b) => b.rarity === r)?.odds ?? 0
    expect(odds('common')).toBeLessThanOrEqual(0.55)
    expect(odds('uncommon')).toBeGreaterThanOrEqual(0.25)
    expect(odds('rare')).toBeGreaterThanOrEqual(0.1)
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

describe('reveal facts', () => {
  it('tells origin, type, age and date before anything else, weight last', () => {
    const antique = ITEMS.find((i) => i.provenance === 'antique' && i.weight && i.era.startsWith('c. '))!
    expect(revealFacts(antique).map((f) => f.label)).toEqual(['Origin', 'Type', 'Age', 'Made', 'Weight'])
    expect(revealFacts(antique)[2]!.value).toBe('Antique')
    expect(revealFacts(antique)[3]!.value).toMatch(/^Around \d/)
  })

  it('names the maker for newly forged pieces and skips a missing weight', () => {
    const forged = ITEMS.find((i) => i.provenance === 'forged' && i.maker)!
    const facts = revealFacts({ ...forged, weight: undefined })
    expect(facts.map((f) => f.label)).toEqual(['Origin', 'Type', 'Age', 'Maker'])
    expect(facts[3]!.value).toBe(forged.maker)
  })

  it('never gives away the name or the rarity', () => {
    const rarityWord = new RegExp(`\\b(${Object.values(RARITIES).map((r) => r.label).join('|')})\\b`, 'i')
    for (const item of ITEMS) {
      for (const f of revealFacts(item)) {
        expect(f.value).not.toContain(item.name)
        expect(`${f.label} ${f.value}`).not.toMatch(rarityWord)
      }
    }
  })
})

describe('catalog', () => {
  // Whole pieces only (founder, fourth review). Pulled fittings live on as archived records.
  it('holds no fittings', () => {
    expect(ITEMS.filter((i) => i.category === 'fitting').map((i) => i.id)).toEqual([])
  })

  it('names every piece once and keeps ids apart from the archive', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('sell-back and retired pieces', () => {
  it('offers whole dollars at the chest rate', () => {
    expect(buybackOffer(313, { buyback: 0.9 })).toBe(282)
    for (const chest of VISIBLE_CHESTS) {
      for (const item of ITEMS) expect(Number.isInteger(buybackOffer(item.value, chest))).toBe(true)
    }
  })

  it('keeps a record of every retired piece apart from the catalog', () => {
    const archived = Object.values(ARCHIVE_BY_ID)
    expect(archived.length).toBeGreaterThan(0)
    for (const record of archived) {
      expect(ITEM_BY_ID[record.id], record.id).toBeUndefined()
      expect(record.name && record.era && record.origin && record.category, record.id).toBeTruthy()
    }
  })
})
