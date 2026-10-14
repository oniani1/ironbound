import gsap from 'gsap'
import { Color } from 'three'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import type { ChestAnim } from './animState'

export type Phase = 'intro' | 'await' | 'tell' | 'rise' | 'burst' | 'reveal'

interface RevealOptions {
  /** The rarity of the piece. */
  rarity: RarityId
  fast: boolean
  /** Multi-open stops after the lid opens; cards take over in the DOM. */
  multi?: boolean
  reducedMotion?: boolean
  onPhase: (p: Phase) => void
  /** The rarity is named: the last beat of the reveal. */
  onRarity?: (r: RarityId) => void
  /** How many facts the overlay shows while the camera travels along the piece. */
  beats?: number
  /** Called as each fact should appear, 0 first. */
  onBeat?: (i: number) => void
}

/** Warm torchlight: the light in the chest and on the piece until the rarity is named. */
const NEUTRAL = '#ffd9a8'

/** Seconds between facts: the founder asked for one every second to second and a half. */
export const BEAT_S = 1.05

function tweenColor(tl: gsap.core.Timeline, target: Color, hex: string, at: number | string, duration: number) {
  const c = new Color(hex)
  tl.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.out' }, at)
}

/**
 * The arrival: the hall is dark, the torchlight comes up, the camera cranes down as the
 * chest lowers onto the altar and lands heavily, then it breathes once at the seams.
 */
