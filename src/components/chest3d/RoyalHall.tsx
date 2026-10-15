import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestAnim } from './animState'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FLEUR, TIE } from './fleur'
import { asset } from '../../lib/asset'

/**
 * The room around the altar: a royal hall in late afternoon, built in code. Tall lancet
 * windows in the left wall let the low sun in. Sheets of light with dust in them cross the
 * hall and land behind the altar, the columns throw long shadows across the floor, and
 * everything the sun does not reach stays in deep shadow. A crimson banner with a crown
 * embroidered in gold hangs in an arched niche on the back wall. The sun stays a neutral warm white: color in
 * this room belongs to rarity, which reaches the hall from the chest once it is named. The
 * whole room dims with the room light, so a blackout takes the sun away too.
 */

export const FLOOR_Y = -0.36
const WALL_X = 3.9
const WALL_T = 0.7
const WALL_H = 9
const COL_X = 2.15
const COL_Z = [-1.2, -4.0, -6.8]
const BACK_Z = -9.4
const FRONT_Z = 10
/** Lintels rest on the capitals. */
const LINTEL_Y = FLOOR_Y + 5.1 + 0.49 + 0.17
/** The runner leads from the back wall to the front edge of the altar, not past it. */
const RUNNER_END = 1.25
// Windows in the left wall: two lancets under a roundel, between the columns.
const WINDOW_Z = [-2.6, -5.4, -8.2]
const LANCET_W = 0.46
const MULLION = 0.16
const SILL_Y = 1.3
const SPRING_Y = 4.2
const APEX_Y = SPRING_Y + LANCET_W * Math.sin(Math.PI / 3)
const ROUNDEL = { y: APEX_Y + 0.3, r: 0.2 }
// The niche on the back wall.
const NICHE = { w: 2.3, sill: 0.15, spring: 3.3, depth: 0.6 }

/** Where the sun points: through the nearest window onto the altar, just behind the chest. */
const SUN_AIM = new THREE.Vector3(0, 0, -0.6)
const SUN_THROUGH = new THREE.Vector3(-WALL_X, (SILL_Y + APEX_Y) / 2, WINDOW_Z[0]!)
const SUN_DIR = SUN_AIM.clone().sub(SUN_THROUGH).normalize()
const SUN_POS = SUN_AIM.clone().addScaledVector(SUN_DIR, -28)
/** Late sun, about 4600 K. */
const SUN_COLOR = new THREE.Color('#ffd2a1')

const TEXTURES = {
  stoneDiff: asset('/textures/hall/stone_diff.webp'),
  stoneNor: asset('/textures/hall/stone_nor.webp'),
  stoneArm: asset('/textures/hall/stone_arm.webp'),
  floorDiff: asset('/textures/hall/floor_diff.webp'),
  floorNor: asset('/textures/hall/floor_nor.webp'),
  floorArm: asset('/textures/hall/floor_arm.webp'),
  velvetNor: asset('/textures/hall/velvet_nor.webp'),
}

/** Phones and small GPUs get a smaller shadow map and fewer motes. */
const LOW =
  typeof window !== 'undefined' && (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4)

function repeated(tex: THREE.Texture, x: number, y: number, color = false) {
  const t = tex.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(x, y)
  t.anisotropy = 8
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

// ---------------------------------------------------------------------------------------
// Cloth: the banner and the runner are painted on canvases, so nothing has to be downloaded.

/**
 * The banner is painted twice from one drawing: once in color, and once as a material mask
 * whose green channel is roughness and blue channel metalness, so the gold thread catches the
 * light like gilt embroidery while the silk around it stays matte.
 */
type Paint = 'color' | 'mask'
const MASK = {
  /** Gold thread and cord: metal, fairly smooth. */
  gold: 'rgb(0,95,255)',
  /** Stones and pearls: polished, not metal. */
  stone: 'rgb(0,40,0)',
  pearl: 'rgb(0,70,0)',
  /** Silk. */
  cloth: 'rgb(0,224,0)',
}

function placed(d: string, x: number, y: number, kx: number, ky: number) {
  const p = new Path2D()
  p.addPath(new Path2D(d), new DOMMatrix([kx, 0, 0, ky, x, y]))
  return p
}

/** Gold thread laid in parallel rows and clipped to a motif: a satin stitch at an angle. */
function stitch(g: CanvasRenderingContext2D, path: Path2D, angle: number, cx: number, cy: number, r: number) {
  g.save()
  g.clip(path)
  g.translate(cx, cy)
  g.rotate(angle)
  g.lineWidth = 1.1
  for (let i = -r, n = 0; i < r; i += 2.2, n++) {
    g.strokeStyle = n % 2 ? 'rgba(255,240,200,0.18)' : 'rgba(70,40,10,0.16)'
    g.beginPath()
    g.moveTo(-r, i)
    g.lineTo(r, i)
    g.stroke()
  }
  g.restore()
}

/** The couched gold cord that outlines each motif, over a dark line that lifts it off the silk. */
function cord(g: CanvasRenderingContext2D, path: Path2D, paint: Paint, width = 2.4) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  if (paint === 'mask') {
    g.strokeStyle = MASK.gold
    g.lineWidth = width
    g.stroke(path)
    return
  }
  g.strokeStyle = 'rgba(40,18,6,0.85)'
  g.lineWidth = width + 2.2
  g.stroke(path)
  g.strokeStyle = '#d7aa52'
  g.lineWidth = width
  g.stroke(path)
  g.strokeStyle = 'rgba(255,236,180,0.55)'
  g.lineWidth = width * 0.35
  g.stroke(path)
}

