import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { FastForward, X } from '@phosphor-icons/react'
import { ChestScene } from '../chest3d/ChestScene'
import { ChestAnim } from '../chest3d/animState'
import { applyCharge, introTimeline, revealTimeline, settleReveal, whenChestReady, type Phase } from '../chest3d/timeline'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import type { RarityId } from '../../types'
import { buybackOffer, chestPool } from '../../lib/gacha'
import { ITEMS } from '../../data/items'
import { ItemImg } from '../ui/ItemImg'
import { actions, useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { money } from '../../lib/format'
import { revealFacts } from '../../lib/facts'
import { HoldToOpen, type HoldHandle } from './HoldToOpen'
import { IconButton } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { Pips } from '../ui/RarityTag'
import { RevealCard } from './RevealCard'
import { MultiReveal } from './MultiReveal'
import { useOpening, type OpeningSession } from './OpeningProvider'

function useReducedMotion() {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
}

export default function OpeningOverlay({ session }: { session: OpeningSession }) {
  const { chest, results, trial, spectate } = session
  const multi = results.length > 1
  const anim = useMemo(() => new ChestAnim(), [])
  // The reveal (or the seal breaking by itself), and the chest's arrival, which a hold can cut short.
  const tl = useRef<gsap.core.Timeline | null>(null)
  const introTl = useRef<gsap.core.Timeline | null>(null)
  // A reveal waiting for the chest to be in the scene; calling it cancels the wait.
  const pending = useRef<() => void>(() => {})
  const hold = useRef<HoldHandle>(null)
  const fast = useStore((s) => s.settings.fast)
  const balance = useStore((s) => s.balance)
  // The seal can be held from the first frame. Fast mode and spectators open by themselves.
  const [phase, setPhase] = useState<Phase>(() => (fast || spectate ? 'intro' : 'await'))
  const [soldUids, setSoldUids] = useState<Set<string>>(new Set())
  // The rarity, once named, and how many facts about the piece are showing.
  const [named, setNamed] = useState<RarityId | null>(null)
  const [beat, setBeat] = useState(-1)
  const [collapsed, setCollapsed] = useState(false)
  // Whether the piece's photograph is in, checked while the result is up: a photo that never
  // loaded is said plainly on the receipt, and the line goes if it arrives late.
  const [photoMissing, setPhotoMissing] = useState(false)
  // Until when a sale from the receipt can be taken back, set the moment it is made.
  const [undoUntil, setUndoUntil] = useState<Record<string, number>>({})
  // Open another keeps this room and its scene, so there is nothing to rebuild and the next seal
  // can be held at once. Everything about the last pull is put away before the next one shows.
  const [shown, setShown] = useState(session.key)
  const [round, setRound] = useState(0)
  if (shown !== session.key) {
    setShown(session.key)
    setRound((r) => r + 1)
    setPhase(fast || spectate ? 'intro' : 'await')
    setSoldUids(new Set())
    setNamed(null)
    setBeat(-1)
    setCollapsed(false)
    setPhotoMissing(false)
    setUndoUntil({})
  }
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const skipBtn = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (phase !== 'title' && phase !== 'reveal') return
    const check = () => setPhotoMissing(!anim.itemReady)
    check()
    const id = window.setInterval(check, 400)
    return () => window.clearInterval(id)
  }, [phase, anim])
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
  // A replay starts a moment after the card leaves; Skip, Close or another replay cancel it.
  const replayTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(replayTimer.current), [])

  const startReveal = useCallback(() => {
    // A seal broken while the chest is still arriving lands it at once.
    const intro = introTl.current
    introTl.current = null
    if (intro) {
      intro.eventCallback('onComplete', null)
      intro.progress(1)
      intro.kill()
    }
    pending.current()
    pending.current = whenChestReady(anim, () => {
      pending.current = () => {}
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
    })
  }, [anim, multi, reduced, best.rarity, facts.length])
  const startRevealRef = useRef(startReveal)
  startRevealRef.current = startReveal

  // The seal heats and strains as the charge builds. A hold during the arrival hurries it.
  const onCharge = useCallback(
    (p: number) => {
      const intro = introTl.current
      if (p > 0 && intro?.isActive() && intro.timeScale() === 1) {
        intro.timeScale(4)
        // The charge lights the seams from here on.
        gsap.killTweensOf(anim, 'glow')
      }
      applyCharge(anim, p)
    },
    [anim],
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      tl.current?.kill()
      introTl.current?.kill()
      pending.current()
    }
  }, [])

  // Each chest arrives, the first and every one opened after it. Laid out before the frame is
  // drawn, so the last pull's piece and open lid never show with the new chest. In fast mode
  // and for spectators the seal breaks by itself; spectators see it strain first.
  useLayoutEffect(() => {
    window.clearTimeout(replayTimer.current)
    tl.current?.kill()
    tl.current = null
    pending.current()
    pending.current = () => {}
    introTl.current?.kill()
    // Only the arrival in play can complete: a killed one never calls back.
    introTl.current = introTimeline(
      anim,
      () => {
        introTl.current = null
        if (!fastRef.current && !spectate) return
        const o = { p: 0 }
        tl.current = gsap.timeline()
        tl.current.to(o, { p: 1, duration: fastRef.current ? 0.08 : 1.1, ease: 'power1.in', onUpdate: () => applyCharge(anim, o.p), onComplete: () => startRevealRef.current() })
      },
      fastRef.current,
    )
  }, [anim, session.key, spectate])

  const skip = useCallback(() => {
    window.clearTimeout(replayTimer.current)
    tl.current?.kill()
    settleReveal(anim, best.rarity, multi)
    setPhase('reveal')
  }, [anim, best.rarity, multi])

  const replay = useCallback(() => {
    tl.current?.kill()
    window.clearTimeout(replayTimer.current)
    if (reduced) {
      // Reduced motion: no second flight. The card fades out and back in.
      setPhase('tell')
      replayTimer.current = window.setTimeout(() => setPhase('reveal'), 200)
      return
    }
    anim.reset()
    anim.idle = 0
    setBeat(-1)
    setNamed(null)
    setPhase('tell')
    replayTimer.current = window.setTimeout(() => {
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

  // Inspect belongs to the finished receipt; a replay starts with the card whole again.
  useEffect(() => {
    if (phase !== 'reveal') setCollapsed(false)
  }, [phase])

  // Keyboard focus: the seal from the first frame (it takes focus itself), Close when the chest
  // opens by itself, Skip while it opens, the result card after. The provider returns it to
  // the launcher on exit.
  useEffect(() => {
    if (fastRef.current || spectate) closeBtn.current?.focus({ preventScroll: true })
  }, [session.key, spectate])
  useEffect(() => {
    if (phase === 'tell') skipBtn.current?.focus({ preventScroll: true })
  }, [phase])

  // Close works from the first frame. Before the seal breaks, a free chest stays unopened;
  // a paid opening keeps its pieces in the vault.
  const exit = useCallback(() => {
    window.clearTimeout(replayTimer.current)
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
    hold.current?.cancel()
    tl.current?.kill()
    const o = { p: 0 }
    tl.current = gsap.timeline()
    tl.current.to(o, { p: 1, duration: 0.08, ease: 'power1.in', onUpdate: () => applyCharge(anim, o.p), onComplete: startReveal })
  }, [fast, phase, anim, startReveal])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
      if ((e.key === 's' || e.key === 'S') && (phase === 'tell' || phase === 'rise' || phase === 'burst' || phase === 'title')) skip()
      // Tab cycles inside the opening; the batch Inspect sheet runs its own cycle.
      if (e.key === 'Tab' && root.current && !e.defaultPrevented) {
        const active = document.activeElement
        if (active?.closest('[data-testid="multi-inspect"], [data-testid="share-sheet"]')) return
        const nodes = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((n) => n.getClientRects().length > 0 && n.tabIndex >= 0 && !n.closest('[inert]'))
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

  // A sale from the receipt can be taken back for a few seconds.
  const unsell = (uids: string[]) => {
    uids.forEach((u) => actions.undoSell(u))
    setSoldUids((s) => {
      const n = new Set(s)
      uids.forEach((u) => n.delete(u))
      return n
    })
  }

  const sell = (uids: string[]) => {
    uids.forEach((u) => {
      const r = results.find((x) => x.uid === u)!
      actions.sellBack(u, buybackOffer(r.item.value, chest))
    })
    setSoldUids((s) => {
      const n = new Set(s)
      uids.forEach((u) => n.add(u))
      return n
    })
  }

  // Only the receipt that is up buys the next chest: a second click, or a click on a receipt
  // still fading out, finds the next opening already under way and does nothing.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const again = () => {
    if (phaseRef.current !== 'reveal') return
    if (open(chest.id, results.length).ok) phaseRef.current = 'await'
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
  const card = !multi && (phase === 'title' || phase === 'reveal')

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
      {/* Open another: a cut to the next chest. The hall comes back out of the dark with the
          chest dropping onto the altar, and the seal can be held through it. */}
      {round > 0 && (
        <motion.div
          key={session.key}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-ink-950"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.25 : 0.55, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

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
          {/* The chest name stands alone; its epithet lives on the chest page. A replay or the
              trial says what it is above the name. */}
          {(spectate || trial) && (
            <p className="eyebrow truncate">
              {spectate ? (
                <>
                  {/* Phones keep the disclosure whole; the name of the opener fits on wider screens. */}
                  <span className="sm:hidden">Simulated replay</span>
                  <span className="hidden sm:inline">Watching {spectate.by === 'You' ? 'your' : spectate.by ? `${spectate.by}'s` : 'a'} pull · simulated</span>
                </>
              ) : (
                'Your first chest'
              )}
            </p>
          )}
          <p className="font-display truncate text-xl font-semibold text-bone-50">
            {trial ? 'Trial Chest' : chest.name}
            {multi && <span className="ml-2 text-base font-normal text-bone-300">× {results.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={fast} onChange={(v) => actions.setFast(v)} label="Fast opening" className="h-10 rounded-[2px] bg-bone-100/10 px-3.5 text-bone-50 hover:bg-bone-100/[0.16] max-sm:[&_.ib-switch-state]:hidden">
            Fast
          </Switch>
          {(phase === 'tell' || phase === 'rise' || phase === 'burst' || phase === 'title') && (
            <button
              ref={skipBtn}
              data-testid="skip"
              onClick={skip}
              className="ib-button ib-button--ghost h-10 gap-2 px-4 text-[14px] max-sm:fixed max-sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:h-12 max-sm:px-6"
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
                  <p className="mt-1.5 text-[12px] font-semibold text-bone-300 tabular">{money(it.value, { compact: true })}</p>
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
            // Only the seal itself takes the pointer: a press on its caption falls through to the
            // scene, where a press anywhere charges the seal.
            <div key={session.key}>
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

      {/* What the piece is, one fact at a time, while the camera studies it. Each holds the
          screen at least 2.5 s, set large over a dark reading surface. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[15%] flex justify-center px-5 sm:bottom-[10%] sm:justify-start sm:pl-[max(2rem,6vw)]" aria-live="polite">
        <AnimatePresence mode="wait">
          {showFacts && fact && (
            <motion.div
              key={beat}
              // Its own stacking context: the scrim must stay above the scene once the caption settles.
              className="relative isolate flex max-w-[min(92vw,760px)] flex-col items-center px-6 py-4 text-center sm:-ml-6 sm:items-start sm:text-left"
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              data-testid="reveal-facts"
              data-beat={beat}
            >
              {/* A soft dark plate, even across the words: a radial scrim thinned out at the corner where the label sits. */}
              <span aria-hidden className="absolute -inset-x-12 -inset-y-10 -z-10 rounded-[56px] bg-[oklch(9%_0.012_60/.8)] blur-xl" />
              <p className="eyebrow !text-bone-300">{fact.label}</p>
              <p className="font-display mt-1.5 text-[52px] font-semibold leading-[0.98] text-bone-50 [text-shadow:0_2px_24px_oklch(0%_0_0/.8)] sm:text-[88px]">{fact.value}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The rarity, alone: in words and pips, never by color alone. It stands where the name
          and the receipt follow, beside the piece on wide screens and under it on phones. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[17%] flex justify-center px-4 md:inset-y-0 md:left-auto md:right-[max(2rem,6vw)] md:w-[620px] md:items-center md:justify-end md:px-7" aria-live="polite">
        <AnimatePresence>
          {phase === 'burst' && named && !multi && (
            <motion.div
              key="rarity"
              className="flex flex-col items-center gap-4 md:items-end"
              style={{ color: RARITIES[named].cssVar }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.3 }}
              data-testid="rarity-stamp"
            >
              <motion.span initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
                <Pips tier={RARITIES[named].tier} color={RARITIES[named].cssVar} />
              </motion.span>
              <motion.span
                layoutId="rarity-word"
                className="font-gothic block whitespace-nowrap text-[76px] leading-[0.92] sm:text-[100px] md:text-[112px]"
                style={{ textShadow: `0 0 44px color-mix(in oklch, ${RARITIES[named].cssVar} 55%, transparent), 0 2px 14px oklch(0% 0 0 / .85)` }}
                initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {RARITIES[named].stamp}
              </motion.span>
              <motion.span
                aria-hidden
                className="block h-px w-44 origin-center bg-current opacity-60 md:origin-right"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
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

      {/* A dark floor under the words, so the title reads before the panel arrives: under them on
          phones; on wide screens from just left of the card to the edge, clear of the piece. */}
      <AnimatePresence>
        {card && !collapsed && (
          <motion.div
            key="scrim"
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,transparent,oklch(9%_0.012_60/.88)_42%,var(--color-ink-950))] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
        {card && !collapsed && (
          <motion.div
            key="scrim-side"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden md:block"
            style={{ left: 'calc(100% - max(2rem, 6vw) - 660px)', background: 'linear-gradient(90deg, transparent, oklch(9% 0.012 60 / .72) 200px, oklch(9% 0.012 60 / .8))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* The name, provenance and value build beside the piece, then the receipt settles in around them. */}
      <AnimatePresence>
        {card && (
          <div
            key={`card-${session.key}`}
            className={`pointer-events-none absolute inset-0 flex items-end justify-center ${collapsed ? 'sm:pb-8' : 'ib-receipt-dock md:items-center md:justify-end md:pr-[max(2rem,6vw)]'}`}
          >
            <RevealCard
              stage={phase === 'title' ? 'title' : 'full'}
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
              sold={soldUids.has(first.uid) ? buybackOffer(first.item.value, chest) : null}
              onKeep={() => {
                // The end of the ritual says where the piece went.
                if (!trial && !soldUids.has(first.uid)) toast(`${first.item.name} is in your vault.`)
                close()
              }}
              onSell={() => {
                sell([first.uid])
                setUndoUntil((u) => ({ ...u, [first.uid]: Date.now() + 6000 }))
              }}
              onUndoSell={() => unsell([first.uid])}
              undoUntil={undoUntil[first.uid]}
              onShip={() => {
                close()
                navigate(`/vault/${first.uid}?ship=1`)
              }}
              onAgain={again}
              onReplay={replay}
              canAfford={canAfford}
              photoMissing={photoMissing}
            />
          </div>
        )}
        {phase === 'reveal' && multi && (
          <motion.div key={`multi-${session.key}`} className="pointer-events-none absolute inset-0 z-10 flex flex-col overflow-y-auto pb-6 pt-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <div className="fixed inset-0 bg-ink-950/55" />
            <div className="relative my-auto w-full">
              <MultiReveal results={results} chest={chest} soldUids={soldUids} onSell={sell} onDone={() => {
                const kept = results.filter((r) => !soldUids.has(r.uid)).length
                if (kept) toast(kept === 1 ? 'One piece is in your vault.' : `${kept} pieces are in your vault.`)
                close()
              }} onAgain={again} canAfford={canAfford} fast={fast} />
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
