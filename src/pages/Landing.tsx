import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { CHEST_BY_ID } from '../config/chests'
import { ITEMS } from '../data/items'
import { money, shortEra } from '../lib/format'
import { RarityTag } from '../components/ui/RarityTag'
import { ItemVitrine } from '../components/ui/Vitrine'
import { sfx } from '../lib/audio'
import { useStore } from '../lib/store'
import { Button } from '../components/ui/Button'
import { useGuestCta, useOnboarding } from '../components/onboarding/OnboardingContext'
import { LandingSections } from '../components/landing/sections'
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
  const guestCta = useGuestCta()
  const signedIn = useStore((s) => s.signedIn)
  const theme = CHEST_BY_ID.king!.theme
  const teaseTimer = useRef(0)

  // Every few seconds the chest strains against its lock, as if something inside wants out.
  useEffect(() => {
    if (anim.still) return
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
      </div>
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-ink-950)_8%,transparent_55%)] md:block" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4, ease }}
        className="pointer-events-none absolute right-[4%] top-[47%] z-10 hidden w-[220px] border-t border-bone-100/15 pt-3 [text-shadow:0_1px_10px_oklch(0%_0_0/.9)] lg:block xl:right-[6%]"
      >
        <RarityTag rarity="legendary" size="xs" />
        <p className="font-display mt-1.5 text-[20px] leading-tight text-bone-50">{featured.name}</p>
        <p className="mt-1 truncate text-[12px] text-bone-400">
          {shortEra(featured.era)} · {featured.origin.replace(/\s*\(.*\)$/, '')}
        </p>
        <p className="mt-2 text-[15px] font-semibold text-bone-100 tabular">{money(featured.value)}</p>
      </motion.div>
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
                {guestCta}
              </Button>
            )}
            <Link to="/chests" className="caps group flex min-h-14 items-center gap-2.5 whitespace-nowrap px-4 text-bone-200 transition-colors hover:text-bone-50 sm:px-5">
              See the chests
              <ArrowRight size={16} weight="light" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }} className="mt-12 hidden flex-wrap gap-x-7 gap-y-2 md:flex">
            {['Odds on every chest', '85 to 92% sell-back', 'Insured shipping'].map((t) => (
              <li key={t} className="caps flex items-center gap-2 text-bone-400">
                <span className="block h-[5px] w-[5px] rotate-45 bg-brass-500" aria-hidden />
                {t}
              </li>
            ))}
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
    <section className="relative border-y border-bone-100/[0.06] bg-ink-950 py-14 sm:py-20" aria-label="Items in the chests">
      <div className="mx-auto mb-8 flex max-w-[1400px] items-end justify-between gap-6 px-4 sm:mb-10 sm:px-6">
        <div>
          <p className="eyebrow">In the chests right now</p>
          <p className="font-display mt-2 text-[32px] font-semibold leading-tight text-bone-50 sm:text-[44px]">
            From {money(range.min)} to {money(range.max, { compact: true })}
          </p>
        </div>
        <Link to="/chests" className="caps group hidden items-center gap-2 text-bone-300 transition-colors hover:text-bone-50 sm:flex">
          Browse every chest
          <ArrowRight size={15} weight="light" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
      {/* Phones swipe through snap cards; larger screens get a slow drifting river. */}
      <div className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
        {items.map((it) => (
          <ItemVitrine key={it.id} item={it} aspect="aspect-[4/5]" className="w-[58vw] shrink-0 snap-center" />
        ))}
      </div>
      <div className="group relative hidden overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] md:block">
        <div className="flex w-max animate-marquee gap-8 group-hover:[animation-play-state:paused]">
          {loop.map((it, i) => (
            <ItemVitrine key={`${it.id}-${i}`} item={it} aspect="aspect-[4/5]" className="w-[200px] shrink-0 sm:w-[220px]" />
          ))}
        </div>
      </div>
    </section>
  )
}