function pearl(g: CanvasRenderingContext2D, x: number, y: number, r: number, paint: Paint) {
  const p = new Path2D()
  p.arc(x, y, r, 0, Math.PI * 2)
  if (paint === 'mask') {
    g.fillStyle = MASK.pearl
    g.fill(p)
    return
  }
  const shine = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  shine.addColorStop(0, '#fffaf0')
  shine.addColorStop(0.55, '#e9dfc8')
  shine.addColorStop(1, '#9d8e74')
  g.fillStyle = shine
  g.fill(p)
  g.strokeStyle = 'rgba(40,18,6,0.8)'
  g.lineWidth = 1.6
  g.stroke(p)
}

/** A cabochon in a gold collet, with a highlight. */
function jewel(g: CanvasRenderingContext2D, path: Path2D, cx: number, cy: number, r: number, base: string, deep: string, paint: Paint) {
  if (paint === 'mask') {
    g.fillStyle = MASK.stone
    g.fill(path)
    g.strokeStyle = MASK.gold
    g.lineWidth = 1.8
    g.stroke(path)
    return
  }
  const fire = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1)
  fire.addColorStop(0, base)
  fire.addColorStop(1, deep)
  g.fillStyle = fire
  g.fill(path)
  g.strokeStyle = '#2c1406'
  g.lineWidth = 3.4
  g.stroke(path)
  g.strokeStyle = '#d9ab52'
  g.lineWidth = 1.8
  g.stroke(path)
  g.fillStyle = 'rgba(255,240,235,0.55)'
  g.beginPath()
  g.ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2)
  g.fill()
}

/**
 * The crown, embroidered in gold thread: a jeweled circlet with three fleurs-de-lis and a
 * pearled point between each. The side fleurs turn with the ring, so they read narrower.
 * No cross. Drawn in a 360 by 240 box.
 */
