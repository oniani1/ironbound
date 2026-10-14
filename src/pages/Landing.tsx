import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { CHEST_BY_ID } from '../config/chests'
import { ITEMS } from '../data/items'
import { money, shortEra } from '../lib/format'
import { sfx } from '../lib/audio'
import { useStore } from '../lib/store'
import { Button } from '../components/ui/Button'
import { useOnboarding } from '../components/onboarding/OnboardingContext'
import { LandingSections } from '../components/landing/sections'
import { ItemImg } from '../components/ui/ItemImg'
import type { Item } from '../types'

const ease = [0.16, 1, 0.3, 1] as const

export default function Landing() {
  return (
    <>
      <Hero />
      <Showcase />
      <LandingSections />
    </>
  )
}

function Hero() {
  const anim = useMemo(() => {
    const a = new ChestAnim()
    a.hero = true
    a.idle = 0
    a.glow = 1.05
    a.lid = 0.74
    a.item = 1
    a.itemLit = 1
    a.beam = 0.3
    a.glowColor.set('#ffc46e')
    a.beamColor.set('#ffc46e')
    return a
  }, [])
  const featured = useMemo(() => ITEMS.find((i) => i.id === 'knightly-longsword-27458') ?? ITEMS.find((i) => i.category === 'sword' && i.value > 40000) ?? ITEMS[ITEMS.length - 1]!, [])
  const { start } = useOnboarding()
  const signedIn = useStore((s) => s.signedIn)
  const theme = CHEST_BY_ID.king!.theme
  const teaseTimer = useRef(0)

  // Every few seconds the chest strains against its lock, as if something inside wants out.
  useEffect(() => {
    const tease = () => {
      // A slow glint runs down the steel, and the chest exhales a few embers.
      gsap.fromTo(anim, { glint: 0 }, { glint: 1, duration: 1.1, ease: 'power2.inOut', onComplete: () => void (anim.glint = -1) })
      gsap.timeline().to(anim, { glow: 1.5, duration: 0.3, ease: 'power2.out' }).to(anim, { glow: 1.05, duration: 1.2, ease: 'power2.out' })
      anim.emit(16, '#ffc46e', 0.6)
      teaseTimer.current = window.setTimeout(tease, 4800 + Math.random() * 3000)
    }
    teaseTimer.current = window.setTimeout(tease, 2400)
    return () => window.clearTimeout(teaseTimer.current)
  }, [anim])

  const hover = (on: boolean) => {
    gsap.to(anim, { glow: on ? 1.45 : 1.05, beam: on ? 0.42 : 0.3, duration: 0.5, ease: 'power2.out' })
    if (on) sfx.rattle(0.2)
  }

  return (
    <section className="relative -mt-[calc(var(--header-h)+var(--ticker-h))] min-h-[100svh] overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] top-[38%] [mask-image:linear-gradient(180deg,transparent,black_14%,black_93%,transparent)] md:inset-0 md:left-[30%] md:[mask-image:linear-gradient(180deg,black_70%,transparent)]"
        onPointerEnter={() => hover(true)}
        onPointerLeave={() => hover(false)}
      >
        <ChestScene theme={theme} anim={anim} item={featured} heroItem rarityHex="#ffc94d" itemGlow={0.6} parallax className="!absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4, ease }}
          className="pointer-events-none absolute bottom-[12%] left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-bone-100/10 bg-ink-950/70 py-1.5 pl-2 pr-4 backdrop-blur md:flex"
        >
          <span className="rounded-full bg-[color-mix(in_oklch,var(--r-legendary)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--r-legendary)]">Legendary</span>
          <span className="font-display text-[16px] text-bone-50">{featured.name}</span>
          <span className="text-[13px] font-semibold text-bone-200 tabular">{money(featured.value)}</span>
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-ink-950)_8%,transparent_55%)] md:block" />
      <div className="pointer-events-none relative mx-auto flex min-h-[100svh] max-w-[1400px] flex-col px-4 pb-[58svh] pt-[calc(var(--header-h)+var(--ticker-h)+1.75rem)] sm:px-6 md:justify-center md:pb-24 md:pt-[calc(var(--header-h)+var(--ticker-h)+2.5rem)]">
        <div className="pointer-events-auto max-w-[620px]">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }} className="eyebrow">
            Real arms and armor, sealed in iron
          </motion.p>
          <h1 className="font-display mt-3 text-[46px] font-semibold leading-[0.92] text-bone-50 sm:text-[84px] md:mt-4 lg:text-[100px]">
            {['Open the chest.', 'Keep the steel.'].map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.15, ease }}
              >
                {i === 1 ? <em className="font-medium text-brass-300">{line}</em> : line}
              </motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.65, ease }} className="mt-4 max-w-[50ch] text-[15px] leading-relaxed text-bone-300 sm:text-[17px] md:mt-6">
            <span className="sm:hidden">One real piece of history in every chest. Keep it, ship it or sell it back.</span>
            <span className="hidden sm:inline">
              Every chest holds one real piece of history, from a $20 crossbow bolt to a Gothic armor worth over a million. Authenticated, vaulted and insured. Keep it, ship it home, or sell it back in one tap.
            </span>
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8, ease }} className="mt-5 flex flex-wrap items-center gap-1 sm:gap-3 md:mt-8">
            {signedIn ? (
              <Link to="/chests">
                <Button size="lg" tabIndex={-1}>
                  Choose a chest
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={() => start()} data-testid="hero-cta">
                Open a free chest
              </Button>
            )}
            <Link to="/chests" className="whitespace-nowrap rounded-[14px] px-4 py-4 text-[15px] font-medium text-bone-200 transition-colors hover:bg-bone-100/[0.06] hover:text-bone-50 sm:px-5">
              See the chests →
            </Link>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }} className="mt-10 hidden flex-wrap gap-x-6 gap-y-2 text-[12px] text-bone-400 md:flex">
            <li>Odds printed on every chest</li>
            <li>85 to 92% instant sell-back</li>
            <li>Insured shipping to your door</li>
          </motion.ul>
        </div>
      </div>
    </section>
  )
}

