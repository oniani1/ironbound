import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { FastForward, X } from '@phosphor-icons/react'
import { ChestScene } from '../chest3d/ChestScene'
import { ChestAnim } from '../chest3d/animState'
import { applyCharge, introTimeline, revealTimeline, settleReveal, type Phase } from '../chest3d/timeline'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import type { RarityId } from '../../types'
import { chestPool } from '../../lib/gacha'
import { ITEMS } from '../../data/items'
import { ItemImg } from '../ui/ItemImg'
import { actions, useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { money } from '../../lib/format'
import { revealFacts } from '../../lib/facts'
import { HoldToOpen, type HoldHandle } from './HoldToOpen'
import { IconButton } from '../ui/Button'
import { Pips } from '../ui/RarityTag'
import { RevealCard } from './RevealCard'
import { MultiReveal } from './MultiReveal'
import { useOpening, type OpeningSession } from './OpeningProvider'

/** How long the piece is named on its own before the receipt, by rarity tier. */
const TITLE_MS: Record<number, number> = { 1: 750, 2: 900, 3: 1100, 4: 1250, 5: 1500, 6: 1700 }

function useReducedMotion() {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
}

export default function OpeningOverlay({ session }: { session: OpeningSession }) {
  const { chest, results, trial, spectate } = session
  const multi = results.length > 1
  const anim = useMemo(() => new ChestAnim(), [])
  const tl = useRef<gsap.core.Timeline | null>(null)
  const hold = useRef<HoldHandle>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [soldUids, setSoldUids] = useState<Set<string>>(new Set())
  // The rarity, once named, and how many facts about the piece are showing.
  const [named, setNamed] = useState<RarityId | null>(null)
  const [beat, setBeat] = useState(-1)
  const [cardReady, setCardReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const skipBtn = useRef<HTMLButtonElement>(null)
  const fast = useStore((s) => s.settings.fast)
  const balance = useStore((s) => s.balance)
  const reduced = useReducedMotion()
  const { open, close } = useOpening()
  const navigate = useNavigate()

  const best = useMemo(
    () => results.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a)),
    [results],
  )
  const first = results[0]!
  const facts = useMemo(() => revealFacts(first.item), [first.item])
  const fastRef = useRef(fast)
  fastRef.current = fast

  const startReveal = useCallback(() => {
    tl.current?.kill()
    if (reduced) {
      // Reduced motion: no flight, no flashes. The result fades in.
      settleReveal(anim, best.rarity, multi)
      setPhase('reveal')
      return
    }
    // Once the seal breaks the rest plays by itself: the lid opens, the camera studies the
    // piece while the facts come one by one, and the rarity is named last.
    tl.current = revealTimeline(anim, { rarity: best.rarity, fast: fastRef.current, multi, reducedMotion: reduced, onPhase: setPhase, onRarity: setNamed, beats: facts.length, onBeat: setBeat })
  }, [anim, multi, reduced, best.rarity, facts.length])

  // The seal heats and strains as the charge builds.
  const onCharge = useCallback((p: number) => applyCharge(anim, p), [anim])

  // Intro: the chest drops onto the plinth. In fast mode the seal breaks by itself.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    tl.current = introTimeline(
      anim,
      () => {
        // Fast mode and spectators break the seal by themselves; spectators see it strain first.
        if (fastRef.current || spectate) {
          const o = { p: 0 }
          tl.current = gsap.timeline()
          tl.current.to(o, { p: 1, duration: fastRef.current ? 0.08 : 1.1, ease: 'power1.in', onUpdate: () => applyCharge(anim, o.p), onComplete: startReveal })
        } else setPhase('await')
      },
      fastRef.current,
    )
    return () => {
      tl.current?.kill()
      document.body.style.overflow = ''
    }
  }, [anim, startReveal])

  const skip = useCallback(() => {
    tl.current?.kill()
    settleReveal(anim, best.rarity, multi)
    setPhase('reveal')
  }, [anim, best.rarity, multi])

  const replay = useCallback(() => {
    tl.current?.kill()
    if (reduced) {
      // Reduced motion: no second flight. The card fades out and back in.
      setPhase('tell')
      window.setTimeout(() => setPhase('reveal'), 200)
      return
    }
    anim.reset()
    anim.idle = 0
    setBeat(-1)
    setNamed(null)
    setPhase('tell')
    window.setTimeout(() => {
      tl.current = revealTimeline(anim, { rarity: best.rarity, fast: false, multi, reducedMotion: reduced, onPhase: setPhase, onRarity: setNamed, beats: facts.length, onBeat: setBeat })
    }, 250)
  }, [anim, multi, reduced, best.rarity, facts.length])

  // Phones: frame the piece in the band above the result sheet, whatever its height.
  const onCardHeight = useCallback(
    (px: number) => {
      if (window.innerWidth < 768) anim.sheet = Math.min(0.72, px / window.innerHeight)
    },
    [anim],
  )

  // Inspect: the card steps aside and the camera centers the piece. Zoom resets on the way out.
  useEffect(() => {
    anim.cardSide = collapsed ? 0 : 1
    anim.zoom = 0
    anim.panY = 0
  }, [collapsed, anim])

  // Inspect gestures: wheel or pinch to zoom, drag to look along the piece, double tap to jump in.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const setZoom = (z: number) => {
    anim.zoom = Math.max(0, Math.min(1, z))
    if (anim.zoom === 0) anim.panY = 0
  }
  const pan = (dy: number) => {
    anim.panY = Math.max(-0.5, Math.min(0.5, anim.panY + (dy / window.innerHeight) * (0.6 + anim.zoom)))
  }
  useEffect(() => {
    if (!collapsed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setZoom(anim.zoom + 0.2)
      else if (e.key === '-') setZoom(anim.zoom - 0.2)
      else if (e.key === '0') setZoom(0)
      else if (e.key === 'ArrowUp') pan(-60)
      else if (e.key === 'ArrowDown') pan(60)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [collapsed, anim])

  // Let the player look at the piece before the receipt slides in.
  useEffect(() => {
    if (phase !== 'reveal') {
      setCardReady(false)
      setCollapsed(false)
      return
    }
    const ms = fastRef.current || reduced || multi ? 0 : TITLE_MS[RARITIES[best.rarity].tier] ?? 900
    const t = window.setTimeout(() => setCardReady(true), ms)
    return () => window.clearTimeout(t)
  }, [phase, reduced, multi, best.rarity])

  // Keyboard focus: Close while the chest lands, the seal while it waits, Skip while it
  // opens, the result card after. The provider returns it to the launcher on exit.
  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    if (phase === 'tell') skipBtn.current?.focus({ preventScroll: true })
  }, [phase])

  // Close works from the first frame. Before the seal breaks, a free chest stays unopened;
  // a paid opening keeps its pieces in the vault.
  const exit = useCallback(() => {
    if (spectate) {
      tl.current?.kill()
      return close({ skipCallback: true })
    }
    if (phase === 'reveal') return close()
    tl.current?.kill()
    if (trial && (phase === 'intro' || phase === 'await')) {
      actions.removePulls(session.pulls.map((p) => p.uid))
      return close({ skipCallback: true })
    }
    if (!trial) toast(results.length > 1 ? `Your ${results.length} ${chest.name} pulls are in your vault.` : `Your ${chest.name} pull is in your vault.`)
    close()
  }, [phase, trial, spectate, session.pulls, results.length, chest.name, close])

  // Fast switched on while waiting: break the seal now.
  useEffect(() => {
    if (!fast || phase !== 'await') return
    hold.current?.stop()
    tl.current?.kill()
    const o = { p: 0 }
    tl.current = gsap.timeline()
    tl.current.to(o, { p: 1, duration: 0.08, ease: 'power1.in', onUpdate: () => applyCharge(anim, o.p), onComplete: startReveal })
  }, [fast, phase, anim, startReveal])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
      if ((e.key === 's' || e.key === 'S') && (phase === 'tell' || phase === 'rise' || phase === 'burst')) skip()
      // Tab cycles inside the opening; the batch Inspect sheet runs its own cycle.
      if (e.key === 'Tab' && root.current && !e.defaultPrevented) {
        const active = document.activeElement
        if (active?.closest('[data-testid="multi-inspect"], [data-testid="share-sheet"]')) return
        const nodes = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((n) => n.getClientRects().length > 0)
        const firstNode = nodes[0]
        const lastNode = nodes[nodes.length - 1]
        if (!firstNode || !lastNode) return
        if (!active || !root.current.contains(active)) {
          e.preventDefault()
          firstNode.focus()
        } else if (e.shiftKey && active === firstNode) {
          e.preventDefault()
          lastNode.focus()
        } else if (!e.shiftKey && active === lastNode) {
          e.preventDefault()
          firstNode.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, exit, skip])

  const sell = (uids: string[]) => {
    uids.forEach((u) => {
      const r = results.find((x) => x.uid === u)!
      actions.sellBack(u, Math.round(r.item.value * chest.buyback))
    })
    setSoldUids((s) => {
      const n = new Set(s)
      uids.forEach((u) => n.add(u))
      return n
    })
  }

  const again = () => {
    const res = open(chest.id, results.length)
    if (!res.ok) return
  }

  const canAfford = balance >= chest.price * results.length
  const tease = useMemo(
    () =>
      chestPool(chest, ITEMS)
        .flatMap((g) => g.items)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4),
    [chest],
  )
  const rarityHex = RARITIES[best.rarity].hex
  // The facts run while the camera studies the piece; the burst belongs to the rarity.
  const fact = beat >= 0 ? facts[beat] : undefined
  const showFacts = !multi && phase === 'rise' && !!fact

  return (
    <motion.div
      ref={root}
      data-lenis-prevent
      className="fixed inset-0 z-50 overflow-hidden bg-ink-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.2 : 0.35 }}
      data-testid="opening-overlay"
      data-phase={phase}
    >
      <ChestScene theme={chest.theme} anim={anim} item={multi ? null : first.item} rarityHex={rarityHex} itemGlow={0.3 + RARITIES[best.rarity].tier * 0.12} className="!absolute inset-0" />

      {/* While waiting, a press anywhere on the scene charges the seal. */}
      {phase === 'await' && (
        <div
          className="absolute inset-0 touch-none select-none"
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            hold.current?.start()
          }}
          onPointerUp={() => hold.current?.stop()}
          onPointerCancel={() => hold.current?.stop()}
          onContextMenu={(e) => e.preventDefault()}
          aria-hidden
        />
      )}

      {/* Rarity wash at the screen edges for the biggest pulls. */}
      <AnimatePresence>
        {phase === 'burst' && RARITIES[best.rarity].tier >= 5 && !reduced && (
          <motion.div
            key="wash"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, times: [0, 0.15, 1] }}
            style={{ background: `radial-gradient(120% 90% at 50% 60%, transparent 45%, color-mix(in oklch, ${RARITIES[best.rarity].cssVar} 30%, transparent))` }}
          />
        )}
      </AnimatePresence>

      {/* Top bar. */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 ${multi && phase === 'reveal' ? 'bg-[linear-gradient(180deg,var(--color-ink-950)_60%,transparent)] pb-5' : ''}`}
      >
        <div className="min-w-0">
          <p className="eyebrow truncate">
            {spectate ? (
              <>
                {/* Phones keep the disclosure whole; the name of the opener fits on wider screens. */}
                <span className="sm:hidden">Simulated replay</span>
                <span className="hidden sm:inline">Watching {spectate.by === 'You' ? 'your' : spectate.by ? `${spectate.by}'s` : 'a'} pull · simulated</span>
              </>
            ) : trial ? (
              'Your first chest'
            ) : (
              chest.epithet
            )}
          </p>
          <p className="font-display truncate text-xl font-semibold text-bone-50">
            {trial ? 'Trial Chest' : chest.name}
            {multi && <span className="ml-2 text-base font-normal text-bone-300">× {results.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            role="switch"
            aria-checked={fast}
            aria-label="Fast opening"
            onClick={() => actions.setFast(!fast)}
            className="flex h-11 items-center gap-2.5 whitespace-nowrap rounded-full bg-ink-950/70 px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-300 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_14%,transparent)] transition-colors hover:text-bone-100"
          >
            <span className={`relative block h-[14px] w-[24px] rounded-full transition-colors duration-200 ${fast ? 'bg-brass-500' : 'bg-bone-100/15'}`} aria-hidden>
              <span className={`absolute top-[2px] block h-[10px] w-[10px] rounded-full bg-bone-50 transition-[left] duration-200 ${fast ? 'left-[12px]' : 'left-[2px]'}`} />
            </span>
            Fast
          </button>
          {(phase === 'tell' || phase === 'rise' || phase === 'burst') && (
            <button
              ref={skipBtn}
              data-testid="skip"
              onClick={skip}
              className="flex min-h-11 items-center gap-2 rounded-full bg-ink-950/70 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-100 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_18%,transparent)] transition-colors hover:bg-bone-100/10 max-sm:fixed max-sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:px-6"
            >
              Skip <FastForward size={14} weight="light" aria-hidden />
            </button>
          )}
          <IconButton ref={closeBtn} size="lg" onClick={exit} className="bg-ink-950/70" aria-label="Close">
            <X size={18} weight="light" />
          </IconButton>
        </div>
      </div>

      {/* While the seal is intact, a quiet reminder of what could be inside. */}
      <AnimatePresence>
        {(phase === 'await' || phase === 'intro') && !trial && (
          <motion.div
            className="pointer-events-none absolute left-4 top-[calc(max(1rem,env(safe-area-inset-top))+64px)] sm:left-6"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow">Could be inside</p>
            <div className="mt-3 flex gap-3">
              {tease.map((it) => (
                <div key={it.id} className="w-[56px] text-center">
                  <div className="vitrine h-[56px] p-1">
                    <ItemImg item={it} className="h-full w-full" />
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-bone-300 tabular">{money(it.value, { compact: true })}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold to open. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[22%] flex justify-center sm:bottom-[max(2.5rem,env(safe-area-inset-bottom))]">
        <AnimatePresence>
          {phase === 'await' && (
            <div className="pointer-events-auto">
              <HoldToOpen
                ref={hold}
                autoFocus
                onProgress={onCharge}
                onComplete={startReveal}
                hint={trial ? 'Press and hold anywhere on the seal. Release and it cools.' : undefined}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* What the piece is, one fact at a time, while the camera studies it: earlier facts
          gather in a ledger line, the newest is set large. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[17%] flex justify-center px-5 sm:bottom-[11%] sm:justify-start sm:pl-[max(2rem,6vw)]" aria-live="polite">
        <AnimatePresence>
          {showFacts && fact && (
            <motion.div
              key="facts"
              // A quiet shade behind the words, so they read on bright steel as well as on dark.
              className="flex max-w-[min(92vw,680px)] flex-col items-center bg-[radial-gradient(closest-side,oklch(8%_0.01_60/.6),transparent)] px-10 py-6 text-center sm:-ml-10 sm:items-start sm:text-left"
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              data-testid="reveal-facts"
              data-beat={beat}
            >
              <p className="caps flex min-h-[1.2em] flex-wrap justify-center gap-x-2 text-bone-300 [text-shadow:0_1px_10px_oklch(0%_0_0/.95)] sm:justify-start">
                {facts.slice(0, beat).map((f, i) => (
                  <motion.span key={f.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
                    {i > 0 && (
                      <span className="mr-2 text-bone-500" aria-hidden>
                        ·
                      </span>
                    )}
                    {f.value}
                  </motion.span>
                ))}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={beat}
                  className="mt-2.5"
                  initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="eyebrow [text-shadow:0_1px_10px_oklch(0%_0_0/.95)]">{fact.label}</p>
                  <p className="font-display mt-1 text-[48px] font-semibold leading-[0.98] text-bone-50 [text-shadow:0_3px_28px_oklch(0%_0_0/.9)] sm:text-[84px]">{fact.value}</p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The rarity, last and on its own: named in words and pips, never by color alone. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[15%] flex justify-center px-4" aria-live="polite">
        <AnimatePresence>
          {phase === 'burst' && named && (
            <motion.div
              key={named}
              initial={{ opacity: 0, scale: reduced ? 1 : 1.3, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3"
              style={{ color: RARITIES[named].cssVar }}
              data-testid="rarity-stamp"
            >
              <Pips tier={RARITIES[named].tier} color={RARITIES[named].cssVar} />
              <span className="flex items-center gap-4">
                <span className="h-px w-10 bg-current opacity-60 sm:w-20" aria-hidden />
                <span className="font-gothic text-[48px] leading-none sm:text-[76px]" style={{ textShadow: `0 0 34px color-mix(in oklch, ${RARITIES[named].cssVar} 60%, transparent), 0 2px 12px oklch(0% 0 0 / .85)` }}>
                  {RARITIES[named].stamp}
                </span>
                <span className="h-px w-10 bg-current opacity-60 sm:w-20" aria-hidden />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inspect: the whole scene is a zoom surface. */}
      {phase === 'reveal' && collapsed && !multi && (
        <div
          className="absolute inset-0 cursor-zoom-in touch-none select-none"
          data-testid="inspect-surface"
          onWheel={(e) => setZoom(anim.zoom - e.deltaY * 0.0015)}
          onDoubleClick={(e) => {
            if (anim.zoom > 0.3) setZoom(0)
            else {
              setZoom(0.7)
              anim.panY = Math.max(-0.5, Math.min(0.5, (0.5 - e.clientY / window.innerHeight) * 0.9))
            }
          }}
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            const [a, b] = [...pointers.current.values()]
            pinch.current = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId)
            if (!prev) return
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            const [a, b] = [...pointers.current.values()]
            if (a && b) {
              const d = Math.hypot(a.x - b.x, a.y - b.y)
              if (pinch.current > 0) setZoom(anim.zoom + (d - pinch.current) / 260)
              pinch.current = d
            } else pan(e.clientY - prev.y)
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId)
            pinch.current = 0
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            pinch.current = 0
          }}
        />
      )}
      <AnimatePresence>
        {phase === 'reveal' && collapsed && !multi && (
          <motion.p
            key="inspect-hint"
            className="caps pointer-events-none absolute inset-x-0 top-[calc(max(1rem,env(safe-area-inset-top))+96px)] px-6 text-center text-bone-300 [text-shadow:0_1px_8px_oklch(0%_0_0/.9)] sm:top-[calc(max(1rem,env(safe-area-inset-top))+64px)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4.5, times: [0, 0.08, 0.8, 1] }}
          >
            <span className="hidden sm:inline">Scroll to zoom, drag to look along the piece. Double-click to jump in.</span>
            <span className="sm:hidden">Pinch to zoom, drag to look along the piece.</span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Title: the piece is named on its own for a beat before the receipt slides in. */}
      <AnimatePresence>
        {phase === 'reveal' && !cardReady && !multi && (
          <motion.div
            key="title"
            className="pointer-events-none absolute inset-x-0 bottom-[9%] flex flex-col items-center px-6 text-center"
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            data-testid="reveal-title"
          >
            <p className="caps flex items-center gap-2" style={{ color: RARITIES[first.rarity].cssVar }}>
              <Pips tier={RARITIES[first.rarity].tier} color={RARITIES[first.rarity].cssVar} />
              {RARITIES[first.rarity].label}
            </p>
            <p className="font-display mt-3 text-[44px] font-semibold leading-[0.95] text-bone-50 [text-shadow:0_4px_30px_oklch(0%_0_0/.85)] sm:text-[68px]">{first.item.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal. */}
      <AnimatePresence>
        {phase === 'reveal' && cardReady && !multi && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-end justify-center ${collapsed ? 'sm:pb-8' : 'md:items-center md:justify-end md:pr-[max(2rem,6vw)]'}`}
          >
            <RevealCard
              fast={fast}
              onHeight={onCardHeight}
              collapsed={collapsed}
              onToggle={() => setCollapsed((c) => !c)}
              draw={first.draw}
              item={first.item}
              rarity={first.rarity}
              chest={chest}
              trial={trial}
              spectate={spectate}
              onOpenChest={() => {
                close({ skipCallback: true })
                navigate(`/chests/${chest.id}`)
              }}
              sold={soldUids.has(first.uid) ? Math.round(first.item.value * chest.buyback) : null}
              onKeep={() => close()}
              onSell={() => sell([first.uid])}
              onShip={() => {
                close()
                navigate(`/vault/${first.uid}?ship=1`)
              }}
              onAgain={again}
              onReplay={replay}
              canAfford={canAfford}
            />
          </div>
        )}
        {phase === 'reveal' && multi && (
          <motion.div className="absolute inset-0 z-10 flex flex-col overflow-y-auto pb-6 pt-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="fixed inset-0 bg-ink-950/55" />
            <div className="relative my-auto w-full">
              <MultiReveal results={results} chest={chest} soldUids={soldUids} onSell={sell} onDone={() => close()} onAgain={again} canAfford={canAfford} fast={fast} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purse under the controls, so the cost and the sell-back credit are visible here too. */}
      {!trial && !spectate && phase === 'reveal' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-[calc(max(1rem,env(safe-area-inset-top))+56px)] z-20 flex items-baseline gap-2 sm:right-6"
          data-coin-target
        >
          <span className="caps text-bone-400">Purse</span>
          <span className="text-[14px] font-semibold text-bone-100 tabular">{money(balance, { cents: !Number.isInteger(balance) })}</span>
        </motion.div>
      )}
    </motion.div>
  )
}
