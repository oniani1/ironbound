import { useSyncExternalStore } from 'react'
import type { Arms, Ordinary, Pull, PullStatus, RarityId, Tincture } from '../types'

export interface Profile {
  name: string
  arms: Arms
}

export interface State {
  version: 2
  profile: Profile | null
  onboarded: boolean
  signedIn: boolean
  signInMethod: 'email' | 'google' | 'wallet' | null
  balance: number
  pulls: Pull[]
  settings: { fast: boolean; force: RarityId | null }
  stats: { spent: number; opened: number; soldFor: number }
}

const KEY = 'ironbound:v2'

const initial: State = {
  version: 2,
  profile: null,
  onboarded: false,
  signedIn: false,
  signInMethod: null,
  balance: 0,
  pulls: [],
  settings: { fast: false, force: null },
  stats: { spent: 0, opened: 0, soldFor: 0 },
}

// The values a saved state may hold. Records keep them in step with the types.
const RARITY_IDS: Record<RarityId, true> = { common: true, uncommon: true, rare: true, epic: true, legendary: true, relic: true }
const STATUS_IDS: Record<PullStatus, true> = { vaulted: true, sold: true, shipping: true, shipped: true }
const TINCTURE_IDS: Record<Tincture, true> = { or: true, argent: true, gules: true, azure: true, vert: true, sable: true, purpure: true }
const ORDINARY_IDS: Record<Ordinary, true> = { chevron: true, saltire: true, cross: true, bend: true, pale: true, fess: true, chief: true, quarterly: true }
const METHOD_IDS: Record<NonNullable<State['signInMethod']>, true> = { email: true, google: true, wallet: true }

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const oneOf = <T extends string>(ids: Record<T, true>, v: unknown): v is T => typeof v === 'string' && Object.hasOwn(ids, v)
const finite = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

function readArms(v: unknown): Arms | null {
  return isObject(v) && oneOf(TINCTURE_IDS, v.field) && oneOf(TINCTURE_IDS, v.charge) && oneOf(ORDINARY_IDS, v.ordinary) ? { field: v.field, charge: v.charge, ordinary: v.ordinary } : null
}

function readShipment(v: unknown): Pull['shipment'] {
  if (!isObject(v) || (v.method !== 'standard' && v.method !== 'express')) return undefined
  const { name, city, country, eta, tracking } = v
  if (![name, city, country, eta, tracking].every((s) => typeof s === 'string')) return undefined
  return { name, city, country, eta, tracking, method: v.method } as NonNullable<Pull['shipment']>
}

function readPull(v: unknown): Pull | null {
  if (!isObject(v) || typeof v.uid !== 'string' || typeof v.itemId !== 'string' || typeof v.chestId !== 'string') return null
  if (!oneOf(RARITY_IDS, v.rarity) || !oneOf(STATUS_IDS, v.status)) return null
  const pull: Pull = { uid: v.uid, itemId: v.itemId, chestId: v.chestId, rarity: v.rarity, status: v.status, price: finite(v.price, 0), value: finite(v.value, 0), at: finite(v.at, 0) }
  if (typeof v.draw === 'string') pull.draw = v.draw
  if (typeof v.soldFor === 'number' && Number.isFinite(v.soldFor)) pull.soldFor = v.soldFor
  const shipment = readShipment(v.shipment)
  if (shipment) pull.shipment = shipment
  return pull
}

/**
 * Reads a saved state field by field. Anything malformed falls back to its default and a
 * broken pull is dropped, so an edited or damaged save can never stop the app from starting.
 */
