import { Color } from 'three'

/**
 * Mutable values tweened by GSAP and read every frame by the scene. Keeping these out of
 * React state means the timeline never triggers re-renders.
 */
export class ChestAnim {
  /** 0 closed, 1 fully open. */
  lid = 0
  /** Rattle amplitude while the seal is being broken. */
  rattle = 0
  /** Lock heat 0..1: dark iron to white-hot. */
  heat = 0
  /** 0 attached, 1 knocked off and gone. */
  lockOff = 0
  /** Interior and seam light. */
  glow = 0.35
  glowColor = new Color('#ffb35c')
  /** Loot beam strength. */
  beam = 0
  beamColor = new Color('#ffb35c')
  /** Ground shockwave progress 0..1 (0 = hidden). */
  ring = 0
  /** Item rise 0..1. */
  item = 0
  /** Item lighting: 0 silhouette, 1 fully lit. */
  itemLit = 0
  /** Glint sweep position, -1 hidden, 0..1 sweeping. */
  glint = -1
  /** Camera shake amplitude. */
  shake = 0
  /** Camera dolly, 0 base, 1 close. */
  dolly = 0
  /** Extra bloom for big moments. */
  bloom = 0
  /** Chromatic aberration pulse. */
  aberration = 0
  /** Spark emission requests, consumed by the particle system. */
  bursts: { count: number; color: Color; speed: number }[] = []
  /** Slow idle breathing on the landing page. */
  idle = 1
  /** Chest drop-in 0..1. */
  drop = 1
  /** Camera framing: 0 chest, 1 item reveal (frames the item to the left on wide screens). */
  frame = 0
  /** Final world-space center height and size of the revealed item, written by ItemRise. */
  focusY = 1.6
  focusH = 1.2
  focusW = 0.5
  /** Landing composition: chest and a displayed piece framed together. */
  hero = false

  emit(count: number, color: Color | string, speed = 1) {
    this.bursts.push({ count, color: color instanceof Color ? color.clone() : new Color(color), speed })
  }

  reset() {
    this.lid = 0
    this.rattle = 0
    this.heat = 0
    this.lockOff = 0
    this.glow = 0.35
    this.beam = 0
    this.ring = 0
    this.item = 0
    this.itemLit = 0
    this.glint = -1
    this.shake = 0
    this.dolly = 0
    this.bloom = 0
    this.aberration = 0
    this.bursts = []
    this.frame = 0
  }
}
