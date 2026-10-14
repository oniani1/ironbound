import gsap from 'gsap'
import { Color } from 'three'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import type { ChestAnim } from './animState'

export type Phase = 'intro' | 'await' | 'tell' | 'lift' | 'burst' | 'rise' | 'reveal'

interface RevealOptions {
  tell: RarityId[]
  fast: boolean
  /** Multi-open stops after the burst; cards take over in the DOM. */
  multi?: boolean
  reducedMotion?: boolean
  onPhase: (p: Phase) => void
  /** Called with each rarity the light names after the lid opens. */
  onTell?: (r: RarityId) => void
  /** Pause with the lid ajar until the caller resumes (the player lifts it). */
  lift?: boolean
}

/** Warm torchlight: the color of the light inside the chest before the rarity is known. */
const NEUTRAL = '#ffd29a'

function tweenColor(tl: gsap.core.Timeline, target: Color, hex: string, at: number | string, duration: number) {
  const c = new Color(hex)
  tl.to(target, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.out' }, at)
}

/**
 * The arrival: the vault is dark, the torchlight comes up, the camera cranes down as the
 * chest lowers onto the plinth and lands heavily, then it breathes once at the seams.
 */
export function introTimeline(anim: ChestAnim, onDone: () => void, fast = false) {
  anim.reset()
  anim.idle = 0
  anim.glowColor.set(NEUTRAL)
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

/** How long the camera travels along the piece, by rarity tier. */
const PAN_S: Record<number, number> = { 1: 2.2, 2: 2.6, 3: 3.0, 4: 3.4, 5: 3.8, 6: 4.2 }

/**
 * The reveal, in the order the founder asked for. The lock falls; the lid breathes open
 * twice in plain torchlight, telling nothing; it hangs ajar until the player lifts it.
 * Only then is the rarity named: the lid flies open and the light takes its color, climbing
 * through the tiers for the rare ones, the top two after a blackout. The piece rises into a
 * close shot that travels along it from one end to the other while the light comes up, the
 * camera pulls back to the whole piece, and the overlay names it and shows its numbers.
 */
export function revealTimeline(anim: ChestAnim, opts: RevealOptions) {
  const { tell, fast, multi, reducedMotion, onPhase, onTell, lift } = opts
  const final = tell[tell.length - 1] ?? 'common'
  const tier = RARITIES[final].tier
  const k = fast ? 0.28 : 1
  const shakeK = reducedMotion ? 0 : 1
  const tl = gsap.timeline()

  tl.call(() => onPhase('tell'))
  // Lock knocked off.
  tl.to(anim, { heat: 1, duration: 0.08 * k })
  tl.call(() => anim.emit(40, '#ffb066', 1.1))
  tl.to(anim, { lockOff: 1, duration: 0.7 * k, ease: 'power2.in' }, '<')
  tl.to(anim, { heat: 0, rattle: 0, dolly: 0, duration: 0.5 * k, ease: 'power2.out' }, '<')
  tl.to(anim, { shake: 0.5 * shakeK, duration: 0.04 }, '<')
  tl.to(anim, { shake: 0, duration: 0.35 * k, ease: 'power2.out' }, '<0.04')

  if (!fast) {
    // The lid breathes open twice in neutral light. Same for every rarity: nothing is told.
    tweenColor(tl, anim.glowColor, NEUTRAL, '>', 0.2)
    tl.addLabel('tease', '>+0.3')
    tl.to(anim, { orbit: 0.16, duration: 5.5, ease: 'sine.inOut' }, 'tease')
    const breaths = [
      { lid: 0.055, glow: 0.75, gap: 0.42, dolly: 0.12, hold: 0.55 },
      { lid: 0.095, glow: 0.95, gap: 0.62, dolly: 0.22, hold: 0.7 },
    ]
    breaths.forEach((b, i) => {
      const label = `breath${i}`
      tl.addLabel(label, i === 0 ? 'tease' : '>+0.35')
      tl.to(anim, { lid: b.lid, glow: b.glow, gapLight: b.gap, duration: 0.42, ease: 'power3.out' }, label)
      tl.to(anim, { dolly: b.dolly, duration: 0.8, ease: 'power2.out' }, label)
      tl.to(anim, { flare: 0.5 + i * 0.25, duration: 0.15 }, label)
      tl.to(anim, { flare: 0, duration: 0.6, ease: 'power2.out' }, `${label}+=0.15`)
      tl.call(() => anim.emit(14 + i * 10, NEUTRAL, 0.55), [], label)
      // It settles back with a thud; light keeps leaking at the seams.
      tl.to(anim, { lid: 0.012, gapLight: 0.2, glow: 0.55, duration: 0.18, ease: 'power2.in' }, `${label}+=${0.42 + b.hold}`)
      tl.to(anim, { shake: (0.26 + i * 0.12) * shakeK, duration: 0.04 }, '>')
      tl.to(anim, { shake: 0, duration: 0.3 }, '>')
    })
    // The lid rises ajar and hangs there, light pouring out, still telling nothing.
    tl.addLabel('hang', '>+0.3')
    // Done before the pause, so a drag on the lid is never pulled back by this tween.
    tl.to(anim, { lid: 0.17, glow: 1.15, gapLight: 0.85, dolly: 0.3, duration: 0.4, ease: 'power2.out' }, 'hang')
  } else {
    tl.addLabel('hang', '>')
  }

  const pause = lift && !fast
  if (pause) {
    tl.call(() => onPhase('lift'), [], 'hang+=0.4')
    tl.addPause('hang+=0.45')
  }

  // The lid flies open and the rarity is named.
  tl.addLabel('burst', fast ? `>+${0.1 * k}` : pause ? 'hang+=0.5' : 'hang+=0.7')
  tl.call(() => onPhase('burst'), [], 'burst')
  tl.to(anim, { lid: 1, duration: 0.55 * k, ease: 'back.out(1.6)' }, 'burst')
  tl.to(anim, { gapLight: 0, duration: 0.3 }, 'burst')
  tl.fromTo(anim, { ring: 0.001 }, { ring: 1, duration: 1.1, ease: 'power2.out' }, 'burst')
  tl.to(anim, { room: 1, orbit: 0, dolly: 0, duration: 1.0, ease: 'power2.inOut', overwrite: 'auto' }, 'burst')
  tl.to(anim, { shake: (0.35 + tier * 0.12) * shakeK, duration: 0.05 }, 'burst')
  tl.to(anim, { shake: 0, duration: 0.6, ease: 'power3.out' }, 'burst+=0.05')

  // The light names the rarity. Rare and up climb through the tiers below it first.
  const steps = fast || multi ? [final] : tell
  const stepGap = 0.42
  let at = 0.12
  steps.forEach((r, i) => {
    const hex = RARITIES[r].hex
    const last = i === steps.length - 1
    if (last && !fast && !multi && tier >= 5) {
      // Blackout before the top tiers: everything goes dark for a beat.
      tl.to(anim, { room: 0.03, glow: 0.1, beam: 0.06, bloom: 0, duration: 0.28, ease: 'power2.in', overwrite: 'auto' }, `burst+=${at}`)
      at += 0.9
      tl.to(anim, { room: 0.6, levitate: 1, duration: 1.3, ease: 'power2.out' }, `burst+=${at}`)
      if (!reducedMotion) {
        tl.to(anim, { aberration: tier >= 6 ? 1.6 : 1, duration: 0.06 }, `burst+=${at}`)
        tl.to(anim, { aberration: 0, duration: 0.6, ease: 'power2.out' }, `burst+=${at + 0.06}`)
      }
    }
    const when = `burst+=${at}`
    tl.call(
      () => {
        anim.beamColor.set(hex)
        onTell?.(r)
        anim.emit(last ? 70 + tier * 45 : 26 + i * 14, new Color(hex), last ? 1 + tier * 0.12 : 0.8)
        if (last && tier >= 4) anim.emit(60, '#fff2d6', 1.4)
      },
      [],
      when,
    )
    tweenColor(tl, anim.glowColor, hex, when, 0.2 * k)
    tl.to(anim, { glow: (1.2 + RARITIES[r].tier * 0.15) * (fast ? 0.8 : 1), beam: last ? (tier >= 2 ? 1 : 0.6) : 0.45 + i * 0.12, duration: 0.25 * k, ease: 'power2.out' }, when)
    tl.to(anim, { bloom: (last ? 0.5 + tier * 0.22 : 0.3 + i * 0.1) * (fast ? 0.55 : 1), duration: 0.12 }, when)
    tl.to(anim, { bloom: 0.15 + tier * 0.04, duration: fast ? 0.3 : 0.9, ease: 'power2.out' }, `${when}+=0.12`)
    tl.to(anim, { flare: last ? 1.2 : 0.6, duration: 0.1 }, when)
    tl.to(anim, { flare: 0, duration: last ? 1.1 : 0.4, ease: 'power2.out' }, `${when}+=0.1`)
    if (!last) at += stepGap
  })

  if (multi) {
    tl.call(() => onPhase('reveal'), [], `burst+=${at + 0.8}`)
    return tl
  }

  // The piece. Fast mode lands it lit at once; otherwise the camera meets it close at one
  // end, travels along it while the light comes up, then pulls back to the whole piece.
  const hold = fast ? 0.05 : 1.15
  tl.addLabel('rise', `burst+=${at + hold}`)
  tl.call(() => onPhase('rise'), [], 'rise')
  if (fast || reducedMotion) {
    tl.to(anim, { frame: 1, duration: 0.3, ease: 'power2.inOut' }, 'rise')
    tl.to(anim, { item: 1, duration: 0.32, ease: 'power2.out' }, 'rise')
    tl.to(anim, { itemLit: 1, beam: tier >= 2 ? 0.34 : 0.2, glow: 1.0, duration: 0.2 }, 'rise')
    tl.call(() => onPhase('reveal'), [], 'rise+=0.15')
    return tl
  }
  const pan = PAN_S[tier] ?? 2.6
  // The camera dives to the close shot first, so the piece is never seen whole on its way
  // up; it rises into the frame end first.
  tl.set(anim, { macro: 1, along: 0, itemLit: 0.08 }, 'rise')
  tl.to(anim, { frame: 1, duration: 0.6, ease: 'power2.inOut' }, 'rise')
  tl.to(anim, { item: 1, duration: 0.9, ease: 'power3.out' }, 'rise+=0.55')
  tl.to(anim, { beam: tier >= 2 ? 0.34 : 0.2, glow: 1.0, room: 1, duration: 1.4 }, 'rise+=0.3')
  // The travel: slow in, slow out. The light rakes along with the camera.
  const travel = 1.2
  tl.to(anim, { along: 1, duration: pan, ease: 'sine.inOut' }, `rise+=${travel}`)
  tl.to(anim, { itemLit: 1, duration: pan * 0.85, ease: 'power1.inOut' }, `rise+=${travel}`)
  tl.fromTo(anim, { glint: 1 }, { glint: 0, duration: pan, ease: 'sine.inOut' }, `rise+=${travel}`)
  tl.set(anim, { glint: -1 }, `rise+=${travel + pan}`)
  // Pull back to the whole piece.
  tl.to(anim, { macro: 0, duration: 1.2, ease: 'power3.inOut' }, `rise+=${travel + pan - 0.1}`)
  tl.call(() => onPhase('reveal'), [], `rise+=${travel + pan + 0.85}`)
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
  anim.beam = RARITIES[final].tier >= 2 ? 0.34 : 0.2
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
  anim.macro = 0
  anim.along = 0
  anim.glint = -1
}
