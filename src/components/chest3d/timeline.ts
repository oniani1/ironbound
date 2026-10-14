import gsap from 'gsap'
import { Color } from 'three'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { sfx } from '../../lib/audio'
import type { ChestAnim } from './animState'

export type Phase = 'intro' | 'await' | 'tell' | 'burst' | 'rise' | 'reveal'

interface RevealOptions {
  tell: RarityId[]
  fast: boolean
  /** Multi-open stops after the burst; cards take over in the DOM. */
  multi?: boolean
  reducedMotion?: boolean
  onPhase: (p: Phase) => void
}

function tweenColor(tl: gsap.core.Timeline, target: Color, hex: string, at: number | string, duration: number) {
  const c = new Color(hex)
  tl.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.out' }, at)
}

/** Chest drops onto the plinth with a heavy landing. */
export function introTimeline(anim: ChestAnim, onDone: () => void, fast = false) {
  anim.reset()
  anim.idle = 0
  anim.drop = 0
  anim.glow = 0.25
  anim.glowColor.set('#ffb35c')
  const tl = gsap.timeline({ onComplete: onDone })
  tl.to(anim, { drop: 1, duration: fast ? 0.35 : 0.62, ease: 'power3.in' })
  tl.call(() => {
    sfx.thud(1)
    anim.emit(18, '#c9a27a', 0.5)
  })
  tl.to(anim, { shake: 0.9, duration: 0.05 })
  tl.to(anim, { shake: 0, duration: 0.45, ease: 'power2.out' })
  return tl
}

/** Applies hold progress (0..1) while the player charges the seal. */
export function applyCharge(anim: ChestAnim, p: number) {
  anim.heat = p
  anim.rattle = p < 0.05 ? 0 : 0.15 + p * 0.85
  anim.dolly = p
  anim.glow = 0.25 + p * 0.7
  anim.bloom = p * 0.35
}

/**
 * The reveal: lock knocked off, lid cracks and leaks light in the first tell color,
 * climbs through upgrades, bursts open, beam and shockwave, item rises in silhouette,
 * then is lit and glinted. Lengths scale with the final rarity.
 */
