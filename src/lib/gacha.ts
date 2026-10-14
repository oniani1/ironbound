import type { Chest, ChestBand, Item, RarityId } from '../types'
import { RARITY_ORDER } from '../config/rarity'
import { pickOne, pickWeighted, random } from './rng'

/** The items a chest can draw from, after its filter. */
export function chestItems(chest: Chest, items: readonly Item[]): Item[] {
  return chest.filter ? items.filter(chest.filter) : [...items]
}

export function bandItems(band: Pick<ChestBand, 'min' | 'max'>, items: readonly Item[]): Item[] {
  return items.filter((i) => i.value >= band.min && i.value < band.max)
}

/** Items in a chest's pool, grouped by the rarity they carry in that chest. */
export function chestPool(chest: Chest, items: readonly Item[]) {
  const all = chestItems(chest, items)
  return chest.bands.map((band) => ({ band, items: bandItems(band, all).sort((a, b) => b.value - a.value) }))
}

export function rarityInChest(chest: Chest, value: number): RarityId {
  const band = chest.bands.find((b) => value >= b.min && value < b.max)
  if (band) return band.rarity
  return value < (chest.bands[0]?.min ?? 0) ? 'common' : 'relic'
}

export function rollRarity(chest: Chest, r: number = random()): RarityId {
  return pickWeighted(chest.bands, (b) => b.odds, r).rarity
}

export interface Roll {
  item: Item
  rarity: RarityId
}

/** Picks a rarity by the chest's odds, then an item inside that band. Empty bands fall back downward. */
export function rollItem(chest: Chest, items: readonly Item[], r1: number = random(), r2: number = random()): Roll {
  const rarity = rollRarity(chest, r1)
  const all = chestItems(chest, items)
  const start = chest.bands.findIndex((b) => b.rarity === rarity)
  for (let i = start; i >= 0; i--) {
    const band = chest.bands[i]
    if (!band) continue
    const pool = bandItems(band, all)
    if (pool.length) return { item: pickOne(pool, r2), rarity: band.rarity }
  }
  throw new Error(`Chest ${chest.id} has an empty pool`)
}

/** Demo helper: an item from a chosen rarity band, falling back to the nearest lower band. */
export function rollItemIn(chest: Chest, items: readonly Item[], rarity: RarityId, r: number = random()): Roll {
  const all = chestItems(chest, items)
  const start = chest.bands.findIndex((b) => b.rarity === rarity)
  for (let i = start < 0 ? chest.bands.length - 1 : start; i >= 0; i--) {
    const band = chest.bands[i]
    if (!band) continue
    const pool = bandItems(band, all)
    if (pool.length) return { item: pickOne(pool, r), rarity: band.rarity }
  }
  return rollItem(chest, items)
}

export function expectedValue(chest: Chest, items: readonly Item[]): number {
  const all = chestItems(chest, items)
  return chest.bands.reduce((sum, band) => {
    const pool = bandItems(band, all)
    if (!pool.length) return sum
    const mean = pool.reduce((s, i) => s + i.value, 0) / pool.length
    return sum + band.odds * mean
  }, 0)
}

export function oddsTotal(chest: Chest): number {
  return chest.bands.reduce((s, b) => s + b.odds, 0)
}

/** Chance to pull an item worth more than the chest price. */
export function chanceToBeatPrice(chest: Chest, items: readonly Item[]): number {
  const all = chestItems(chest, items)
  return chest.bands.reduce((sum, band) => {
    const pool = bandItems(band, all)
    if (!pool.length) return sum
    const winners = pool.filter((i) => i.value > chest.price).length
    return sum + band.odds * (winners / pool.length)
  }, 0)
}

/**
 * The colors the chest light shows before the reveal. High rarities start lower and
 * climb, one step at a time, so the player feels each upgrade. Never climbs past the
 * real result and never fakes a downgrade.
 */
export function tellSequence(rarity: RarityId, r: number = random()): RarityId[] {
  const idx = RARITY_ORDER.indexOf(rarity)
  if (idx <= 1) return [rarity]
  // Rare: sometimes upgrades from uncommon. Epic and above: start at rare, sometimes uncommon.
  let start: number
  if (idx === 2) start = r < 0.45 ? 1 : 2
  else start = r < 0.3 ? 1 : 2
  return RARITY_ORDER.slice(start, idx + 1)
}

export function multiplier(value: number, price: number): number {
  return price > 0 ? value / price : 0
}
