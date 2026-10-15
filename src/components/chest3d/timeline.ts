import gsap from 'gsap'
import { Color } from 'three'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import type { ChestAnim } from './animState'

export type Phase = 'intro' | 'await' | 'tell' | 'rise' | 'burst' | 'title' | 'reveal'

interface RevealOptions {
  /** The rarity of the piece. */
  rarity: RarityId
  fast: boolean
  /** Multi-open stops after the lid opens; cards take over in the DOM. */
  multi?: boolean
  reducedMotion?: boolean
  onPhase: (p: Phase) => void
  /** The rarity is named. */
  onRarity?: (r: RarityId) => void
  /** How many facts the overlay shows while the camera travels along the piece. */
  beats?: number
  /** Called as each fact should appear, 0 first; called with the count once the last one ends. */
  onBeat?: (i: number) => void
}

/** Warm light: the light in the chest and on the piece until the rarity is named. */
const NEUTRAL = '#ffd9a8'

/**
 * Seconds each fact holds the screen (the founder asked for at least 2.5 s each): about 0.2 s
 * to arrive, 2.5 s fully legible, 0.1 s to leave.
 */
export const FACT_S = 2.8

/** How long the rarity has the screen to itself, and how long the name and value build after it. */
export const RARITY_HOLD_S = 2.4
export const TITLE_S = 3.5

function tweenColor(tl: gsap.core.Timeline, target: Color, hex: string, at: number | string, duration: number) {
  const c = new Color(hex)
  tl.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.out' }, at)
}

/**
 * The arrival, short enough that the seal can be held from the first moment (the founder,
 * fourth review): the sunlight comes up, the camera settles from a little higher, the chest
 * drops onto the altar and lands heavily, then it breathes once at the seams. A hold that
 * starts during it hurries it along, so the chest is down before the seal gives.
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
  anim.crane = 0.55
  anim.glow = 0.12
  tl.to(anim, { room: 1, duration: 0.9, ease: 'power2.out' }, 0)
  tl.to(anim, { crane: 0, duration: 1.0, ease: 'power3.out' }, 0)
  tl.to(anim, { drop: 1, duration: 0.55, ease: 'power3.in' }, 0.1)
  tl.call(() => anim.emit(26, '#c9a27a', 0.55), [], 0.65)
  tl.to(anim, { shake: 0.9, duration: 0.05 }, 0.65)
  tl.to(anim, { shake: 0, duration: 0.45, ease: 'power2.out' }, 0.7)
  // One breath of light at the seams: something inside.
  tl.to(anim, { glow: 0.6, duration: 0.3, ease: 'sine.inOut' }, 0.8)
  tl.to(anim, { glow: 0.28, duration: 0.4, ease: 'sine.inOut' }, 1.1)
  return tl
}

/**
 * Runs `go` once the chest is in the scene, so a seal broken in the first moments of a cold
 * opening never plays to an empty room. Without a live scene (no WebGL, or the scene failed)
 * it goes after 1.5 s, and it never waits longer than 4 s. Returns a function that cancels it.
 */