export function revealTimeline(anim: ChestAnim, opts: RevealOptions) {
  const { tell, fast, multi, reducedMotion, onPhase } = opts
  const final = tell[tell.length - 1] ?? 'common'
  const tier = RARITIES[final].tier
  const steps = fast ? [final] : tell
  const k = fast ? 0.45 : 1
  const shakeK = reducedMotion ? 0 : 1
  const tl = gsap.timeline()

  tl.call(() => onPhase('tell'))
  // Lock knocked off.
  tl.to(anim, { heat: 1, duration: 0.08 * k })
  tl.call(() => {
    sfx.clank()
    anim.emit(40, '#ffb066', 1.1)
  })
  tl.to(anim, { lockOff: 1, duration: 0.7 * k, ease: 'power2.in' }, '<')
  tl.to(anim, { heat: 0, rattle: 0, duration: 0.5 * k, ease: 'power2.out' }, '<')
  tl.to(anim, { shake: 0.5 * shakeK, duration: 0.04 }, '<')
  tl.to(anim, { shake: 0, duration: 0.35, ease: 'power2.out' }, '<0.04')

  // Lid cracks, first tell color spills out.
  const first = RARITIES[steps[0] ?? final]
  tl.call(() => sfx.creak(0.6), [], `>-${0.35 * k}`)
  tweenColor(tl, anim.glowColor, first.hex, '<', 0.25 * k)
  tl.to(anim, { lid: 0.1, glow: 1.1, duration: 0.32 * k, ease: 'power3.out' }, '<')
  tl.call(() => anim.emit(24, new Color(first.hex), 0.7))

  // Upgrades: a jolt, a bell, a brighter color. One per step.
  steps.slice(1).forEach((r, i) => {
    const rr = RARITIES[r]
    const at = `>+${0.55 * k}`
    tl.to(anim, { lid: 0.03, duration: 0.09, ease: 'power2.in' }, at)
    tl.call(() => {
      sfx.ting(i + 1)
      anim.emit(36 + i * 20, new Color(rr.hex), 0.9)
    })
    tweenColor(tl, anim.glowColor, rr.hex, '<', 0.18)
    tl.to(anim, { lid: 0.14 + i * 0.03, glow: 1.25 + i * 0.2, bloom: 0.2 + i * 0.15, duration: 0.22, ease: 'back.out(2)' })
    tl.to(anim, { shake: (0.35 + i * 0.2) * shakeK, duration: 0.04 }, '<')
    tl.to(anim, { shake: 0, duration: 0.3 }, '>')
  })

  // Burst.
  const beamHex = RARITIES[final].hex
  tl.addLabel('burst', `>+${(tier >= 5 ? 0.6 : 0.35) * k}`)
  tl.call(() => {
    onPhase('burst')
    anim.beamColor.set(beamHex)
    sfx.burst(tier)
    anim.emit(70 + tier * 45, new Color(beamHex), 1 + tier * 0.12)
    if (tier >= 4) anim.emit(60, '#fff2d6', 1.4)
  }, [], 'burst')
  tl.to(anim, { lid: 1, duration: 0.55 * k, ease: 'back.out(1.6)' }, 'burst')
  tl.to(anim, { glow: 1.5 + tier * 0.12, duration: 0.25 }, 'burst')
  tl.to(anim, { beam: tier >= 2 ? 1 : 0.55, duration: 0.3 * k, ease: 'power2.out' }, 'burst')
  tl.fromTo(anim, { ring: 0.001 }, { ring: 1, duration: 1.1, ease: 'power2.out' }, 'burst')
  tl.to(anim, { bloom: 0.5 + tier * 0.22, duration: 0.12 }, 'burst')
  tl.to(anim, { bloom: 0.15 + tier * 0.04, duration: 1.2, ease: 'power2.out' }, 'burst+=0.12')
  tl.to(anim, { shake: (0.4 + tier * 0.22) * shakeK, duration: 0.05 }, 'burst')
  tl.to(anim, { shake: 0, duration: 0.7 + tier * 0.1, ease: 'power3.out' }, 'burst+=0.05')
  if (tier >= 4 && !reducedMotion) {
    tl.to(anim, { aberration: tier >= 6 ? 1.6 : 1, duration: 0.06 }, 'burst')
    tl.to(anim, { aberration: 0, duration: 0.6, ease: 'power2.out' }, 'burst+=0.06')
  }
  tl.to(anim, { dolly: 0, duration: 0.8, ease: 'power2.out' }, 'burst')

  if (multi) {
    tl.call(() => onPhase('reveal'), [], 'burst+=0.9')
    return tl
  }

  // Item rises as a silhouette inside the beam, then is lit and glinted.
  const riseDur = (tier >= 5 ? 1.6 : 1.15) * k
  const litAt = riseDur * 0.7
  tl.addLabel('rise', `burst+=${(tier >= 5 ? 0.75 : 0.45) * k}`)
  tl.call(() => {
    onPhase('rise')
    sfx.whoosh(0.8 + tier * 0.1)
  }, [], 'rise')
  tl.to(anim, { item: 1, duration: riseDur, ease: 'power2.out' }, 'rise')
  tl.to(anim, { frame: 1, duration: riseDur * 1.08, ease: 'power2.inOut' }, 'rise')
  tl.to(anim, { beam: tier >= 2 ? 0.38 : 0.22, glow: 1.0, duration: 1.4 }, 'rise+=0.3')
  tl.to(anim, { itemLit: 1, duration: 0.55 * k, ease: 'power2.inOut' }, `rise+=${litAt}`)
  tl.call(() => {
    if (tier >= 3) sfx.shimmer(0.7, tier)
  }, [], `rise+=${litAt}`)
  tl.fromTo(anim, { glint: 0 }, { glint: 1, duration: 0.8 * k, ease: 'power2.inOut' }, `rise+=${litAt + 0.15}`)
  tl.set(anim, { glint: -1 }, `rise+=${litAt + 0.15 + 0.8 * k}`)
  tl.call(() => onPhase('reveal'), [], `rise+=${riseDur * 0.8}`)
  return tl
}

/** Jumps an in-flight reveal to its final state. */
export function settleReveal(anim: ChestAnim, final: RarityId, multi = false) {
  const hex = RARITIES[final].hex
  anim.glowColor.set(hex)
  anim.beamColor.set(hex)
  anim.lockOff = 1
  anim.heat = 0
  anim.rattle = 0
  anim.lid = 1
  anim.glow = 1.4
  anim.beam = RARITIES[final].tier >= 2 ? 0.38 : 0.22
  anim.ring = 0
  anim.shake = 0
  anim.aberration = 0
  anim.bloom = 0.25
  anim.dolly = 0
  if (!multi) {
    anim.item = 1
    anim.itemLit = 1
    anim.frame = 1
  }
  anim.glint = -1
}
