import { useSyncExternalStore } from 'react'
import type { RarityId } from '../types'
import { CHEST_BY_ID, VISIBLE_CHESTS } from '../config/chests'
import { ITEMS } from '../data/items'
import { rollItem } from './gacha'
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
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function pushFeed(e: Omit<FeedEntry, 'id' | 'at'>, delayMs = 0) {
  const add = () => {
    entries = [{ ...e, id: uid(), at: Date.now() }, ...entries].slice(0, MAX)
    emit()
  }
  if (delayMs > 0) window.setTimeout(add, delayMs)
  else add()
}

export function useFeed(): FeedEntry[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => entries,
    () => entries,
  )
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
  entries = [{ id: uid(), name, itemId: item.id, chestId: chest.id, rarity, at: Date.now() - backdate }, ...entries].slice(0, MAX)
}

let started = false

/** Seeds the feed and keeps it moving. Ordinary pulls show up too, not only the grails. */
export function startFeed() {
  if (started || typeof window === 'undefined') return
  started = true
  for (let i = 14; i > 0; i--) simulateOne(i * 9000 + random() * 6000)
  // A couple of memorable recent pulls so the feed is not all commons on first load.
  const big = ITEMS.filter((i) => i.value > 8000).sort(() => random() - 0.5).slice(0, 2)
  big.forEach((item, i) => {
    const chest = CHEST_BY_ID[item.value > 60000 ? 'king' : 'warlord'] ?? VISIBLE_CHESTS[0]!
    entries.splice(3 + i * 4, 0, { id: uid(), name: NAMES[(i * 7) % NAMES.length] ?? 'Wanderer', itemId: item.id, chestId: chest.id, rarity: i === 0 ? 'legendary' : 'epic', at: Date.now() - (40000 + i * 50000) })
  })
  emit()
  const tick = () => {
    simulateOne()
    emit()
    window.setTimeout(tick, 2600 + random() * 4200)
  }
  window.setTimeout(tick, 2500)
}
