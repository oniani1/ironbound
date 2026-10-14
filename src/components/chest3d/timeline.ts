import gsap from 'gsap'
import { Color } from 'three'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { sfx } from '../../lib/audio'
import type { ChestAnim } from './animState'

export type Phase = 'intro' | 'await' | 'tell' | 'lift' | 'burst' | 'rise' | 'reveal'

interface RevealOptions {
  tell: RarityId[]
  fast: boolean
  /** Multi-open stops after the burst; cards take over in the DOM. */
  multi?: boolean
  reducedMotion?: boolean
  onPhase: (p: Phase) => void
  /** Called with each rarity the light passes through. */
  onTell?: (r: RarityId) => void
  /** Pause with the lid half open until the caller resumes (the player lifts it). */
  lift?: boolean
}

function tweenColor(tl: gsap.core.Timeline, target: Color, hex: string, at: number | string, duration: number) {
  const c = new Color(hex)
  tl.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.out' }, at)
}

/** Candles on the plinth, in the order they catch. Matches Atmosphere's CANDLES. */
const CANDLE_COUNT = 4

/**
 * The arrival: a dark chamber, candles catch one after another, the camera cranes down as
 * the chest lowers onto the plinth and lands heavily, then it breathes once at the seams.
 */
export function introTimeline(anim: ChestAnim, onDone: () => void, fast = false) {
  anim.reset()
  anim.idle = 0
  anim.glowColor.set('#ffb35c')
  const tl = gsap.timeline({ onComplete: onDone })
  if (fast || anim.still) {
    anim.drop = 1
    anim.candles = 1
    anim.room = 1
    anim.glow = 0.25
    tl.call(() => sfx.thud(0.5))
    return tl
  }
  anim.drop = 0
  anim.candles = 0
  anim.room = 0.06
  anim.crane = 1
  anim.glow = 0.12
  tl.to(anim, { room: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
  tl.to(anim, { candles: 1, duration: 1.1, ease: 'none' }, 0.12)
  for (let i = 0; i < CANDLE_COUNT; i++) tl.call(() => sfx.ignite(), [], 0.14 + i * (1.1 / CANDLE_COUNT))
  tl.to(anim, { crane: 0, duration: 1.9, ease: 'power3.inOut' }, 0.15)
  tl.to(anim, { drop: 1, duration: 0.85, ease: 'power3.in' }, 0.6)
  tl.call(
    () => {
      sfx.thud(1)
      anim.emit(26, '#c9a27a', 0.55)
    },
    [],
    1.45,
  )
  tl.to(anim, { shake: 0.9, duration: 0.05 }, 1.45)
  tl.to(anim, { shake: 0, duration: 0.5, ease: 'power2.out' }, 1.5)
  // One breath of light at the seams: something inside.
  tl.to(anim, { glow: 0.6, duration: 0.4, ease: 'sine.inOut' }, 1.75)
  tl.to(anim, { glow: 0.28, duration: 0.55, ease: 'sine.inOut' }, 2.15)
  return tl
}

/** Applies hold progress (0..1) while the player charges the seal. */
export function applyCharge(anim: ChestAnim, p: number) {
  anim.heat = p
  // Reduced motion: the lock heats and glows, but nothing shakes and the camera holds.
  anim.rattle = anim.still || p < 0.05 ? 0 : 0.15 + p * 0.85
  anim.dolly = anim.still ? 0 : p
  anim.glow = 0.25 + p * 0.7
  anim.bloom = p * 0.35
}

/**
 * The reveal. The lock is knocked off; then the tease: the lid lifts a crack, light spills
 * through the gap as rays, and it falls shut again, once per rarity the light climbs
 * through, each beat brighter, louder and closer. The top tiers black out first. The lid
 * then hangs half open, pouring light, until the player lifts it (or the caller resumes).
 * Burst, beam and shockwave follow; the piece rises as a silhouette, holds, and is lit
 * from the top, with a macro shot on a telling detail for Rare and up.
 */
export function revealTimeline(anim: ChestAnim, opts: RevealOptions) {
  const { tell, fast, multi, reducedMotion, onPhase, onTell, lift } = opts
  const final = tell[tell.length - 1] ?? 'common'
  const tier = RARITIES[final].tier
  const steps = fast ? [final] : tell
  const k = fast ? 0.28 : 1
  const shakeK = reducedMotion ? 0 : 1
  const beamHex = RARITIES[final].hex
  const tl = gsap.timeline()

  tl.call(() => {
    onPhase('tell')
    if (!fast) {
      sfx.startTension()
      sfx.setTension(0.1)
    }
  })
  // Lock knocked off.
  tl.to(anim, { heat: 1, duration: 0.08 * k })
  tl.call(() => {
    sfx.clank()
    anim.emit(40, '#ffb066', 1.1)
  })
  tl.to(anim, { lockOff: 1, duration: 0.7 * k, ease: 'power2.in' }, '<')
  tl.to(anim, { heat: 0, rattle: 0, dolly: 0, duration: 0.5 * k, ease: 'power2.out' }, '<')
  tl.to(anim, { shake: 0.5 * shakeK, duration: 0.04 }, '<')
  tl.to(anim, { shake: 0, duration: 0.35 * k, ease: 'power2.out' }, '<0.04')

  if (!fast) {
    // Silence before the first light, and a slow drift around the chest for the whole tease.
    // The drift is placed at a label so later '>' positions follow the beats, not the drift.
    tl.call(() => sfx.heartbeat(0.8), [], '>+0.12')
    tl.addLabel('tease', '>')
    tl.to(anim, { orbit: 0.2, duration: 1.6 + steps.length * 1.25, ease: 'sine.inOut' }, 'tease')
    tl.addLabel('beats', 'tease+=0.6')
  }

  steps.forEach((r, i) => {
    const rr = RARITIES[r]
    const label = `beat${i}`
    tl.addLabel(label, i === 0 ? (fast ? '>' : 'beats') : `>+${0.42 * k}`)
    tl.call(
      () => {
        if (i === 0) sfx.creak(0.6)
        else sfx.ting(i)
        anim.emit(22 + i * 18, new Color(rr.hex), 0.7 + i * 0.1)
        onTell?.(r)
        sfx.setTension((i + 1) / (steps.length + 1))
      },
      [],
      label,
    )
    tweenColor(tl, anim.glowColor, rr.hex, label, 0.22 * k)
    // The lid lifts a crack and the light spills out through it, stronger on every beat and
    // for every tier, so the first glimpse never looks like the last.
    const spill = (0.4 + (0.6 * (i + 1)) / steps.length) * (0.55 + 0.45 * Math.min(1, rr.tier / 4))
    tl.to(anim, { lid: 0.075 + i * 0.035, glow: 1.0 + i * 0.22, gapLight: spill, bloom: 0.15 + i * 0.08, duration: 0.34 * k, ease: 'power3.out' }, label)
    tl.to(anim, { flare: 0.6 + i * 0.15, duration: 0.15 }, label)
    tl.to(anim, { flare: 0, duration: 0.6, ease: 'power2.out' }, `${label}+=0.15`)
    tl.to(anim, { dolly: Math.min(0.55, 0.11 * (i + 1)), duration: 0.6 * k, ease: 'power2.out' }, label)
    if (rr.tier >= 3) {
      // Rare and up: the candles take the color too.
      tweenColor(tl, anim.candleTint, rr.hex, label, 0.3)
      tl.to(anim, { candleTintAmt: Math.min(1, 0.35 + (rr.tier - 3) * 0.22), duration: 0.3 }, label)
    }
    if (!fast) {
      // It holds, then falls shut with a slam; the light keeps leaking at the seams.
      tl.to(anim, { lid: 0.01, gapLight: 0.32, glow: 0.65 + i * 0.15, duration: 0.17, ease: 'power2.in' }, `${label}+=0.72`)
      tl.call(
        () => {
          sfx.slam(0.5 + i * 0.12)
          sfx.heartbeat(0.55 + i * 0.1)
        },
        [],
        '>',
      )
      tl.to(anim, { shake: (0.28 + i * 0.1) * shakeK, duration: 0.04 }, '<')
      tl.to(anim, { shake: 0, duration: 0.3 }, '>')
    }
    tl.addLabel(`${label}end`, '>')
  })

  if (!fast && tier >= 5) {
    // Blackout: the candles go out one by one, the room falls dark and silent, then
    // everything returns at once in the rarity's color and the chest lifts off the stone.
    tl.addLabel('blackout', '>+0.3')
    tl.call(() => sfx.blackout(), [], 'blackout')
    tl.to(anim, { candles: 0, room: 0.03, glow: 0.12, gapLight: 0, bloom: 0, duration: 0.32, ease: 'power2.in' }, 'blackout')
    tl.addLabel('return', '>+0.8')
    tweenColor(tl, anim.candleTint, beamHex, 'return', 0.01)
    tl.set(anim, { candleTintAmt: 1 }, 'return')
    tl.to(anim, { candles: 1, flare: 1.5, room: 0.55, glow: 2.3, gapLight: 1, lid: 0.14, bloom: 0.6, duration: 0.24, ease: 'power3.out' }, 'return')
    tl.call(
      () => {
        sfx.burst(3)
        sfx.heartbeat(1)
        anim.emit(90, new Color(beamHex), 1.25)
      },
      [],
      'return',
    )
    tl.to(anim, { flare: 0.25, bloom: 0.3, duration: 0.9, ease: 'power2.out' }, 'return+=0.24')
    tl.to(anim, { levitate: 1, duration: 1.3, ease: 'power2.out' }, 'return')
    tl.addLabel('afterBlackout', 'return+=0.9')
  }

  // The lid rises half open and hangs there, pouring light.
  tl.addLabel('hang', fast ? '>' : !fast && tier >= 5 ? 'afterBlackout' : `beat${steps.length - 1}end+=0.25`)
  tl.to(anim, { lid: fast ? 0.12 : 0.2, glow: 1.4 + tier * 0.12, gapLight: 0.6 + 0.4 * Math.min(1, tier / 4), duration: 0.55 * k, ease: 'power2.out' }, 'hang')
  if (!fast) tl.call(() => sfx.setTension(0.9), [], 'hang')
  const pause = lift && !fast
  if (pause) {
    tl.call(() => onPhase('lift'), [], 'hang+=0.35')
    tl.addPause('hang+=0.4')
  }

  // The burst sits just after the pause, so a paused timeline never fires it early.
  tl.addLabel('burst', fast ? `>+${0.1 * k}` : pause ? 'hang+=0.45' : 'hang+=0.6')
  tl.call(
    () => {
      onPhase('burst')
      sfx.stopTension(0.1)
      anim.beamColor.set(beamHex)
      sfx.burst(tier)
      anim.emit(70 + tier * 45, new Color(beamHex), 1 + tier * 0.12)
      if (tier >= 4) anim.emit(60, '#fff2d6', 1.4)
    },
    [],
    'burst',
  )
  tl.to(anim, { lid: 1, duration: 0.55 * k, ease: 'back.out(1.6)' }, 'burst')
  tl.to(anim, { gapLight: 0, duration: 0.3 }, 'burst')
  tl.to(anim, { glow: (1.5 + tier * 0.12) * (fast ? 0.8 : 1), duration: 0.25 }, 'burst')
  tl.to(anim, { beam: tier >= 2 ? 1 : 0.55, duration: 0.3 * k, ease: 'power2.out' }, 'burst')
  tl.fromTo(anim, { ring: 0.001 }, { ring: 1, duration: 1.1, ease: 'power2.out' }, 'burst')
  tl.to(anim, { flare: 1.2, duration: 0.1 }, 'burst')
  tl.to(anim, { flare: 0, duration: 1.2, ease: 'power2.out' }, 'burst+=0.1')
  tl.to(anim, { room: 1, orbit: 0, duration: 1.2, ease: 'power2.inOut' }, 'burst')
  // Fast lands within half a second of the burst, so its flash is smaller and settles sooner.
  tl.to(anim, { bloom: (0.5 + tier * 0.22) * (fast ? 0.55 : 1), duration: 0.12 }, 'burst')
  tl.to(anim, { bloom: 0.15 + tier * 0.04, duration: fast ? 0.3 : 1.2, ease: 'power2.out' }, 'burst+=0.12')
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

  // The piece rises as a silhouette inside the beam and holds there a moment before the
  // light finds it. Rare and above: a macro shot on a telling detail (hilt, visor, boss)
  // while grazing light runs down the steel, then the camera pulls back to the whole piece.
  const macro = !fast && !reducedMotion && tier >= 3
  const riseDur = fast ? 0.32 : macro ? 1.1 : tier >= 2 ? 1.6 : 1.45
  const litAt = fast ? 0 : macro ? 0.38 : riseDur * 0.78
  const litDur = fast ? 0.15 : macro ? 0.7 : 0.6
  tl.addLabel('rise', `burst+=${fast ? 0.05 : (tier >= 5 ? 0.8 : 0.5) * k}`)
  tl.call(
    () => {
      onPhase('rise')
      sfx.whoosh(0.8 + tier * 0.1)
    },
    [],
    'rise',
  )
  if (macro) tl.set(anim, { macro: 1 }, `rise-=${0.3 * k}`)
  tl.to(anim, { frame: 1, duration: macro ? 0.7 : riseDur * 0.85, ease: 'power2.inOut' }, `rise-=${0.3 * k}`)
  tl.to(anim, { item: 1, duration: riseDur, ease: macro ? 'power3.out' : 'power2.out' }, 'rise')
  tl.to(anim, { beam: tier >= 2 ? 0.38 : 0.22, glow: 1.0, duration: 1.4 }, 'rise+=0.3')
  tl.to(anim, { itemLit: 1, duration: litDur, ease: 'power2.inOut' }, `rise+=${litAt}`)
  tl.call(
    () => {
      if (tier >= 3) sfx.shimmer(0.7, tier)
    },
    [],
    `rise+=${litAt}`,
  )
  const glintAt = macro ? litAt + 0.08 : litAt + 0.15
  const glintDur = macro ? 0.8 : 0.8 * k
  // Fast mode lands the piece fully lit, without a sweep.
  if (!fast) {
    tl.fromTo(anim, { glint: 0 }, { glint: 1, duration: glintDur, ease: 'power2.inOut' }, `rise+=${glintAt}`)
    tl.set(anim, { glint: -1 }, `rise+=${glintAt + glintDur}`)
  }
  const pullBack = 1.25
  if (macro) {
    tl.to(anim, { macro: 0, duration: 1.0, ease: 'power3.inOut' }, `rise+=${pullBack}`)
    tl.call(() => sfx.whoosh(0.45), [], `rise+=${pullBack}`)
  }
  tl.call(() => onPhase('reveal'), [], macro ? `rise+=${pullBack + 0.85}` : `rise+=${fast ? riseDur * 0.4 : litAt + litDur + 0.25}`)
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
  anim.room = 1
  anim.candles = 1
  anim.flare = 0
  anim.gapLight = 0
  anim.orbit = 0
  anim.crane = 0
  anim.drop = 1
  if (!multi) {
    anim.item = 1
    anim.itemLit = 1
    anim.frame = 1
  }
  anim.macro = 0
  anim.glint = -1
  sfx.stopTension(0.1)
}
