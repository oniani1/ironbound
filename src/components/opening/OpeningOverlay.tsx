import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
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
import { money, shortEra } from '../../lib/format'
import { HoldToOpen, type HoldHandle } from './HoldToOpen'
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
    tl.current = revealTimeline(anim, { tell, fast: fastRef.current, multi, reducedMotion: reduced, onPhase: setPhase, onTell: setTellStep })
  }, [anim, tell, multi, reduced, best.rarity])

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
    anim.reset()
    anim.idle = 0
    setPhase('tell')
    window.setTimeout(() => {
      tl.current = revealTimeline(anim, { tell, fast: false, multi, reducedMotion: reduced, onPhase: setPhase, onTell: setTellStep })
    }, 250)
  }, [anim, tell, multi, reduced])

  // Let the player look at the piece before the receipt slides in.
  useEffect(() => {
    if (phase !== 'reveal') {
      setCardReady(false)
      return
    }
    const t = window.setTimeout(() => setCardReady(true), fastRef.current || reduced || multi ? 0 : 500)
    return () => window.clearTimeout(t)
  }, [phase, reduced, multi])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'reveal') close()
      if ((e.key === 's' || e.key === 'S') && (phase === 'tell' || phase === 'burst' || phase === 'rise')) skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, close, skip])

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
      className="fixed inset-0 z-50 overflow-hidden bg-ink-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
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
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow">{trial ? 'Your first chest' : chest.epithet}</p>
          <p className="font-display truncate text-xl font-semibold text-bone-50">
            {trial ? 'Trial Chest' : chest.name}
            {multi && <span className="ml-2 text-base font-normal text-bone-300">× {results.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-ink-900/70 px-3 py-1.5 text-xs text-bone-300 backdrop-blur hover:text-bone-100">
            <input type="checkbox" className="accent-[var(--color-brass-500)]" checked={fast} onChange={(e) => actions.setFast(e.target.checked)} />
            Fast
          </label>
          <button onClick={() => actions.toggleSound()} className="rounded-full bg-ink-900/70 px-3 py-1.5 text-xs text-bone-300 backdrop-blur hover:text-bone-100" aria-label={sound ? 'Mute sound' : 'Unmute sound'}>
            {sound ? 'Sound on' : 'Muted'}
          </button>
          {(phase === 'tell' || phase === 'burst' || phase === 'rise') && (
            <button data-testid="skip" onClick={skip} className="rounded-full bg-bone-100/10 px-3.5 py-1.5 text-xs font-semibold text-bone-100 backdrop-blur hover:bg-bone-100/20">
              Skip ›
            </button>
          )}
          {phase === 'reveal' && (
            <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full bg-ink-900/70 text-bone-300 backdrop-blur hover:text-bone-50" aria-label="Close">
              ✕
            </button>
          )}
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
            <p className="eyebrow !text-[10px]">Could be inside</p>
            <div className="mt-2 flex gap-2">
              {tease.map((it) => (
                <div key={it.id} className="w-[58px] text-center">
                  <div className="h-[58px] rounded-xl border border-bone-100/10 bg-ink-950/60 p-1.5 backdrop-blur">
                    <ItemImg item={it} className="h-full w-full" />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-bone-300 tabular">{money(it.value, { compact: true })}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold to open. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex justify-center">
        <AnimatePresence>
          {phase === 'await' && (
            <div className="pointer-events-auto">
              <HoldToOpen
                ref={hold}
                onProgress={(p) => applyCharge(anim, p)}
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
              initial={{ opacity: 0, y: 8, scale: 0.92, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, y: 0, scale: 1, letterSpacing: '0.32em' }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-[13px] font-semibold uppercase"
              style={{ color: RARITIES[tellStep].cssVar, textShadow: `0 0 18px ${RARITIES[tellStep].cssVar}` }}
            >
              {RARITIES[tellStep].label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Staged clues while the item rises: type, era, origin. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center px-4">
        <AnimatePresence>
          {showClues && (
            <motion.div key="clues" className="flex flex-wrap justify-center gap-2" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
              {[CATEGORY_CLUE[first.item.category] ?? 'An object', first.item.provenance === 'forged' ? 'Master-forged' : shortEra(first.item.era), first.item.origin].map((c, i) => (
                <motion.span
                  key={c + i}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: (fast ? 0.1 : 0.35) + i * (fast ? 0.12 : 0.32), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-full border border-bone-100/15 bg-ink-950/60 px-3.5 py-1.5 font-display text-[17px] italic text-bone-100 backdrop-blur"
                >
                  {c}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reveal. */}
      <AnimatePresence>
        {phase === 'reveal' && cardReady && !multi && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center md:justify-end md:pr-[max(2rem,6vw)]">
            <RevealCard
              draw={first.draw}
              item={first.item}
              rarity={first.rarity}
              chest={chest}
              trial={trial}
              sold={soldUids.has(first.uid) ? Math.round(first.item.value * chest.buyback) : null}
              onKeep={close}
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
          <motion.div className="absolute inset-0 flex items-center justify-center overflow-y-auto pb-6 pt-24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" />
            <div className="relative w-full">
              <MultiReveal results={results} chest={chest} soldUids={soldUids} onSell={sell} onDone={close} onAgain={again} canAfford={canAfford} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purse, bottom-left, so the cost and the sell-back credit are visible here too. */}
      {!trial && phase === 'reveal' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-4 top-[calc(max(1rem,env(safe-area-inset-top))+44px)] rounded-full bg-ink-900/70 px-3 py-1.5 text-xs text-bone-300 backdrop-blur sm:right-6"
          data-coin-target
        >
          Purse <span className="font-semibold text-bone-100 tabular">{money(balance, { cents: !Number.isInteger(balance) })}</span>
        </motion.div>
      )}
    </motion.div>
  )
}