export function introTimeline(anim: ChestAnim, onDone: () => void, fast = false) {
  anim.reset()
  anim.idle = 0
  anim.glowColor.set(NEUTRAL)
  anim.beamColor.set(NEUTRAL)
  const tl = gsap.timeline({ onComplete: onDone })
  if (fast || anim.still) {
    anim.drop = 1
    anim.room = 1
    anim.glow = 0.25
    return tl
  }
  anim.drop = 0
  anim.room = 0.05
  anim.crane = 1
  anim.glow = 0.12
  tl.to(anim, { room: 1, duration: 1.8, ease: 'power2.inOut' }, 0)
  tl.to(anim, { crane: 0, duration: 1.9, ease: 'power3.inOut' }, 0.15)
  tl.to(anim, { drop: 1, duration: 0.85, ease: 'power3.in' }, 0.6)
  tl.call(() => anim.emit(26, '#c9a27a', 0.55), [], 1.45)
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
 * The reveal, in the order the founder set (about ten seconds). The lock breaks and falls
 * to the stone. The lid breathes open twice in plain torchlight, then opens by itself. The
 * piece rises into an extreme close-up and the camera travels slowly along it in plain
 * light, no rarity color anywhere, while the overlay names one fact at a time (where it is
 * from, what it is, old or new, its year or maker, its weight). The camera pulls back to
 * the whole piece, and only then is the rarity named, with its light flooding the hall;
 * the top two tiers black out first. The name and the receipt follow.
 */
export function revealTimeline(anim: ChestAnim, opts: RevealOptions) {
  const { rarity, fast, multi, reducedMotion, onPhase, onRarity, beats = 4, onBeat } = opts
  const tier = RARITIES[rarity].tier
  const hex = RARITIES[rarity].hex
  const k = fast ? 0.28 : 1
  const shakeK = reducedMotion ? 0 : 1
  const tl = gsap.timeline()

  tl.call(() => onPhase('tell'))
  // The lock is knocked off, tumbles onto the altar and stays there.
  tl.addLabel('strike')
  tl.to(anim, { heat: 1, duration: 0.08 * k }, 'strike')
  tl.call(() => anim.emit(40, '#ffb066', 1.1), [], 'strike+=0.08')
  tl.to(anim, { lockOff: 1, duration: 0.95 * k, ease: 'none' }, 'strike+=0.08')
  tl.to(anim, { heat: 0, rattle: 0, dolly: 0, duration: 0.5 * k, ease: 'power2.out' }, 'strike+=0.08')
  tl.to(anim, { shake: 0.5 * shakeK, duration: 0.04 }, 'strike+=0.08')
  tl.to(anim, { shake: 0, duration: 0.35 * k, ease: 'power2.out' }, 'strike+=0.12')

  if (!fast) {
    // Two breaths of plain light at the seams once the lock has landed. Every rarity looks
    // the same here.
    tl.addLabel('tease', 'strike+=1.0')
    tl.to(anim, { orbit: 0.14, duration: 2.6, ease: 'sine.inOut' }, 'tease')
    const breaths = [
      { lid: 0.06, glow: 0.8, gap: 0.45, dolly: 0.14, hold: 0.3 },
      { lid: 0.1, glow: 1.0, gap: 0.7, dolly: 0.26, hold: 0.38 },
    ]
    breaths.forEach((b, i) => {
      const label = `breath${i}`
      tl.addLabel(label, i === 0 ? 'tease' : 'tease+=1.05')
      tl.to(anim, { lid: b.lid, glow: b.glow, gapLight: b.gap, duration: 0.38, ease: 'power3.out' }, label)
      tl.to(anim, { dolly: b.dolly, duration: 0.7, ease: 'power2.out' }, label)
      tl.to(anim, { flare: 0.5 + i * 0.25, duration: 0.15 }, label)
      tl.to(anim, { flare: 0, duration: 0.55, ease: 'power2.out' }, `${label}+=0.15`)
      tl.call(() => anim.emit(14 + i * 10, NEUTRAL, 0.55), [], label)
      tl.to(anim, { lid: 0.012, gapLight: 0.2, glow: 0.55, duration: 0.16, ease: 'power2.in' }, `${label}+=${0.38 + b.hold}`)
      tl.to(anim, { shake: (0.26 + i * 0.12) * shakeK, duration: 0.04 }, '>')
      tl.to(anim, { shake: 0, duration: 0.28 }, '>')
    })
  }

  // The lid opens by itself, in plain light.
  tl.addLabel('open', fast ? 'strike+=0.3' : 'tease+=2.0')
  tl.call(() => onPhase('rise'), [], 'open')
  tl.to(anim, { lid: 1, duration: 0.6 * k, ease: 'back.out(1.4)' }, 'open')
  tl.to(anim, { gapLight: 0, duration: 0.25 }, 'open')
  tl.to(anim, { glow: 1.2, beam: 0.3, room: 1, orbit: 0, dolly: 0, duration: 0.7 * k, ease: 'power2.out', overwrite: 'auto' }, 'open')
  tl.call(() => anim.emit(36, NEUTRAL, 0.8), [], 'open')
  tl.to(anim, { shake: 0.3 * shakeK, duration: 0.04 }, 'open')
  tl.to(anim, { shake: 0, duration: 0.4 }, 'open+=0.04')

  if (multi) {
    tl.call(() => onPhase('reveal'), [], 'open+=0.9')
    return tl
  }

  const lightUp = () => {
    tweenColor(tl, anim.glowColor, hex, 'burst', 0.25 * k)
    tl.to(anim, { tint: 1, duration: 0.35 * k, ease: 'power2.out' }, 'burst')
    tl.call(() => {
      anim.beamColor.set(hex)
      onRarity?.(rarity)
      anim.emit(70 + tier * 45, new Color(hex), 1 + tier * 0.12)
      if (tier >= 4) anim.emit(60, '#fff2d6', 1.4)
    }, [], 'burst')
    tl.fromTo(anim, { ring: 0.001 }, { ring: 1, duration: 1.1, ease: 'power2.out' }, 'burst')
    tl.to(anim, { glow: 1.4 + tier * 0.15, beam: tier >= 2 ? 1 : 0.6, room: 1, duration: 0.3 * k, ease: 'power2.out', overwrite: 'auto' }, 'burst')
    tl.to(anim, { bloom: (0.5 + tier * 0.22) * (fast ? 0.55 : 1), duration: 0.12 }, 'burst')
    tl.to(anim, { bloom: 0.15 + tier * 0.04, duration: fast ? 0.3 : 1.1, ease: 'power2.out' }, 'burst+=0.12')
    tl.to(anim, { flare: 1.2, duration: 0.1 }, 'burst')
    tl.to(anim, { flare: 0, duration: 1.1, ease: 'power2.out' }, 'burst+=0.1')
    tl.to(anim, { shake: (0.35 + tier * 0.15) * shakeK, duration: 0.05 }, 'burst')
    tl.to(anim, { shake: 0, duration: 0.6 + tier * 0.08, ease: 'power3.out' }, 'burst+=0.05')
    // Settle to a calmer glow for the receipt.
    tl.to(anim, { beam: tier >= 2 ? 0.38 : 0.24, duration: 1.2, ease: 'power2.out' }, 'burst+=0.5')
  }

  if (fast || reducedMotion) {
    tl.to(anim, { frame: 1, item: 1, itemLit: 1, duration: 0.3, ease: 'power2.out' }, 'open+=0.1')
    tl.addLabel('burst', 'open+=0.25')
    tl.call(() => onPhase('burst'), [], 'burst')
    lightUp()
    tl.call(() => onPhase('reveal'), [], 'burst+=0.2')
    return tl
  }

  // The close-up. The camera dives first, so the piece is never seen whole on its way up;
  // it rises into the frame end first, dimly lit, and the light comes up as the camera
  // travels. Plain light: the rarity is still unknown.
  const n = Math.max(1, beats)
  const travel = Math.max(3.3, n * BEAT_S + 0.2)
  tl.addLabel('dive', 'open+=0.35')
  tl.set(anim, { macro: 1, along: 0, itemLit: 0.3 }, 'dive')
  tl.to(anim, { frame: 1, duration: 0.6, ease: 'power2.inOut' }, 'dive')
  // Hold here until the camera has actually arrived, so a slow device never shows the
  // whole piece on its way up.
  tl.addPause('dive+=0.6', () => waitForClose(anim, tl))
  tl.to(anim, { item: 1, duration: 0.9, ease: 'power3.out' }, 'dive+=0.75')
  tl.to(anim, { beam: 0.12, glow: 0.6, duration: 1.2 }, 'dive+=0.4')
  tl.addLabel('travel', 'dive+=1.1')
  tl.to(anim, { along: 1, duration: travel, ease: 'sine.inOut' }, 'travel')
  tl.to(anim, { itemLit: 1, duration: 1.3, ease: 'power2.out' }, 'travel')
  tl.fromTo(anim, { glint: 1 }, { glint: 0, duration: travel, ease: 'sine.inOut' }, 'travel')
  tl.set(anim, { glint: -1 }, `travel+=${travel}`)
  for (let i = 0; i < n; i++) tl.call(() => onBeat?.(i), [], `travel+=${0.2 + i * BEAT_S}`)
  // Pull back to the whole piece, still in plain light.
  tl.to(anim, { macro: 0, duration: 0.9, ease: 'power3.inOut' }, `travel+=${travel - 0.35}`)

  // Only now the rarity. The top tiers fall dark for a beat first.
  if (tier >= 5) {
    tl.addLabel('dark', `travel+=${travel + 0.45}`)
    tl.to(anim, { room: 0.04, glow: 0.12, beam: 0.04, itemLit: 0.25, duration: 0.3, ease: 'power2.in', overwrite: 'auto' }, 'dark')
    tl.addLabel('burst', 'dark+=0.7')
    tl.to(anim, { itemLit: 1, levitate: 1, duration: 0.35, ease: 'power2.out' }, 'burst')
    if (!reducedMotion) {
      tl.to(anim, { aberration: tier >= 6 ? 1.6 : 1, duration: 0.06 }, 'burst')
      tl.to(anim, { aberration: 0, duration: 0.6, ease: 'power2.out' }, 'burst+=0.06')
    }
  } else {
    tl.addLabel('burst', `travel+=${travel + 0.6}`)
  }
  tl.call(() => onPhase('burst'), [], 'burst')
  lightUp()
  tl.call(() => onPhase('reveal'), [], `burst+=${tier >= 5 ? 1.4 : 1.1}`)
  return tl
}

/** Resumes a paused reveal once the camera reports the close-up, or after 2.5 s at most. */
function waitForClose(anim: ChestAnim, tl: gsap.core.Timeline) {
  const start = performance.now()
  const check = () => {
    // A killed timeline (skip, close, replay) has left its parent: stop waiting.
    if (!tl.parent) return gsap.ticker.remove(check)
    if (anim.closeReady || performance.now() - start > 2500) {
      gsap.ticker.remove(check)
      tl.resume()
    }
  }
  gsap.ticker.add(check)
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
  anim.beam = RARITIES[final].tier >= 2 ? 0.38 : 0.24
  anim.ring = 0
  anim.shake = 0
  anim.aberration = 0
  anim.bloom = 0.25
  anim.dolly = 0
  anim.room = 1
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
  anim.tint = 1
  anim.macro = 0
  anim.along = 0
  anim.glint = -1
}