function drawCrown(g: CanvasRenderingContext2D, cx: number, top: number, width: number, paint: Paint) {
  const s = width / 360
  g.save()
  g.translate(cx - 180 * s, top)
  g.scale(s, s)
  const RIM = 168
  const band = new Path2D('M 40 168 Q 180 186 320 168 L 316 212 Q 180 232 44 212 Z')
  const fleurs = [
    { x: 180, y: RIM + 20, kx: 1.15, ky: 1.15 },
    { x: 70, y: RIM + 12, kx: 0.62, ky: 0.86 },
    { x: 290, y: RIM + 12, kx: 0.62, ky: 0.86 },
  ]
  const petals = fleurs.map((f) => placed(FLEUR, f.x, f.y, f.kx, f.ky))
  const ties = fleurs.map((f) => placed(TIE, f.x, f.y, f.kx, f.ky))
  const PX = [113, 247]
  const points = PX.map((x) => new Path2D(`M ${x - 8} ${RIM + 8} Q ${x - 3} ${RIM - 22} ${x} ${RIM - 40} Q ${x + 3} ${RIM - 22} ${x + 8} ${RIM + 8} Z`))
  if (paint === 'color') {
    // A soft shadow under the raised work.
    g.save()
    g.shadowColor = 'rgba(10,2,2,0.65)'
    g.shadowBlur = 10
    g.shadowOffsetY = 4
    g.fillStyle = '#7c5420'
    for (const p of [...points, ...petals, ...ties, band]) g.fill(p)
    g.restore()
  }
  // Each motif in turn, so a later one lies over the cords of an earlier one: gold, stitched
  // (the petals run upward, the ties and the band across), then outlined in cord.
  const work = (p: Path2D, angle: number, x: number, y: number, r: number) => {
    if (paint === 'mask') {
      g.fillStyle = MASK.gold
      g.fill(p)
    } else {
      const thread = g.createLinearGradient(0, 40, 0, 230)
      thread.addColorStop(0, '#fbe7a6')
      thread.addColorStop(0.35, '#e2b75c')
      thread.addColorStop(0.7, '#b9873a')
      thread.addColorStop(1, '#7c5420')
      g.fillStyle = thread
      g.fill(p)
      stitch(g, p, angle, x, y, r)
    }
    cord(g, p, paint)
  }
  points.forEach((p, i) => work(p, -1.45, PX[i]!, RIM - 20, 60))
  petals.forEach((p, i) => work(p, -1.35, fleurs[i]!.x, fleurs[i]!.y - 60, 100))
  ties.forEach((p, i) => work(p, 0.05, fleurs[i]!.x, fleurs[i]!.y - 30, 40))
  work(band, 0.08, 180, 195, 170)
  PX.forEach((x) => pearl(g, x, RIM - 46, 8, paint))
  // The band's stones: a garnet at the front, sapphires either side, pearls between.
  const garnet = new Path2D()
  garnet.ellipse(180, 194, 17, 12, 0, 0, Math.PI * 2)
  jewel(g, garnet, 180, 194, 16, '#d0283a', '#4a0510', paint)
  for (const x of [112, 248]) jewel(g, new Path2D(`M ${x} 181 L ${x + 11} 193 L ${x} 205 L ${x - 11} 193 Z`), x, 193, 11, '#3d5fbf', '#0c1640', paint)
  for (const x of [66, 146, 214, 294]) pearl(g, x, 192, 5.5, paint)
  // Beads along both edges of the band, following its curve.
  g.fillStyle = paint === 'mask' ? MASK.gold : '#f3dfa8'
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    const bow = (1 - (2 * t - 1) ** 2) * 0.62
    for (const y of [172 + 18 * bow, 207 + 20 * bow]) {
      g.beginPath()
      g.arc(46 + t * 268, y, 1.7, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.restore()
}

/** The crimson banner in the niche: silk damask, a gold border, a swallowtail hem, the crown. */
function paintBanner(g: CanvasRenderingContext2D, W: number, H: number, paint: Paint) {
  const NOTCH = 150
  const outline = new Path2D()
  outline.moveTo(0, 0)
  outline.lineTo(W, 0)
  outline.lineTo(W, H)
  outline.lineTo(W / 2, H - NOTCH)
  outline.lineTo(0, H)
  outline.closePath()
  g.save()
  g.clip(outline)
  if (paint === 'mask') {
    g.fillStyle = MASK.cloth
    g.fillRect(0, 0, W, H)
  } else {
    const silk = g.createLinearGradient(0, 0, W, 0)
    silk.addColorStop(0, '#3a0509')
    silk.addColorStop(0.5, '#6c0d14')
    silk.addColorStop(1, '#3a0509')
    g.fillStyle = silk
    g.fillRect(0, 0, W, H)
    // Damask: a quiet diaper of lozenges with a dot in each, woven tone on tone.
    g.strokeStyle = 'rgba(255,170,150,0.07)'
    g.fillStyle = 'rgba(255,170,150,0.08)'
    g.lineWidth = 2
    for (let y = 60, row = 0; y < H; y += 56, row++) {
      for (let x = row % 2 ? 0 : 28; x < W + 28; x += 56) {
        g.beginPath()
        g.moveTo(x, y - 22)
        g.lineTo(x + 22, y)
        g.lineTo(x, y + 22)
        g.lineTo(x - 22, y)
        g.closePath()
        g.stroke()
        g.beginPath()
        g.arc(x, y, 3, 0, Math.PI * 2)
        g.fill()
      }
    }
    // The sleeve around the rod.
    g.fillStyle = 'rgba(20,2,4,0.45)'
    g.fillRect(0, 0, W, 46)
  }
  // Gold border, following the hem.
  const inset = (d: number) => {
    const p = new Path2D()
    p.moveTo(d, 46 + d * 0.5)
    p.lineTo(W - d, 46 + d * 0.5)
    p.lineTo(W - d, H - d * 1.6)
    p.lineTo(W / 2, H - NOTCH - d * 0.9)
    p.lineTo(d, H - d * 1.6)
    p.closePath()
    return p
  }
  g.strokeStyle = paint === 'mask' ? MASK.gold : '#c9963f'
  g.lineWidth = 7
  g.stroke(inset(30))
  g.lineWidth = 2
  g.strokeStyle = paint === 'mask' ? MASK.gold : '#a7782f'
  g.stroke(inset(46))
  g.fillStyle = paint === 'mask' ? MASK.gold : '#c9963f'
  g.fillRect(0, 44, W, 4)
  drawCrown(g, W / 2, 250, 400, paint)
  // A rule under the crown with a small lozenge at its middle.
  g.fillStyle = paint === 'mask' ? MASK.gold : '#c9963f'
  g.fillRect(W / 2 - 96, 520, 192, 3)
  g.beginPath()
  g.moveTo(W / 2, 508)
  g.lineTo(W / 2 + 12, 521)
  g.lineTo(W / 2, 534)
  g.lineTo(W / 2 - 12, 521)
  g.closePath()
  g.fill()
  g.restore()
}

function bannerTextures() {
  const W = 512
  const H = 1408
  const make = (paint: Paint) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    paintBanner(c.getContext('2d')!, W, H, paint)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = paint === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace
    tex.anisotropy = 8
    return tex
  }
  return { map: make('color'), mask: make('mask') }
}

/** The runner: crimson wool with a gold border and a quiet lozenge pattern. */
function carpetTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#3d0a0f'
  g.fillRect(0, 0, 256, 512)
  g.strokeStyle = 'rgba(30,2,4,0.15)'
  g.lineWidth = 2
  for (let y = -128; y < 640; y += 128) {
    g.beginPath()
    g.moveTo(128, y)
    g.lineTo(200, y + 64)
    g.lineTo(128, y + 128)
    g.lineTo(56, y + 64)
    g.closePath()
    g.stroke()
  }
  g.fillStyle = '#9c7329'
  g.fillRect(14, 0, 10, 512)
  g.fillRect(232, 0, 10, 512)
  g.fillStyle = '#2c0406'
  g.fillRect(0, 0, 9, 512)
  g.fillRect(247, 0, 9, 512)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/** The sky seen through the windows: brightest low down, where the sun is. */
function skyTexture() {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#f2dcb4')
  grad.addColorStop(0.6, '#ffe7bf')
  grad.addColorStop(1, '#fff3da')
  g.fillStyle = grad
  g.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ---------------------------------------------------------------------------------------
// Stone.

/** A pointed lancet opening, as a hole in wall coordinates (u along the hall, v up). */
function lancet(u0: number, w: number) {
  const u1 = u0 + w
  const p = new THREE.Path()
  p.moveTo(u0, SILL_Y)
  p.lineTo(u1, SILL_Y)
  p.lineTo(u1, SPRING_Y)
  p.absarc(u0, SPRING_Y, w, 0, Math.PI / 3, false)
  p.absarc(u1, SPRING_Y, w, (2 * Math.PI) / 3, Math.PI, false)
  p.lineTo(u0, SILL_Y)
  return p
}

/** The left wall, pierced by the windows. It casts the shadow that shapes the sunlight. */
function windowWallGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(BACK_Z, FLOOR_Y)
  shape.lineTo(FRONT_Z, FLOOR_Y)
  shape.lineTo(FRONT_Z, FLOOR_Y + WALL_H)
  shape.lineTo(BACK_Z, FLOOR_Y + WALL_H)
  shape.closePath()
  for (const z of WINDOW_Z) {
    shape.holes.push(lancet(z - MULLION / 2 - LANCET_W, LANCET_W))
    shape.holes.push(lancet(z + MULLION / 2, LANCET_W))
    const roundel = new THREE.Path()
    roundel.absarc(z, ROUNDEL.y, ROUNDEL.r, 0, Math.PI * 2, false)
    shape.holes.push(roundel)
  }
  return new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 10 })
}

