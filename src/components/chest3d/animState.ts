import { Color } from 'three'

/**
 * Mutable values tweened by GSAP and read every frame by the scene. Keeping these out of
 * React state means the timeline never triggers re-renders.
 */
export class ChestAnim {
  /** 0 closed, 1 fully open. */
  lid = 0
  /** The chest strains while the seal is being broken (the body shakes; the lid stays shut). */
  rattle = 0
  /** Lock heat 0..1: dark iron to white-hot. */
  heat = 0
  /** 0 attached, 1 knocked off and lying on the altar. */
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
  /** Rarity light on the piece: 0 plain warm light while it is studied, 1 once the rarity is named. */
  tint = 0
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
  /** Macro shot 0..1: camera close on a telling detail of the item, then pulls back. */
  macro = 0
  /** Where the macro looks, as a fraction of item height above its center (Inspect and still shots). */
  macroBias = 0.26
  /** The reveal's travel along the piece in the macro shot: 0 at one end, 1 at the other. */
  along = 0
  /**
   * Where the metal sits, so the close-up follows the piece and not its photo's box (written by
   * ItemRise, world units from the piece's centre): across the width in bands from top to bottom,
   * and up or down in bands from left to right.
   */
  profileX: number[] = []
  profileY: number[] = []
  /** True once the camera has arrived at the close-up (written by the camera rig). */
  closeReady = false
  /** True while the piece's photo is loaded and measured, so its framing is real (written by ItemRise). */
  itemReady = false
  /** True when the piece's photo could not load: the reveal skips its study (written by the scene). */
  itemFailed = false
  /** When the camera rig last ran (performance.now()); a stale value means no live scene. */
  rigTick = 0
  /** Set when a slow device has not reached the close-up in time: the rig jumps there once. */
  snap = false
  /** Phones: fraction of the screen height covered by the result sheet. */
  sheet = 0.5
  /** Wide screens: 1 while the result card sits on the right, 0 when it is tucked away. */
  cardSide = 1
  /** A flare in the hall's rarity fill and the chest's glow, for beats and the rarity's arrival. */
  flare = 0
  /** Room light 0..1: the sun through the windows, key, rim and environment. Dips to near dark for a blackout. */
  room = 1
  /** Camera crane: 1 starts high and far for the arrival, 0 is the normal framing. */
  crane = 0
  /** Slow orbit around the chest, in radians. */
  orbit = 0
  /** Light escaping as rays while the lid is still only a little open, 0..1. */
  gapLight = 0
  /** Camera at the rim line, 0..1: low enough that the open chest never shows its inside. */
  low = 0
  /** After the lid opens the camera tilts up into the light above the chest before it climbs, 0..1. */
  lookUp = 0
  /** World height of the chest's rim (written by the chest model). */
  rim = 0.42
  /** Photo pixels per world unit on the revealed piece (written by ItemRise); caps the close-up. */
  texDensity = 1000
  /** The chest lifts off the plinth for the top tiers, 0..1. */
  levitate = 0
  /** Inspect: zoom toward the piece 0..1, and where along its height the camera looks (-0.5..0.5). */
  zoom = 0
  panY = 0
  /** Reduced motion: no drift, shake, float, sparks or camera easing. Light still changes. */
  still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  emit(count: number, color: Color | string, speed = 1) {
    if (this.still) return
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
    this.tint = 0
    this.glint = -1
    this.shake = 0
    this.dolly = 0
    this.bloom = 0
    this.aberration = 0
    this.bursts = []
    this.frame = 0
    this.macro = 0
    this.along = 0
    this.flare = 0
    this.room = 1
    this.crane = 0
    this.orbit = 0
    this.gapLight = 0
    this.low = 0
    this.lookUp = 0
    this.levitate = 0
  }
}
