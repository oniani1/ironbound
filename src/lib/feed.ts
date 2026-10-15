import { useSyncExternalStore } from 'react'
import type { RarityId } from '../types'
import { CHEST_BY_ID, VISIBLE_CHESTS } from '../config/chests'
import { ITEMS } from '../data/items'
import { rollItem, rollItemIn } from './gacha'
import { rarityAtLeast } from '../config/rarity'
import { pickWeighted, random, uid } from './rng'

export interface FeedEntry {
  id: string
  name: string
  itemId: string
  chestId: string
  rarity: RarityId
  at: number
  self?: boolean
}

const MAX = 40
let entries: FeedEntry[] = []
/** Rare and better pulls, kept longer than the ticker so the wall of notable pulls fills. */
let notable: FeedEntry[] = []
const listeners = new Set<() => void>()

function keepNotable(e: FeedEntry) {
  if (rarityAtLeast(e.rarity, 'rare')) notable = [e, ...notable].slice(0, 24)
}

function emit() {
  listeners.forEach((l) => l())
}

export function pushFeed(e: Omit<FeedEntry, 'id' | 'at'>, delayMs = 0) {
  const add = () => {
    const entry = { ...e, id: uid(), at: Date.now() }
    entries = [entry, ...entries].slice(0, MAX)
    keepNotable(entry)
    emit()
  }
  if (delayMs > 0) window.setTimeout(add, delayMs)
  else add()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useFeed(): FeedEntry[] {
  return useSyncExternalStore(subscribe, () => entries, () => entries)
}

/** Notable pulls, newest first: Rare and better, yours included. */
export function useNotable(): FeedEntry[] {
  return useSyncExternalStore(subscribe, () => notable, () => notable)
}

const NAMES = [
  'Ser Aldric', 'Valka', 'ironmaiden', 'Tomas.sol', 'Brennoc', 'kn1ght_ofwands', 'Mirela', 'Halvard', 'Ysolde', 'oathkeeper',
  'Corvin', 'Sibylla', 'Dag the Smith', 'Rurik', 'Ottilie', 'pommelstrike', 'Kenji', 'Ashgrove', 'Leofric', 'Matteo',
  'Wulfric', 'Isaura', 'halberdier', 'Nadia', 'Eadric', 'Gunnhild', 'Piers', 'Akemi', 'Brannagh', 'Florian',
]

/** Popularity of each chest in the simulated feed. */
const WEIGHTS: Record<string, number> = { squire: 34, knight: 30, shogun: 14, warlord: 15, king: 7 }

function simulateOne(backdate = 0) {
  const chest = pickWeighted(VISIBLE_CHESTS, (c) => WEIGHTS[c.id] ?? 1)
  let roll
  try {
    roll = rollItem(chest, ITEMS)
  } catch {
    return
  }
  const { item, rarity } = roll
  const name = NAMES[Math.floor(random() * NAMES.length)] ?? 'Wanderer'
  const entry = { id: uid(), name, itemId: item.id, chestId: chest.id, rarity, at: Date.now() - backdate }
  entries = [entry, ...entries].slice(0, MAX)
  keepNotable(entry)
}

/** Earlier notable pulls, spread over the last day, so the wall is never empty on arrival. */
const PAST: { chest: string; rarity: RarityId; minutesAgo: number }[] = [
  { chest: 'warlord', rarity: 'epic', minutesAgo: 6 },
  { chest: 'knight', rarity: 'rare', minutesAgo: 19 },
  { chest: 'king', rarity: 'legendary', minutesAgo: 47 },
  { chest: 'shogun', rarity: 'epic', minutesAgo: 95 },
  { chest: 'squire', rarity: 'rare', minutesAgo: 160 },
  { chest: 'warlord', rarity: 'legendary', minutesAgo: 290 },
  { chest: 'knight', rarity: 'epic', minutesAgo: 520 },
  { chest: 'king', rarity: 'relic', minutesAgo: 1310 },
]

function seedNotable() {
  const seeded: FeedEntry[] = []
  PAST.forEach((p, i) => {
    const chest = CHEST_BY_ID[p.chest]
    if (!chest) return
    try {
      const { item, rarity } = rollItemIn(chest, ITEMS, p.rarity)
      if (seeded.some((s) => s.itemId === item.id)) return
      const name = NAMES[(i * 11 + 3) % NAMES.length] ?? 'Wanderer'
      seeded.push({ id: uid(), name, itemId: item.id, chestId: chest.id, rarity, at: Date.now() - p.minutesAgo * 60_000 })
    } catch {
      // An empty band in a demo pool is skipped.
    }
  })
  notable = [...notable, ...seeded].sort((a, b) => b.at - a.at).slice(0, 24)
}

let started = false

/** Seeds the feed and keeps it moving. Ordinary pulls show up too, not only the grails. */
export function startFeed() {
  if (started || typeof window === 'undefined') return
  started = true
  seedNotable()
  for (let i = 14; i > 0; i--) simulateOne(i * 9000 + random() * 6000)
  emit()
  const tick = () => {
    simulateOne()
    emit()
    window.setTimeout(tick, 2600 + random() * 4200)
  }
  window.setTimeout(tick, 2500)
}
