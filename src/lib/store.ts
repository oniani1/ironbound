import { useSyncExternalStore } from 'react'
import type { Arms, Pull, RarityId } from '../types'

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

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<State>
    if (parsed.version !== 2) return initial
    return { ...initial, ...parsed, settings: { ...initial.settings, ...parsed.settings }, stats: { ...initial.stats, ...parsed.stats } }
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
  sellBack(uid: string, amount: number) {
    setState((s) => ({
      balance: s.balance + amount,
      pulls: s.pulls.map((p) => (p.uid === uid ? { ...p, status: 'sold' as const, soldFor: amount } : p)),
      stats: { ...s.stats, soldFor: s.stats.soldFor + amount },
    }))
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