/** A slow river of real items. Grails and commons alternate, so the range is felt at a glance. */
function Showcase() {
  const items = useMemo(() => {
    const sorted = [...ITEMS].sort((a, b) => b.value - a.value)
    const high = sorted.slice(0, 18)
    const low = sorted.slice(-60).filter((_, i) => i % 3 === 0)
    const mix: Item[] = []
    for (let i = 0; i < Math.max(high.length, low.length); i++) {
      const h = high[i]
      const l = low[i]
      if (h) mix.push(h)
      if (l) mix.push(l)
    }
    return mix
  }, [])
  const range = useMemo(() => {
    const v = ITEMS.map((i) => i.value)
    return { min: Math.min(...v), max: Math.max(...v) }
  }, [])
  const loop = [...items, ...items]
  return (
    <section className="relative border-y border-bone-100/[0.06] bg-ink-950 py-10" aria-label="Items in the chests">
      <div className="mx-auto mb-6 flex max-w-[1400px] items-end justify-between px-4 sm:px-6">
        <div>
          <p className="eyebrow">In the chests right now</p>
          <p className="font-display mt-1 text-[28px] font-semibold text-bone-50 sm:text-[34px]">
            From {money(range.min)} to {money(range.max, { compact: true })}
          </p>
        </div>
        <Link to="/chests" className="hidden text-[13px] text-bone-300 hover:text-bone-50 sm:block">
          Browse every item →
        </Link>
      </div>
      {/* Phones swipe through snap cards; larger screens get a slow drifting river. */}
      <div className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
        {items.map((it) => (
          <div key={it.id} className="w-[64vw] shrink-0 snap-center rounded-[18px] border border-bone-100/[0.06] bg-ink-900/70 p-3">
            <div className="relative aspect-[4/5]">
              <div className="absolute inset-x-[20%] bottom-[4%] h-[24%] rounded-[50%] bg-brass-500/20 blur-xl" />
              <ItemImg item={it} alt={it.name} className="relative h-full w-full" />
            </div>
            <p className="font-display mt-2 line-clamp-1 text-[17px] font-semibold text-bone-50">{it.name}</p>
            <p className="flex justify-between text-[12px] text-bone-400">
              <span className="truncate pr-2">{shortEra(it.era)}</span>
              <span className="font-semibold text-bone-200 tabular">{money(it.value, { compact: true })}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="group relative hidden overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] md:block">
        <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
          {loop.map((it, i) => (
            <div key={`${it.id}-${i}`} className="w-[180px] shrink-0 rounded-[18px] border border-bone-100/[0.06] bg-ink-900/70 p-3 sm:w-[210px]">
              <div className="relative aspect-[4/5]">
                <div className="absolute inset-x-[20%] bottom-[4%] h-[24%] rounded-[50%] bg-brass-500/20 blur-xl" />
                <ItemImg item={it} alt={it.name} className="relative h-full w-full" />
              </div>
              <p className="font-display mt-2 line-clamp-1 text-[16px] font-semibold text-bone-50">{it.name}</p>
              <p className="flex justify-between text-[12px] text-bone-400">
                <span className="truncate pr-2">{shortEra(it.era)}</span>
                <span className="font-semibold text-bone-200 tabular">{money(it.value, { compact: true })}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
