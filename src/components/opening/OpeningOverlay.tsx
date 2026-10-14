import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { CaretUp, FastForward, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'
import { ChestScene } from '../chest3d/ChestScene'
import { ChestAnim } from '../chest3d/animState'
import { applyCharge, introTimeline, revealTimeline, settleReveal, type Phase } from '../chest3d/timeline'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import type { RarityId } from '../../types'
import { chestPool, tellSequence } from '../../lib/gacha'
import { ITEMS } from '../../data/items'
import { ItemImg } from '../ui/ItemImg'
import { actions, useStore } from '../../lib/store'
import { sfx } from '../../lib/audio'
import { toast } from '../../lib/toast'
import { money, shortEra } from '../../lib/format'
import { HoldToOpen, type HoldHandle } from './HoldToOpen'
import { IconButton } from '../ui/Button'
import { Pips } from '../ui/RarityTag'
import { RevealCard } from './RevealCard'
import { MultiReveal } from './MultiReveal'
import { useOpening, type OpeningSession } from './OpeningProvider'

const CATEGORY_CLUE: Record<string, string> = {
  sword: 'A blade',
  dagger: 'A short blade',
  polearm: 'A polearm',
  axe: 'A war tool',
  helmet: 'A helm',
  shield: 'A shield',
  armor: 'Armor',
  fitting: 'A fitting',
}

/** How long the piece is named on its own before the receipt, by rarity tier. */
const TITLE_MS: Record<number, number> = { 1: 750, 2: 900, 3: 1100, 4: 1250, 5: 1500, 6: 1700 }

function useReducedMotion() {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
}

export default function OpeningOverlay({ session }: { session: OpeningSession }) {
  const { chest, results, trial } = session
  const multi = results.length > 1
  const anim = useMemo(() => new ChestAnim(), [])
  const tl = useRef<gsap.core.Timeline | null>(null)
  const hold = useRef<HoldHandle>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [soldUids, setSoldUids] = useState<Set<string>>(new Set())
  const [tellStep, setTellStep] = useState<RarityId | null>(null)
  const [cardReady, setCardReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const skipBtn = useRef<HTMLButtonElement>(null)
  const fast = useStore((s) => s.settings.fast)
  const sound = useStore((s) => s.settings.sound)
  const balance = useStore((s) => s.balance)
  const reduced = useReducedMotion()
  const { open, close } = useOpening()
  const navigate = useNavigate()

  const best = useMemo(
    () => results.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a)),
    [results],
  )
  const first = results[0]!
  const tell = useMemo(() => tellSequence(best.rarity), [best.rarity])
  const fastRef = useRef(fast)
  fastRef.current = fast

  const startReveal = useCallback(() => {
    tl.current?.kill()
    if (reduced) {
      // Reduced motion: no flight, no flashes. The result fades in.
      sfx.burst(RARITIES[best.rarity].tier)
      settleReveal(anim, best.rarity, multi)
      setPhase('reveal')
      return
    }
    tl.current = revealTimeline(anim, { tell, fast: fastRef.current, multi, reducedMotion: reduced, onPhase: setPhase, onTell: setTellStep, lift: true })
  }, [anim, tell, multi, reduced, best.rarity])

  // Lift: the lid hangs half open until the player drags it up, taps, or presses Space.
  // It never blocks: after a few seconds it opens by itself.
  const lifting = useRef<{ y: number } | null>(null)
  const resumeLift = useCallback(() => {
    const t = tl.current
    if (!t || !t.paused()) return
    lifting.current = null
    t.play()
  }, [])
  useEffect(() => {
    if (phase !== 'lift') return
    sfx.heartbeat(0.9)
    const beat = window.setInterval(() => sfx.heartbeat(0.7), 860)
    const auto = window.setTimeout(resumeLift, 4500)
    return () => {
      window.clearInterval(beat)
      window.clearTimeout(auto)
    }
  }, [phase, resumeLift])

  // The seal: a heartbeat that quickens as the charge builds.
  const lastBeat = useRef(0)
  const onCharge = useCallback(
    (p: number) => {
      applyCharge(anim, p)
      const now = performance.now()
      if (p > 0.06 && now - lastBeat.current > 980 - p * 560) {
        lastBeat.current = now
        sfx.heartbeat(0.45 + p * 0.55)
      }
    },
    [anim],
  )

  // Intro: the chest drops onto the plinth. In fast mode the seal breaks by itself.
  useEffect(() => {
    sfx.unlock()
    sfx.startAmbience()
    document.body.style.overflow = 'hidden'
    tl.current = introTimeline(
      anim,
      () => {
        if (fastRef.current) {
          const o = { p: 0 }
          tl.current = gsap.timeline()
          tl.current.to(o, { p: 1, duration: 0.08, ease: 'power1.in', onUpdate: () => applyCharge(anim, o.p), onComplete: startReveal })
        } else setPhase('await')
      },
      fastRef.current,
    )
    return () => {
      tl.current?.kill()
      sfx.stopAmbience()
      sfx.stopCharge()
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
    setPhase('tell')
    window.setTimeout(() => {
      tl.current = revealTimeline(anim, { tell, fast: false, multi, reducedMotion: reduced, onPhase: setPhase, onTell: setTellStep, lift: false })
    }, 250)
  }, [anim, tell, multi, reduced])

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
    if (ms) sfx.stamp()
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
    if (phase === 'reveal') return close()
    tl.current?.kill()
    if (trial && (phase === 'intro' || phase === 'await')) {
      actions.removePulls(session.pulls.map((p) => p.uid))
      return close({ skipCallback: true })
    }
    if (!trial) toast(results.length > 1 ? `Your ${results.length} ${chest.name} pulls are in your vault.` : `Your ${chest.name} pull is in your vault.`)
    close()
  }, [phase, trial, session.pulls, results.length, chest.name, close])

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
      if ((e.key === 's' || e.key === 'S') && (phase === 'tell' || phase === 'lift' || phase === 'burst' || phase === 'rise')) skip()
      if ((e.key === ' ' || e.key === 'Enter') && phase === 'lift') {
        e.preventDefault()
        resumeLift()
      }
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
  }, [phase, exit, skip, resumeLift])

  const sell = (uids: string[]) => {
    const amounts = uids.map((u) => {
      const r = results.find((x) => x.uid === u)!
      const amt = Math.round(r.item.value * chest.buyback)
      actions.sellBack(u, amt)
      return amt
    })
    if (amounts.length) sfx.coins(Math.min(14, 4 + amounts.length * 2))
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
  const showClues = !multi && (phase === 'rise' || phase === 'burst')

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
        {(phase === 'burst' || phase === 'rise') && RARITIES[best.rarity].tier >= 5 && !reduced && (
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
          <p className="eyebrow truncate">{trial ? 'Your first chest' : chest.epithet}</p>
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
            className="flex h-11 items-center gap-2.5 whitespace-nowrap rounded-full bg-ink-950/40 px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-300 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_14%,transparent)] backdrop-blur transition-colors hover:text-bone-100"
          >
            <span className={`relative block h-[14px] w-[24px] rounded-full transition-colors duration-200 ${fast ? 'bg-brass-500' : 'bg-bone-100/15'}`} aria-hidden>
              <span className={`absolute top-[2px] block h-[10px] w-[10px] rounded-full bg-bone-50 transition-[left] duration-200 ${fast ? 'left-[12px]' : 'left-[2px]'}`} />
            </span>
            Fast
          </button>
          <IconButton size="lg" onClick={() => actions.toggleSound()} className="bg-ink-950/40 backdrop-blur" aria-label={sound ? 'Mute sound' : 'Unmute sound'}>
            {sound ? <SpeakerHigh size={18} weight="light" /> : <SpeakerSlash size={18} weight="light" />}
          </IconButton>
          {(phase === 'tell' || phase === 'lift' || phase === 'burst' || phase === 'rise') && (
            <button
              ref={skipBtn}
              data-testid="skip"
              onClick={skip}
              className="flex min-h-11 items-center gap-2 rounded-full bg-ink-950/40 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-100 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_18%,transparent)] backdrop-blur transition-colors hover:bg-bone-100/10 max-sm:fixed max-sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:px-6"
            >
              Skip <FastForward size={14} weight="light" aria-hidden />
            </button>
          )}
          <IconButton ref={closeBtn} size="lg" onClick={exit} className="bg-ink-950/40 backdrop-blur" aria-label="Close">
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

      {/* The rarity is named as the light climbs, never told by color alone. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {phase === 'tell' && tellStep && (
            <motion.p
              key={tellStep}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4"
              style={{ color: RARITIES[tellStep].cssVar }}
            >
              <span className="h-px w-8 bg-current opacity-60 sm:w-14" aria-hidden />
              <span className="font-gothic text-[32px] leading-none sm:text-[42px]" style={{ textShadow: `0 0 26px color-mix(in oklch, ${RARITIES[tellStep].cssVar} 60%, transparent), 0 2px 10px oklch(0% 0 0 / .8)` }}>
                {RARITIES[tellStep].stamp}
              </span>
              <span className="h-px w-8 bg-current opacity-60 sm:w-14" aria-hidden />
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Lift: drag up anywhere, tap, or press Space. */}
      {phase === 'lift' && (
        <div
          className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
          data-testid="lift-surface"
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            lifting.current = { y: e.clientY }
          }}
          onPointerMove={(e) => {
            const l = lifting.current
            if (!l) return
            const dy = Math.max(0, l.y - e.clientY)
            anim.lid = 0.2 + Math.min(1, dy / 240) * 0.24
            anim.glow = 1.4 + Math.min(1, dy / 240) * 0.8
            if (dy > 150) resumeLift()
          }}
          onPointerUp={(e) => {
            const l = lifting.current
            if (!l) return
            const dy = l.y - e.clientY
            lifting.current = null
            if (dy > 50 || Math.abs(dy) < 8) resumeLift()
            else gsap.to(anim, { lid: 0.2, duration: 0.35, ease: 'power2.out' })
          }}
        />
      )}
      <AnimatePresence>
        {phase === 'lift' && (
          <motion.div
            key="lift-hint"
            className="pointer-events-none absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-1.5 px-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span className="text-brass-300" animate={reduced ? undefined : { y: [0, -7, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} aria-hidden>
              <CaretUp size={26} weight="light" />
            </motion.span>
            <p className="font-display text-[24px] italic text-bone-50 [text-shadow:0_2px_16px_oklch(0%_0_0/.85)]">Lift the lid</p>
            <p className="caps text-bone-300">Drag up, tap, or press Space</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staged clues while the item rises: type, era, origin. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center px-4">
        <AnimatePresence>
          {showClues && (
            <motion.div key="clues" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-display text-[19px] italic text-bone-50 [text-shadow:0_2px_14px_oklch(0%_0_0/.9)] sm:text-[21px]" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
              {[CATEGORY_CLUE[first.item.category] ?? 'An object', first.item.provenance === 'forged' ? 'Master-forged' : shortEra(first.item.era), first.item.origin].map((c, i) => (
                <motion.span
                  key={c + i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: (fast ? 0.1 : 0.45) + i * (fast ? 0.12 : 0.42), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {i > 0 && <span className="text-[14px] not-italic text-bone-400" aria-hidden>·</span>}
                  {c}
                </motion.span>
              ))}
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
            <div className="fixed inset-0 bg-ink-950/55 backdrop-blur-[2px]" />
            <div className="relative my-auto w-full">
              <MultiReveal results={results} chest={chest} soldUids={soldUids} onSell={sell} onDone={() => close()} onAgain={again} canAfford={canAfford} fast={fast} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purse under the controls, so the cost and the sell-back credit are visible here too. */}
      {!trial && phase === 'reveal' && (
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
