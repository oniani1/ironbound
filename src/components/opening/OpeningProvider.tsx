import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTexture } from '@react-three/drei'
import { CHEST_BY_ID } from '../../config/chests'
import { ITEM_BY_ID, ITEMS } from '../../data/items'
import { rollItem, rollItemIn } from '../../lib/gacha'
import { drawId, uid } from '../../lib/rng'
import { actions, getState } from '../../lib/store'
import { pushFeed } from '../../lib/feed'
import type { Chest, Pull, RarityId } from '../../types'
import type { MultiResult } from './MultiReveal'

const loadOverlay = () => import('./OpeningOverlay')
type OverlayComponent = Awaited<ReturnType<typeof loadOverlay>>['default']

export interface OpenOptions {
  trial?: boolean
  fixedItemId?: string
  onClose?: (pulls: Pull[]) => void
  /** Watch someone's pull: no charge, nothing enters the vault or the feed. */
  spectate?: { itemId: string; rarity: RarityId; by?: string }
}

export interface OpeningSession {
  key: string
  chest: Chest
  pulls: Pull[]
  results: MultiResult[]
  trial: boolean
  onClose?: (pulls: Pull[]) => void
  /** Set when watching another opener's pull. */
  spectate?: { by?: string }
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

  // The overlay's code, loaded while the browser is idle so the first opening starts at once.
  // Held in state rather than behind Suspense: a suspended boundary showed an opaque cover,
  // then the overlay faded in from transparent and showed the page again, a black flash on
  // every first opening.
  const [Overlay, setOverlay] = useState<OverlayComponent | null>(null)
  const ensureOverlay = useCallback(() => {
    void loadOverlay().then((m) => setOverlay(() => m.default))
  }, [])
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(ensureOverlay)
    else window.setTimeout(ensureOverlay, 1500)
  }, [ensureOverlay])

  const open = useCallback((chestId: string, count = 1, opts: OpenOptions = {}): OpenResult => {
    const chest = CHEST_BY_ID[chestId]
    if (!chest) return { ok: false, reason: 'unknown-chest' }
    if (opts.spectate) {
      // A replay of someone's pull: the same ritual, with no purchase and no record.
      const item = ITEM_BY_ID[opts.spectate.itemId]
      if (!item) return { ok: false, reason: 'unknown-chest' }
      useTexture.preload(item.image)
      const results: MultiResult[] = [{ uid: uid(), item, rarity: opts.spectate.rarity, draw: drawId() }]
      const watch: OpeningSession = { key: uid(), chest, pulls: [], results, trial: false, spectate: { by: opts.spectate.by } }
      if (!current.current) {
        const active = document.activeElement
        opener.current = active instanceof HTMLElement && active !== document.body ? active : null
      }
      current.current = watch
      setSession(watch)
      ensureOverlay()
      return { ok: true }
    }
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
    ensureOverlay()
    return { ok: true }
  }, [ensureOverlay])

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
      {/* The room darkens at once and the overlay fades in over it, never over the page. */}
      {session && <div className="fixed inset-0 z-50 animate-[ib-fade-in_.3s_ease-out_both] bg-ink-950" aria-hidden />}
      {session && Overlay && <Overlay key={session.key} session={session} />}
    </OpeningContext.Provider>
  )
}
