import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTexture } from '@react-three/drei'
import { CHEST_BY_ID } from '../../config/chests'
import { ITEM_BY_ID, ITEMS } from '../../data/items'
import { rollItem, rollItemIn } from '../../lib/gacha'
import { drawId, uid } from '../../lib/rng'
import { actions, getState } from '../../lib/store'
import { pushFeed } from '../../lib/feed'
import type { Chest, Pull } from '../../types'
import type { MultiResult } from './MultiReveal'

const loadOverlay = () => import('./OpeningOverlay')
const OpeningOverlay = lazy(loadOverlay)

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
  close: (opts?: { skipCallback?: boolean }) => void
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
  // Mirrors the session so close() can run its callback outside a state updater.
  const current = useRef<OpeningSession | null>(null)
  // The control that started the opening, captured before the page behind turns inert.
  const opener = useRef<HTMLElement | null>(null)

  // Once the page is interactive again, focus returns to that control if it is still there.
  useEffect(() => {
    if (session || !opener.current) return
    const el = opener.current
    opener.current = null
    if (el.isConnected) el.focus({ preventScroll: true })
  }, [session])

  // Warm the overlay code while the browser is idle, so the first opening starts at once.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(() => void loadOverlay())
    else window.setTimeout(() => void loadOverlay(), 1500)
  }, [])

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
      results.push({ uid: uid(), item: roll.item, rarity: roll.rarity, draw: drawId() })
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
      draw: r.draw,
    }))
    actions.addPulls(pulls)
    const name = getState().profile?.name ?? 'You'
    results.forEach((r) => pushFeed({ name, itemId: r.item.id, chestId: chest.id, rarity: r.rarity, self: true }, 6500))
    results.forEach((r) => useTexture.preload(r.item.image))
    const next: OpeningSession = { key: uid(), chest, pulls, results, trial, onClose: opts.onClose }
    if (!current.current) {
      const active = document.activeElement
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null
    }
    current.current = next
    setSession(next)
    return { ok: true }
  }, [])

  const close = useCallback((opts?: { skipCallback?: boolean }) => {
    const s = current.current
    if (!s) return
    current.current = null
    setSession(null)
    if (!opts?.skipCallback) s.onClose?.(s.pulls)
  }, [])

  const value = useMemo(() => ({ open, close, active: !!session }), [open, close, session])

  return (
    <OpeningContext.Provider value={value}>
      <div className="contents" inert={!!session}>
        {children}
      </div>
      {session && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-ink-950" />}>
          <OpeningOverlay key={session.key} session={session} />
        </Suspense>
      )}
    </OpeningContext.Provider>
  )
}