export function whenChestReady(anim: ChestAnim, go: () => void) {
  if (anim.chestReady) {
    go()
    return () => {}
  }
  const start = performance.now()
  const check = () => {
    const waited = performance.now() - start
    const live = anim.rigTick > start
    if (anim.chestReady || (!live && waited > 1500) || waited > 4000) {
      gsap.ticker.remove(check)
      go()
    }
  }
  gsap.ticker.add(check)
  return () => gsap.ticker.remove(check)
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
 * The reveal, in the order the founder set in the third review. The lock breaks and falls to
 * the stone. A held breath: the camera sinks to the rim line while the seam light swells, the
 * lid shut. The lid opens once, slowly, and the open chest is full of light. The camera tilts
 * up into that light and climbs to meet the piece, which rises into an extreme close-up and is
 * never seen whole first. The camera travels slowly along it in plain light while the facts
 * arrive one at a time, each held 2.8 s (where it is from, what it is, antique or newly
 * forged, its year or maker, its weight). A slow pull back to the whole piece, a breath (the
 * top two tiers fall dark), then the rarity floods the hall and holds the screen alone. Then
 * the name, the provenance and the value build beside the piece, then the receipt.
 */
export function revealTimeline(anim: ChestAnim, opts: RevealOptions) {
  const { rarity, fast, multi, reducedMotion, onPhase, onRarity, beats = 4, onBeat } = opts
  const tier = RARITIES[rarity].tier
  const hex = RARITIES[rarity].hex
  const k = fast ? 0.28 : 1
  const shakeK = reducedMotion ? 0 : 1
  const tl = gsap.timeline()
  // A replay starts from the plain light of the study, whatever the last rarity was.
  anim.glowColor.set(NEUTRAL)
  anim.beamColor.set(NEUTRAL)

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
    // A held breath with the lid shut: the camera sinks to the rim line and the seam light swells.
    tl.addLabel('tension', 'strike+=0.1')
    tl.to(anim, { low: 1, duration: 1.1, ease: 'sine.inOut' }, 'tension')
    tl.to(anim, { glow: 0.95, duration: 1.1, ease: 'sine.in' }, 'tension')
    tl.to(anim, { rattle: 0.2 * shakeK, duration: 0.5, ease: 'sine.in' }, 'tension+=0.55')
  }

  // The lid opens, once, in plain light.
  tl.addLabel('open', fast ? 'strike+=0.3' : 'strike+=1.2')
  tl.call(() => onPhase('rise'), [], 'open')
  tl.to(anim, { rattle: 0, duration: 0.2 }, 'open')
  tl.to(anim, { lid: 1, duration: 1.5 * k, ease: 'sine.inOut' }, 'open')
  tl.fromTo(anim, { gapLight: 0 }, { gapLight: 0.8, duration: 0.45 * k, ease: 'power2.out', immediateRender: false }, 'open')
  tl.to(anim, { gapLight: 0, duration: 0.6 * k }, `open+=${0.6 * k}`)
  tl.to(anim, { glow: 1.2, beam: 0.3, room: 1, dolly: 0, duration: 1.2 * k, ease: 'power2.out', overwrite: 'auto' }, 'open')
  tl.call(() => anim.emit(36, NEUTRAL, 0.8), [], `open+=${0.5 * k}`)
  // A soft thud as it comes to rest on its hinges.
  tl.to(anim, { shake: 0.22 * shakeK, duration: 0.04 }, `open+=${1.45 * k}`)
  tl.to(anim, { shake: 0, duration: 0.4 }, `open+=${1.49 * k}`)

  if (multi) {
    tl.to(anim, { low: 0, duration: 0.6 }, `open+=${1.5 * k}`)
    tl.call(() => onPhase('reveal'), [], `open+=${1.6 * k}`)
    return tl
  }

  const lightUp = (settle: number) => {
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
    // Settle to a calmer glow for the name and the receipt.
    tl.to(anim, { beam: tier >= 2 ? 0.38 : 0.24, duration: settle, ease: 'power2.out' }, 'burst+=0.5')
  }

  if (fast || reducedMotion) {
    tl.to(anim, { low: 0, duration: 0.2 }, 'open')
    tl.to(anim, { frame: 1, item: 1, itemLit: 1, duration: 0.3, ease: 'power2.out' }, 'open+=0.1')
    tl.addLabel('burst', 'open+=0.25')
    tl.call(() => onPhase('burst'), [], 'burst')
    lightUp(1.2)
    tl.call(() => onPhase('reveal'), [], 'burst+=0.2')
    return tl
  }

  // The camera tilts up into the light and moves straight in to the close-up; the piece rises
  // into the shot the moment the camera is there, so there is no waiting on empty light. It
  // never looks down into the chest, and the piece is never seen whole first.
  tl.addLabel('approach', 'open+=0.8')
  tl.to(anim, { lookUp: 1, duration: 0.35, ease: 'sine.inOut' }, 'approach')
  tl.set(anim, { macro: 1, along: 0, itemLit: 0.3 }, 'approach+=0.05')
  tl.to(anim, { frame: 1, duration: 0.75, ease: 'power2.inOut' }, 'approach+=0.05')
  tl.to(anim, { beam: 0.12, glow: 0.6, duration: 0.9 }, 'approach+=0.3')
  tl.addPause('approach+=0.8', () => waitForClose(anim, tl, () => tl.seek('back', true).resume()))
  tl.to(anim, { item: 1, duration: 0.4, ease: 'power2.out' }, 'approach+=0.8')
  // Travel slowly along the piece; each fact holds 2.8 s.
  const n = Math.max(1, beats)
  const travel = n * FACT_S + 0.4
  tl.addLabel('travel', 'approach+=0.95')
  tl.set(anim, { low: 0, lookUp: 0 }, 'travel')
  tl.to(anim, { along: 1, duration: travel, ease: 'sine.inOut' }, 'travel')
  tl.to(anim, { itemLit: 1, duration: 1.8, ease: 'power2.out' }, 'travel')
  tl.fromTo(anim, { glint: 1 }, { glint: 0, duration: travel, ease: 'sine.inOut', immediateRender: false }, 'travel')
  tl.set(anim, { glint: -1 }, `travel+=${travel}`)
  for (let i = 0; i <= n; i++) tl.call(() => onBeat?.(i), [], `travel+=${0.2 + i * FACT_S}`)
  // A slow pull back to the whole piece, still in plain light, and a moment to take it in.
  tl.addLabel('back', `travel+=${travel - 0.2}`)
  tl.to(anim, { macro: 0, duration: 1.4, ease: 'sine.inOut' }, 'back')

  // A breath before the rarity: the hall dims; the top tiers fall dark.
  if (tier >= 5) {
    tl.addLabel('dark', 'back+=1.8')
    tl.to(anim, { room: 0.04, glow: 0.12, beam: 0.04, itemLit: 0.25, duration: 0.4, ease: 'power2.in', overwrite: 'auto' }, 'dark')
    tl.addLabel('burst', 'dark+=0.75')
    tl.to(anim, { itemLit: 1, levitate: 1, duration: 0.35, ease: 'power2.out' }, 'burst')
    if (!reducedMotion) {
      tl.to(anim, { aberration: tier >= 6 ? 1.6 : 1, duration: 0.06 }, 'burst')
      tl.to(anim, { aberration: 0, duration: 0.6, ease: 'power2.out' }, 'burst+=0.06')
    }
  } else {
    tl.addLabel('dim', 'back+=1.8')
    tl.to(anim, { room: 0.55, glow: 0.45, beam: 0.06, duration: 0.45, ease: 'sine.inOut', overwrite: 'auto' }, 'dim')
    tl.addLabel('burst', 'dim+=0.5')
  }
  tl.call(() => onPhase('burst'), [], 'burst')
  lightUp(2.4)
  // The rarity holds the screen on its own; then the name, provenance and value; then the receipt.
  tl.call(() => onPhase('title'), [], `burst+=${RARITY_HOLD_S}`)
  tl.call(() => onPhase('reveal'), [], `burst+=${RARITY_HOLD_S + TITLE_S}`)
  return tl
}

/**
 * Resumes a paused reveal once the piece's photo is in and the camera is close on it. A slow
 * device is asked to jump to the close-up after 2.5 s. Without a live scene (no WebGL, or the
 * scene failed) the reveal goes on after 3.5 s, facts and all. A photo that failed, or is not in
 * after 12 s, skips the study: there is nothing to study, so the camera pulls back and the
 * rarity follows.
 */
function waitForClose(anim: ChestAnim, tl: gsap.core.Timeline, skipStudy: () => void) {
  const start = performance.now()
  const check = () => {
    // A killed timeline (skip, close, replay) has left its parent: stop waiting.
    if (!tl.parent) return gsap.ticker.remove(check)
    const waited = performance.now() - start
    // A live scene's camera has run since the wait began (a hidden tab pauses both alike).
    const live = anim.rigTick > start
    if (anim.closeReady || (!live && waited > 3500)) {
      gsap.ticker.remove(check)
      tl.resume()
    } else if (anim.itemFailed || waited > 12000) {
      gsap.ticker.remove(check)
      skipStudy()
    } else if (waited > 2500 && anim.itemReady) {
      anim.snap = true
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
  anim.low = 0
  anim.lookUp = 0
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
