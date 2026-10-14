import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useTexture } from '@react-three/drei'
import { CHEST_BY_ID } from '../../config/chests'
import { ITEM_BY_ID, ITEMS } from '../../data/items'
import { rollItem, rollItemIn } from '../../lib/gacha'
import { uid } from '../../lib/rng'
import { actions, getState } from '../../lib/store'
import { pushFeed } from '../../lib/feed'
import type { Chest, Pull } from '../../types'
import type { MultiResult } from './MultiReveal'

const OpeningOverlay = lazy(() => import('./OpeningOverlay'))

export interface OpenOptions {
  trial?: boolean
  fixedItemId?: string
  onClose?: (pulls: Pull[]) => void
}

export interface OpeningSession {
  key: string
  chest: Chest
  pulls: Pull[]
  results: MultiResult[]
  trial: boolean
  onClose?: (pulls: Pull[]) => void
}

type OpenResult = { ok: true } | { ok: false; reason: 'funds' | 'unknown-chest' }

interface Ctx {
  open: (chestId: string, count?: number, opts?: OpenOptions) => OpenResult
  close: () => void
  active: boolean
}

const OpeningContext = createContext<Ctx | null>(null)

export function useOpening() {
  const ctx = useContext(OpeningContext)
  if (!ctx) throw new Error('useOpening must be used inside OpeningProvider')
  return ctx
}

export function OpeningProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpeningSession | null>(null)

  const open = useCallback((chestId: string, count = 1, opts: OpenOptions = {}): OpenResult => {
    const chest = CHEST_BY_ID[chestId]
    if (!chest) return { ok: false, reason: 'unknown-chest' }
    const trial = !!opts.trial
    const total = chest.price * count
    if (!trial && !actions.spend(total)) return { ok: false, reason: 'funds' }
    const now = Date.now()
    const results: MultiResult[] = []
    const force = trial ? null : getState().settings.force
    for (let i = 0; i < count; i++) {
      const fixed = opts.fixedItemId ? ITEM_BY_ID[opts.fixedItemId] : undefined
      const roll = fixed
        ? { item: fixed, rarity: chest.bands[0]?.rarity ?? 'rare' }
        : force && i === count - 1
          ? rollItemIn(chest, ITEMS, force)
          : rollItem(chest, ITEMS)
      results.push({ uid: uid(), item: roll.item, rarity: roll.rarity })
    }
    if (force) actions.setForce(null)
    const pulls: Pull[] = results.map((r, i) => ({
      uid: r.uid,
      itemId: r.item.id,
      chestId: chest.id,
      rarity: r.rarity,
      price: chest.price,
      value: r.item.value,
      at: now + i,
      status: 'vaulted',
    }))
    actions.addPulls(pulls)
    const name = getState().profile?.name ?? 'You'
    results.forEach((r) => pushFeed({ name, itemId: r.item.id, chestId: chest.id, rarity: r.rarity, self: true }, 6500))
    results.forEach((r) => useTexture.preload(r.item.image))
    setSession({ key: uid(), chest, pulls, results, trial, onClose: opts.onClose })
    return { ok: true }
  }, [])

  const close = useCallback(() => {
    setSession((s) => {
      s?.onClose?.(s.pulls)
      return null
    })
  }, [])

  const value = useMemo(() => ({ open, close, active: !!session }), [open, close, session])

  return (
    <OpeningContext.Provider value={value}>
      {children}
      {session && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-ink-950" />}>
          <OpeningOverlay key={session.key} session={session} />
        </Suspense>
      )}
    </OpeningContext.Provider>
  )
}