export function parseSave(raw: string | null): State {
  let saved: unknown
  try {
    saved = raw ? JSON.parse(raw) : null
  } catch {
    return initial
  }
  if (!isObject(saved) || saved.version !== 2) return initial
  const p = saved.profile
  const arms = isObject(p) ? readArms(p.arms) : null
  const settings = isObject(saved.settings) ? saved.settings : {}
  const stats = isObject(saved.stats) ? saved.stats : {}
  return {
    version: 2,
    profile: isObject(p) && typeof p.name === 'string' && arms ? { name: p.name, arms } : null,
    onboarded: saved.onboarded === true,
    signedIn: saved.signedIn === true,
    signInMethod: oneOf(METHOD_IDS, saved.signInMethod) ? saved.signInMethod : null,
    balance: Math.max(0, finite(saved.balance, 0)),
    pulls: Array.isArray(saved.pulls) ? saved.pulls.map(readPull).filter((x): x is Pull => x !== null) : [],
    settings: { fast: settings.fast === true, force: oneOf(RARITY_IDS, settings.force) ? settings.force : null },
    stats: { spent: finite(stats.spent, 0), opened: finite(stats.opened, 0), soldFor: finite(stats.soldFor, 0) },
  }
}

function load(): State {
  try {
    return parseSave(localStorage.getItem(KEY))
  } catch {
    return initial
  }
}

let state: State = typeof window === 'undefined' ? initial : load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode or quota: the demo still works for this session.
  }
}

export function getState(): State {
  return state
}

export function setState(update: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof update === 'function' ? update(state) : update
  state = { ...state, ...patch }
  persist()
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(initial))
}

export const actions = {
  setProfile(profile: Profile) {
    setState({ profile })
  },
  completeOnboarding() {
    setState({ onboarded: true })
  },
  signIn(method: NonNullable<State['signInMethod']>, credit = 1000) {
    setState((s) => ({ signedIn: true, signInMethod: method, balance: s.balance + credit }))
  },
  /** Deducts the price if affordable. Returns false when the purse is short. */
  spend(amount: number): boolean {
    if (amount > state.balance) return false
    setState((s) => ({ balance: s.balance - amount, stats: { ...s.stats, spent: s.stats.spent + amount } }))
    return true
  },
  addFunds(amount: number) {
    setState((s) => ({ balance: s.balance + amount }))
  },
  addPulls(pulls: Pull[]) {
    setState((s) => ({ pulls: [...pulls, ...s.pulls], stats: { ...s.stats, opened: s.stats.opened + pulls.length } }))
  },
  /** Takes back pulls that were never revealed, such as a free chest closed before its seal broke. */
  removePulls(uids: string[]) {
    setState((s) => ({ pulls: s.pulls.filter((p) => !uids.includes(p.uid)), stats: { ...s.stats, opened: Math.max(0, s.stats.opened - uids.length) } }))
  },
  /** Sells a piece in the vault back for credit. A piece already sold, shipped or gone is left alone, so a second tap never pays twice. */
  sellBack(uid: string, amount: number) {
    setState((s) => {
      if (!s.pulls.some((p) => p.uid === uid && p.status === 'vaulted')) return {}
      return {
        balance: s.balance + amount,
        pulls: s.pulls.map((p) => (p.uid === uid ? { ...p, status: 'sold' as const, soldFor: amount } : p)),
        stats: { ...s.stats, soldFor: s.stats.soldFor + amount },
      }
    })
  },
  /** Takes back a sale made a moment ago: the piece returns to the vault, the credit leaves the purse. */
  undoSell(uid: string) {
    setState((s) => {
      const pull = s.pulls.find((p) => p.uid === uid)
      if (!pull || pull.status !== 'sold' || pull.soldFor == null) return {}
      const amount = pull.soldFor
      return {
        balance: s.balance - amount,
        pulls: s.pulls.map((p) => (p.uid === uid ? { ...p, status: 'vaulted' as const, soldFor: undefined } : p)),
        stats: { ...s.stats, soldFor: s.stats.soldFor - amount },
      }
    })
  },
  ship(uid: string, shipment: NonNullable<Pull['shipment']>) {
    setState((s) => ({ pulls: s.pulls.map((p) => (p.uid === uid ? { ...p, status: 'shipping' as const, shipment } : p)) }))
  },
  setFast(fast: boolean) {
    setState((s) => ({ settings: { ...s.settings, fast } }))
  },
  /** Demo control: the next pull lands in this rarity, then it clears. */
  setForce(force: RarityId | null) {
    setState((s) => ({ settings: { ...s.settings, force } }))
  },
  reset() {
    state = initial
    persist()
    listeners.forEach((l) => l())
  },
}