/** The back wall with the arched niche cut into it. */
function nicheWallGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-WALL_X - 0.5, FLOOR_Y)
  shape.lineTo(WALL_X + 0.5, FLOOR_Y)
  shape.lineTo(WALL_X + 0.5, FLOOR_Y + WALL_H)
  shape.lineTo(-WALL_X - 0.5, FLOOR_Y + WALL_H)
  shape.closePath()
  const w = NICHE.w
  const hole = new THREE.Path()
  hole.moveTo(-w / 2, NICHE.sill)
  hole.lineTo(w / 2, NICHE.sill)
  hole.lineTo(w / 2, NICHE.spring)
  hole.absarc(-w / 2, NICHE.spring, w, 0, Math.PI / 3, false)
  hole.absarc(w / 2, NICHE.spring, w, (2 * Math.PI) / 3, Math.PI, false)
  hole.lineTo(-w / 2, NICHE.sill)
  shape.holes.push(hole)
  return new THREE.ExtrudeGeometry(shape, { depth: NICHE.depth, bevelEnabled: false, curveSegments: 16 })
}

/**
 * Column parts with crisp mouldings, so they read as dressed stone rather than worn rock: a
 * square plinth under a round torus for the base, a bell under a square abacus for the capital.
 */
function columnParts() {
  const at = (g: THREE.BufferGeometry, y: number) => g.translate(0, y, 0)
  const ring = (r: number, tube: number, y: number) => at(new THREE.TorusGeometry(r, tube, 10, 40).rotateX(Math.PI / 2), y)
  const base = mergeGeometries([
    at(new THREE.BoxGeometry(0.98, 0.24, 0.98), 0.12),
    at(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 40), 0.27),
    ring(0.37, 0.065, 0.36),
    at(new THREE.CylinderGeometry(0.31, 0.33, 0.08, 40), 0.46),
  ])
  const capital = mergeGeometries([
    ring(0.31, 0.035, 0.03),
    at(new THREE.CylinderGeometry(0.46, 0.31, 0.3, 40, 1, true), 0.2),
    at(new THREE.BoxGeometry(1.0, 0.14, 1.0), 0.42),
  ])
  if (!base || !capital) throw new Error('RoyalHall: column parts did not merge')
  return { base, capital, shaft: new THREE.CylinderGeometry(0.3, 0.3, 4.6, 40, 1, true) }
}

// ---------------------------------------------------------------------------------------
// Light.

/** One beam of sunlight per lancet: from the middle of the opening to where it lands. */
interface Beam {
  from: THREE.Vector3
  to: THREE.Vector3
}
function beams(): Beam[] {
  const y = SILL_Y + 0.55 * (APEX_Y - SILL_Y)
  return WINDOW_Z.flatMap((z) =>
    [z - MULLION / 2 - LANCET_W / 2, z + MULLION / 2 + LANCET_W / 2].map((lz) => {
      const from = new THREE.Vector3(-WALL_X, y, lz)
      // Each beam leaves from the sun's own position, so it lands on its light pool.
      const dir = from.clone().sub(SUN_POS).normalize()
      const down = -dir.y
      // A beam ends on the floor, or on the altar top if it lands within the altar.
      let len = (y - FLOOR_Y) / down
      const onAltar = y / down
      const hx = -WALL_X + dir.x * onAltar
      const hz = lz + dir.z * onAltar
      if (hx * hx + hz * hz < 1) len = onAltar
      return { from, to: from.clone().addScaledVector(dir, len) }
    }),
  )
}
const BEAM_W = 0.62
const BEAMS = beams()

const SHAFT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float a = clamp(vUv.x, 0.0, 1.0);
  float t = clamp(vUv.y, 0.0, 1.0);
  float across = smoothstep(0.0, 0.25, a) * smoothstep(1.0, 0.75, a);
  float along = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t) * (1.0 - 0.4 * t);
  // The far shafts sink into the hall's haze like everything else.
  vec3 d = vWorld - cameraPosition;
  float haze = exp(-0.0028 * dot(d, d));
  float alpha = clamp(across * along * haze * uA, 0.0, 1.0);
  gl_FragColor = vec4(uColor, alpha);
}`

const MOTE_VERT = /* glsl */ `
attribute float aSeed;
attribute float aGlow;
uniform float uTime;
uniform float uPx;
varying float vGlow;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.21 + aSeed * 31.0) * 0.05;
  p.y += sin(uTime * 0.17 + aSeed * 17.0) * 0.06;
  p.z += cos(uTime * 0.19 + aSeed * 23.0) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float z = -mv.z;
  if (z < 0.3) {
    gl_PointSize = 0.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vGlow = 0.0;
    return;
  }
  vGlow = aGlow * smoothstep(0.3, 1.2, z);
  gl_PointSize = min((1.6 + aSeed * 2.2) * uPx * (2.4 / z), 14.0);
  gl_Position = projectionMatrix * mv;
}`

const MOTE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
varying float vGlow;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vGlow * uA;
  if (a <= 0.001) discard;
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
}`

/** Dust hanging in the sunlight, placed inside the beams. */
function moteGeometry(list: Beam[], count: number) {
  const pos: number[] = []
  const seed: number[] = []
  const glow: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const b = list[i % list.length]!
    const t = 0.1 + Math.random() * 0.8
    const r = (Math.random() - 0.5) * BEAM_W * 0.7
    const lift = (Math.random() - 0.5) * BEAM_W * 0.7
    p.copy(b.from).lerp(b.to, t)
    pos.push(p.x + r * 0.3, p.y + lift, p.z + r)
    seed.push(Math.random())
    glow.push(Math.sin(Math.PI * t) * (1 - 0.4 * t) * (1 - Math.abs(r) / BEAM_W))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1))
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glow, 1))
  return g
}

export function RoyalHall({ anim }: { anim: ChestAnim }) {
  const tex = useTexture(TEXTURES)

  const materials = useMemo(() => {
    const stone = (rx: number, ry: number, color: string, relief = 0.35) =>
      new THREE.MeshStandardMaterial({
        map: repeated(tex.stoneDiff, rx, ry, true),
        normalMap: repeated(tex.stoneNor, rx, ry),
        normalScale: new THREE.Vector2(relief, relief),
        roughnessMap: repeated(tex.stoneArm, rx, ry),
        aoMap: repeated(tex.stoneArm, rx, ry),
        aoMapIntensity: 0.8,
        roughness: 0.95,
        metalness: 0,
        color,
        envMapIntensity: 0.12,
      })
    const floorRepeat: [number, number] = [(2 * WALL_X) / 3.6, (FRONT_Z - BACK_Z) / 3.6]
    const floor = new THREE.MeshStandardMaterial({
      map: repeated(tex.floorDiff, ...floorRepeat, true),
      normalMap: repeated(tex.floorNor, ...floorRepeat),
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: repeated(tex.floorArm, ...floorRepeat),
      aoMap: repeated(tex.floorArm, ...floorRepeat),
      roughness: 0.62,
      metalness: 0,
      color: '#7d7670',
      envMapIntensity: 0.3,
    })
    const carpet = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = carpetTexture()
        t.repeat.set(1, (RUNNER_END - BACK_Z) / 1.6)
        return t
      })(),
      normalMap: repeated(tex.velvetNor, 1.5, 10),
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    // Silk with gold thread: the mask makes the embroidery metal and the silk matte.
    const cloth = bannerTextures()
    const banner = new THREE.MeshStandardMaterial({
      map: cloth.map,
      roughnessMap: cloth.mask,
      metalnessMap: cloth.mask,
      normalMap: repeated(tex.velvetNor, 2, 5),
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 1,
      metalness: 1,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    })
    const brass = new THREE.MeshStandardMaterial({ color: '#b98a42', metalness: 1, roughness: 0.38, envMapIntensity: 0.6 })
    const sky = new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: false, fog: false })
    return {
      wall: stone(1 / 2.6, 1 / 2.6, '#a39385'),
      sideWall: stone((FRONT_Z - BACK_Z) / 2.6, WALL_H / 2.6, '#a39385'),
      backWall: stone(1 / 2.6, 1 / 2.6, '#8f8174'),
      nicheBack: stone((NICHE.w + 0.4) / 2.6, 4.4 / 2.6, '#6e6359'),
      column: stone((2 * Math.PI * 0.3) / 2.6, 4.6 / 2.6, '#a79787'),
      columnTrim: stone(0.6, 0.6, '#9a8b7d', 0.2),
      lintel: stone(1.5, 0.3, '#8f8174', 0.25),
      floor,
      carpet,
      banner,
      brass,
      sky,
    }
  }, [tex])

  const geometry = useMemo(() => {
    const parts = columnParts()
    const bannerGeo = (w: number, h: number) => {
      const g = new THREE.PlaneGeometry(w, h, 32, 8)
      const p = g.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const y = p.getY(i)
        // Soft vertical folds, deeper toward the hem.
        p.setZ(i, Math.sin((x / w) * Math.PI * 6) * 0.03 * (0.5 + 0.5 * (0.5 - y / h)))
      }
      g.translate(0, -h / 2, 0)
      g.computeVertexNormals()
      return g
    }
    return {
      windowWall: windowWallGeometry(),
      nicheWall: nicheWallGeometry(),
      beam: new THREE.PlaneGeometry(1, 1, 1, 12),
      motes: moteGeometry(BEAMS, LOW ? 48 : 96),
      banner: bannerGeo(1.2, 3.3),
      ...parts,
    }
  }, [])

  const shaftMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: SUN_COLOR.clone() }, uA: { value: 0.06 } },
        vertexShader: SHAFT_VERT,
        fragmentShader: SHAFT_FRAG,
      }),
    [],
  )
  const moteMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color('#fff0d6') }, uA: { value: 0.8 }, uTime: { value: 0 }, uPx: { value: 1 } },
        vertexShader: MOTE_VERT,
        fragmentShader: MOTE_FRAG,
      }),
    [],
  )

  // The columns: one instanced draw for the shafts, the bases and the capitals.
  const columns = useMemo(() => {
    const count = COL_Z.length * 2
    const shafts = new THREE.InstancedMesh(geometry.shaft, materials.column, count)
    const bases = new THREE.InstancedMesh(geometry.base, materials.columnTrim, count)
    const caps = new THREE.InstancedMesh(geometry.capital, materials.columnTrim, count)
    const m = new THREE.Matrix4()
    let i = 0
    for (const z of COL_Z) {
      for (const x of [-COL_X, COL_X]) {
        bases.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y, z))
        shafts.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y + 0.5 + 2.3, z))
        caps.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y + 5.1, z))
        i++
      }
    }
    for (const mesh of [shafts, bases, caps]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.computeBoundingSphere()
    }
    return { shafts, bases, caps }
  }, [geometry, materials])

  // The sun: far outside the left wall, so its light comes in nearly parallel. The wall's
  // shadow shapes it into the windows; the columns and the chest cast their own.
  const sun = useMemo(() => {
    const l = new THREE.SpotLight(SUN_COLOR, 7, 0, 0.32, 0.3, 0)
    l.position.copy(SUN_POS)
    l.target.position.copy(SUN_AIM).add(new THREE.Vector3(0, 0, -1.6))
    l.castShadow = true
    l.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048)
    l.shadow.camera.near = 14
    l.shadow.camera.far = 46
    l.shadow.bias = -0.0004
    l.shadow.normalBias = 0.03
    l.shadow.radius = 3
    return l
  }, [])
  const fill = useRef<THREE.PointLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const nicheLight = useRef<THREE.SpotLight>(null)
  const nicheTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, 1.6, BACK_Z - NICHE.depth)
    return o
  }, [])
  const bannerRef = useRef<THREE.Group>(null)
  const beamRefs = useRef<(THREE.Mesh | null)[]>([])
  const skyBase = useMemo(() => new THREE.Color(1.45, 1.38, 1.25), [])
  const { axis, center, view, side, normal, basis } = useMemo(
    () => ({ axis: new THREE.Vector3(), center: new THREE.Vector3(), view: new THREE.Vector3(), side: new THREE.Vector3(), normal: new THREE.Vector3(), basis: new THREE.Matrix4() }),
    [],
  )

  useEffect(() => {
    if (nicheLight.current) nicheLight.current.target = nicheTarget
  }, [nicheTarget])

  // Each opening builds the hall in a fresh WebGL context. Decoding its stone and compiling its
  // materials in one go stalled the first frames for most of a second, so the hall waits out of
  // sight while the images decode off the main thread, the textures upload and the materials
  // compile in parallel; then its light comes up. Its lights are in the scene from the first
  // frame, so nothing else has to compile twice.
  const { gl, camera, scene } = useThree()
  const body = useRef<THREE.Group>(null)
  const fade = useRef(0)
  const ready = useRef(false)
  useEffect(() => {
    const g = body.current
    if (!g) return
    let alive = true
    g.visible = false
    const textures = new Set<THREE.Texture>()
    Object.values(materials).forEach((m) => {
      const mat = m as THREE.MeshStandardMaterial
      for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.aoMap]) if (t) textures.add(t)
    })
    const decode = [...textures].map((t) => {
      const img = t.image as HTMLImageElement | undefined
      return img && typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve()
    })
    Promise.all(decode)
      .then(() => {
        if (!alive) return
        textures.forEach((t) => gl.initTexture(t))
        return gl.compileAsync(g, camera, scene)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return
        g.visible = true
        ready.current = true
      })
    return () => {
      alive = false
    }
  }, [gl, camera, scene, materials])

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial
        mat.map?.dispose()
        mat.normalMap?.dispose()
        mat.roughnessMap?.dispose()
        mat.aoMap?.dispose()
        mat.dispose()
      })
      shaftMat.dispose()
      moteMat.dispose()
      Object.values(geometry).forEach((g) => (Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose()))
      sun.dispose()
    },
    [materials, geometry, shaftMat, moteMat, sun],
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (ready.current && fade.current < 1) fade.current = anim.still ? 1 : Math.min(1, fade.current + dt / 0.8)
    const room = anim.room * fade.current
    // The rarity's light pushes the sun back a little when it floods the hall.
    const sunK = room * (1 - Math.min(anim.beam, 1) * 0.25 * anim.tint)
    sun.intensity = 7 * sunK
    shaftMat.uniforms.uA!.value = 0.06 * sunK
    moteMat.uniforms.uA!.value = 0.8 * sunK
    moteMat.uniforms.uTime!.value = anim.still ? 0 : t
    moteMat.uniforms.uPx!.value = state.viewport.dpr * 1.4
    materials.sky.color.copy(skyBase).multiplyScalar(0.12 + 0.88 * room)
    if (hemi.current) hemi.current.intensity = 0.1 * room
    if (nicheLight.current) nicheLight.current.intensity = 26 * room
    // The chest's light reaches the hall; once the rarity is named it carries its color.
    if (fill.current) {
      fill.current.color.copy(anim.glowColor)
      fill.current.intensity = (Math.min(anim.beam, 1) * 9 + anim.flare * 3 + Math.min(anim.glow, 2) * 0.6) * (0.3 + 0.7 * anim.tint) * (0.25 + 0.75 * room)
    }
    // Each beam turns about its own axis to face the camera, so it always reads as a volume.
    BEAMS.forEach((b, i) => {
      const mesh = beamRefs.current[i]
      if (!mesh) return
      axis.copy(b.to).sub(b.from)
      const len = axis.length()
      axis.divideScalar(len)
      center.copy(b.from).add(b.to).multiplyScalar(0.5)
      view.copy(state.camera.position).sub(center)
      side.crossVectors(axis, view)
      if (side.lengthSq() < 1e-8) return
      side.normalize()
      normal.crossVectors(side, axis)
      basis.makeBasis(side, axis, normal)
      mesh.position.copy(center)
      mesh.quaternion.setFromRotationMatrix(basis)
      mesh.scale.set(BEAM_W, len, 1)
    })
    // The banner stirs in a draft.
    if (bannerRef.current) bannerRef.current.rotation.x = anim.still ? 0 : Math.sin(t * 0.45) * 0.012
  })

  const depth = FRONT_Z - BACK_Z
  return (
    <group>
      <primitive object={sun} />
      <primitive object={sun.target} />
      <primitive object={nicheTarget} />
      <hemisphereLight ref={hemi} args={['#c3cde0', '#2a2018', 0.1]} />
      <pointLight ref={fill} position={[0, 1.2, 0.3]} distance={11} decay={1.5} intensity={0} />
      <spotLight ref={nicheLight} position={[0, 4.4, BACK_Z + 3.2]} angle={0.5} penumbra={0.8} distance={9} decay={2} color="#ffdcb0" intensity={26} />
      <group ref={body}>

      {/* Floor and the runner to the altar. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, (FRONT_Z + BACK_Z) / 2]} material={materials.floor} receiveShadow>
        <planeGeometry args={[2 * WALL_X, depth]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.003, (RUNNER_END + BACK_Z) / 2]} material={materials.carpet} receiveShadow>
        <planeGeometry args={[1.4, RUNNER_END - BACK_Z]} />
      </mesh>

      {/* The left wall with its windows, and the sky beyond them. */}
      <mesh geometry={geometry.windowWall} material={materials.wall} position={[-WALL_X, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow />
      <mesh position={[-WALL_X - WALL_T - 0.6, (SILL_Y + ROUNDEL.y) / 2, (WINDOW_Z[0]! + WINDOW_Z[WINDOW_Z.length - 1]!) / 2]} rotation={[0, Math.PI / 2, 0]} material={materials.sky}>
        <planeGeometry args={[WINDOW_Z[0]! - WINDOW_Z[WINDOW_Z.length - 1]! + 3, ROUNDEL.y - SILL_Y + 1.6]} />
      </mesh>

      {/* The right wall and the back wall with its niche. */}
      <mesh position={[WALL_X, FLOOR_Y + WALL_H / 2, (FRONT_Z + BACK_Z) / 2]} rotation={[0, -Math.PI / 2, 0]} material={materials.sideWall} receiveShadow>
        <planeGeometry args={[depth, WALL_H]} />
      </mesh>
      <mesh geometry={geometry.nicheWall} material={materials.backWall} position={[0, 0, BACK_Z - NICHE.depth]} receiveShadow />
      <mesh position={[0, FLOOR_Y + 2.2, BACK_Z - NICHE.depth + 0.002]} material={materials.nicheBack} receiveShadow>
        <planeGeometry args={[NICHE.w + 0.4, 4.4]} />
      </mesh>

      <primitive object={columns.shafts} />
      <primitive object={columns.bases} />
      <primitive object={columns.caps} />
      {/* Lintels: the columns carry a beam along each side and one across the hall at each pair. */}
      {[-COL_X, COL_X].map((x) => (
        <mesh key={x} position={[x, LINTEL_Y, (COL_Z[0]! + COL_Z[COL_Z.length - 1]!) / 2]} material={materials.lintel} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.34, COL_Z[0]! - COL_Z[COL_Z.length - 1]! + 1.0]} />
        </mesh>
      ))}
      {COL_Z.map((z) => (
        <mesh key={z} position={[0, LINTEL_Y, z]} material={materials.lintel} castShadow receiveShadow>
          <boxGeometry args={[2 * COL_X + 0.92, 0.34, 0.8]} />
        </mesh>
      ))}

      {/* The banner in the niche. The two that hung either side of it are gone: from the
          reveal's camera the columns stood in front of them, so only the ends of their rods
          showed, as if stuck in the wall (the founder, fourth review). */}
      <group position={[0, 3.55, BACK_Z - NICHE.depth + 0.12]}>
        <group ref={bannerRef}>
          <mesh geometry={geometry.banner} material={materials.banner} receiveShadow />
        </group>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0.02]} material={materials.brass}>
          <cylinderGeometry args={[0.022, 0.022, 1.2 + 0.24, 12]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (1.2 / 2 + 0.14), 0.03, 0.02]} material={materials.brass}>
            <sphereGeometry args={[0.04, 14, 10]} />
          </mesh>
        ))}
      </group>

      {/* Sunlight in the air, and the dust that shows it. */}
      {BEAMS.map((_, i) => (
        <mesh key={i} ref={(m) => void (beamRefs.current[i] = m)} geometry={geometry.beam} material={shaftMat} renderOrder={4} frustumCulled={false} />
      ))}
      <points geometry={geometry.motes} material={moteMat} frustumCulled={false} renderOrder={5} />
      </group>
    </group>
  )
}

useTexture.preload(Object.values(TEXTURES))
