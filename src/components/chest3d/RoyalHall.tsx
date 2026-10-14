import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

/**
 * The room around the altar: a royal hall at night, built in code so nothing is downloaded.
 * Stone columns with torches recede into the dark on both sides, a crimson runner leads to
 * the altar, banners hang in an arched niche on the back wall under a rose window, and the
 * polished floor holds soft reflections of every flame. All of it is lit by the torches and
 * dims with the room light, so a blackout takes the hall away with everything else. Once the
 * rarity is named, its light floods the hall from the chest.
 */

const FLOOR_Y = -0.36
const COL_X = 2.3
const COL_Z = [-1.7, -4.4, -7.1]
const WALL_Z = -9.4
const SIDE_X = 4.4
const ARCH_W = 1.35
const ARCH_SPRING = 3.2
// High on the back wall: in view when the camera looks up at a piece, never behind the controls.
const ROSE: [number, number, number] = [0, 7.1, WALL_Z + 0.04]

/** Torch flames, front to back: on the inner face of each column, then two on the back wall. */
export const TORCHES: [number, number, number][] = [
  ...COL_Z.flatMap((z) => [
    [-COL_X + 0.38, 1.25, z] as [number, number, number],
    [COL_X - 0.38, 1.25, z] as [number, number, number],
  ]),
  [-ARCH_W - 0.75, 1.7, WALL_Z + 0.14],
  [ARCH_W + 0.75, 1.7, WALL_Z + 0.14],
]
const N = TORCHES.length

/** Seeded noise so the stone looks the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, rng(seed))
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Fine speckle over a drawn surface, for the grain of the stone. */
function speckle(g: CanvasRenderingContext2D, r: () => number, w: number, h: number, amount: number) {
  const img = g.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n))
  }
  g.putImageData(img, 0, 0)
}

/** Soft large-scale mottling, drawn from a small noise canvas scaled up. */
function mottle(g: CanvasRenderingContext2D, r: () => number, w: number, h: number, alpha: number) {
  const n = document.createElement('canvas')
  n.width = 32
  n.height = 32
  const ng = n.getContext('2d')!
  const img = ng.createImageData(32, 32)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + r() * 165
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ng.putImageData(img, 0, 0)
  g.save()
  g.globalAlpha = alpha
  g.globalCompositeOperation = 'multiply'
  g.imageSmoothingEnabled = true
  g.drawImage(n, 0, 0, w, h)
  g.restore()
}

let cache: { masonry: THREE.Texture; drum: THREE.Texture; flags: THREE.Texture; carpet: THREE.Texture } | null = null
function hallTextures() {
  if (cache) return cache
  // Ashlar: sixteen courses of dressed blocks with thin joints and quiet tone changes.
  const masonry = canvasTexture(
    1024,
    1024,
    (g, r) => {
      g.fillStyle = '#4a433c'
      g.fillRect(0, 0, 1024, 1024)
      const rowH = 64
      for (let row = 0; row < 16; row++) {
        const off = row % 2 ? 64 : 0
        for (let x = -off; x < 1024; x += 128) {
          const v = 138 + r() * 30
          g.fillStyle = `rgb(${v * 1.02},${v * 0.99},${v * 0.95})`
          g.fillRect(x + 1.5, row * rowH + 1.5, 125, rowH - 3)
          g.fillStyle = `rgba(${r() > 0.5 ? '255,245,230' : '25,20,16'},${0.04 + r() * 0.06})`
          g.beginPath()
          g.ellipse(x + 16 + r() * 96, row * rowH + 10 + r() * 44, 14 + r() * 26, 6 + r() * 12, 0, 0, Math.PI * 2)
          g.fill()
        }
      }
      mottle(g, r, 1024, 1024, 0.35)
      speckle(g, r, 1024, 1024, 26)
    },
    7,
  )
  // Column drums: smooth dressed stone, one joint per drum, faint weathering streaks.
  const drum = canvasTexture(
    256,
    512,
    (g, r) => {
      g.fillStyle = '#968c82'
      g.fillRect(0, 0, 256, 512)
      for (let k = 0; k < 40; k++) {
        g.fillStyle = `rgba(30,24,20,${0.03 + r() * 0.05})`
        g.fillRect(r() * 256, r() * 512, 1 + r() * 3, 40 + r() * 200)
      }
      mottle(g, r, 256, 512, 0.3)
      g.fillStyle = 'rgba(40,34,30,0.85)'
      g.fillRect(0, 0, 256, 3)
      speckle(g, r, 256, 512, 22)
    },
    9,
  )
  // Flagstones: large squares with fine grout, each a slightly different stone.
  const flags = canvasTexture(
    512,
    512,
    (g, r) => {
      g.fillStyle = '#1a1512'
      g.fillRect(0, 0, 512, 512)
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          const v = 78 + r() * 30
          g.fillStyle = `rgb(${v * 1.02},${v * 0.97},${v * 0.92})`
          g.fillRect(x * 256 + 2, y * 256 + 2, 252, 252)
        }
      }
      mottle(g, r, 512, 512, 0.35)
      speckle(g, r, 512, 512, 18)
    },
    11,
  )
  // The runner: crimson wool with a gold border and a quiet lozenge pattern.
  const carpet = canvasTexture(
    128,
    256,
    (g, r) => {
      g.fillStyle = '#6a1013'
      g.fillRect(0, 0, 128, 256)
      g.strokeStyle = 'rgba(40,4,6,0.5)'
      g.lineWidth = 3
      for (let y = -64; y < 320; y += 64) {
        g.beginPath()
        g.moveTo(64, y)
        g.lineTo(104, y + 32)
        g.lineTo(64, y + 64)
        g.lineTo(24, y + 32)
        g.closePath()
        g.stroke()
      }
      g.fillStyle = '#a77d2c'
      g.fillRect(6, 0, 6, 256)
      g.fillRect(116, 0, 6, 256)
      g.fillStyle = '#3a0608'
      g.fillRect(0, 0, 5, 256)
      g.fillRect(123, 0, 5, 256)
      speckle(g, r, 128, 256, 24)
    },
    5,
  )
  cache = { masonry, drum, flags, carpet }
  return cache
}

/** Shared lighting: torches, moonlight from the rose window, and the chest's light once named. */
const LIGHT = /* glsl */ `
#define TORCHES ${N}
uniform vec3 uTorch[TORCHES];
uniform float uAmp[TORCHES];
uniform vec3 uTorchColor;
uniform float uRoom;
uniform vec3 uFillColor;
uniform float uFill;
uniform vec3 uMoonColor;
uniform float uMoon;
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 hallLight(vec3 pos, vec3 n) {
  // Faint bounce: cool from the vault above, warm from the floor, so the stone never goes flat black.
  vec3 light = mix(vec3(0.026, 0.02, 0.016), vec3(0.024, 0.028, 0.038), n.y * 0.5 + 0.5) * uRoom;
  for (int i = 0; i < TORCHES; i++) {
    vec3 d = uTorch[i] - pos;
    float d2 = max(dot(d, d), 0.0004);
    float ndl = max(dot(n, d * inversesqrt(d2)), 0.0) * 0.85 + 0.15;
    light += uTorchColor * (uAmp[i] * ndl / (1.0 + d2 * 1.8));
  }
  vec3 md = vec3(${ROSE[0].toFixed(2)}, ${ROSE[1].toFixed(2)}, ${(ROSE[2] + 1.5).toFixed(2)}) - pos;
  float m2 = max(dot(md, md), 0.0004);
  light += uMoonColor * (uMoon * max(dot(n, md * inversesqrt(m2)), 0.0) / (1.0 + m2 * 0.05));
  vec3 cd = vec3(0.0, 1.1, 0.0) - pos;
  float c2 = max(dot(cd, cd), 0.0004);
  light += uFillColor * (uFill * (max(dot(n, cd * inversesqrt(c2)), 0.0) * 0.8 + 0.2) / (1.0 + c2 * 0.09));
  return light;
}
vec3 hallFog(vec3 col, vec3 pos) {
  float dist = length(pos - cameraPosition);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}`

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

/** Stone, carpet and iron. The floor adds glossy reflections; the back wall carves its niche. */
const STONE_FRAG = /* glsl */ `
${LIGHT}
uniform sampler2D uMap;
uniform vec2 uRepeat;
uniform vec3 uBase;
uniform float uGloss;
uniform float uNiche;
uniform float uBeam;
uniform vec3 uBeamColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec3 albedo = texture2D(uMap, vUv * uRepeat).rgb * uBase;
  vec3 n = normalize(vNormal);
  if (uNiche > 0.5) {
    // The arched niche: a recess in shadow framed by a moulding that catches the light.
    vec2 q = vec2(abs(vWorld.x), vWorld.y);
    float inside = q.y < ${ARCH_SPRING.toFixed(2)} ? q.x - ${ARCH_W.toFixed(2)} : length(q - vec2(0.0, ${ARCH_SPRING.toFixed(2)})) - ${ARCH_W.toFixed(2)};
    float recess = smoothstep(0.02, -0.06, inside);
    float moulding = smoothstep(0.2, 0.1, abs(inside - 0.08));
    albedo *= mix(1.0, 0.42, recess);
    albedo *= 1.0 + moulding * 0.55;
  }
  vec3 col = albedo * hallLight(vWorld, n);
  if (uGloss > 0.0) {
    // Polished stone: each flame and the chest's beam show as a soft streak below it.
    vec3 v = normalize(vWorld - cameraPosition);
    vec3 r = reflect(v, n);
    float fres = 0.3 + 0.7 * pow(clamp(1.0 + dot(v, n), 0.0, 1.0), 3.0);
    vec3 refl = vec3(0.0);
    for (int i = 0; i < TORCHES; i++) {
      vec3 tp = uTorch[i] - vWorld;
      float along = max(dot(tp, r), 0.0);
      vec3 c = r * along - tp;
      float s = 0.03 + along * 0.025;
      float off = (c.x * c.x + (c.y * c.y + c.z * c.z) * 0.12) / (s * s);
      refl += uTorchColor * (uAmp[i] / (1.0 + off * 1.6));
    }
    // The beam is a vertical line of light over the chest.
    vec2 fxz = vWorld.xz - vec2(0.0, 0.02);
    float rr = max(dot(r.xz, r.xz), 0.0001);
    float t = max(-dot(fxz, r.xz) / rr, 0.0);
    float h = vWorld.y + r.y * t;
    float bd = length(fxz + r.xz * t);
    float bs = 0.06 + t * 0.04;
    float beam = step(0.45, h) * smoothstep(5.0, 1.0, h) / (1.0 + (bd * bd) / (bs * bs) * 2.0);
    refl += uBeamColor * (uBeam * beam * 1.4);
    refl += uFillColor * (uFill * 0.25 / (1.0 + dot(vWorld.xz, vWorld.xz) * 0.6));
    col += refl * uGloss * fres;
  }
  gl_FragColor = vec4(hallFog(col, vWorld), 1.0);
}`

/** Hanging banners: crimson cloth with folds, a gold border and a gold ring and cross. */
const BANNER_VERT = /* glsl */ `
uniform float uTime;
uniform float uPhase;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float k = 1.0 - uv.y;
  p.z += sin(uTime * 0.7 + uPhase + uv.y * 3.0) * 0.035 * k;
  p.x += sin(uTime * 0.5 + uPhase * 1.7) * 0.012 * k;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const BANNER_FRAG = /* glsl */ `
${LIGHT}
uniform float uEmblem;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  // Swallowtail hem.
  float notch = 0.12 - abs(uv.x - 0.5) * 0.24;
  if (uv.y < notch) discard;
  float folds = 0.78 + 0.22 * sin(uv.x * 31.0 + sin(uv.y * 4.0) * 1.2);
  vec3 cloth = vec3(0.32, 0.03, 0.035) * folds;
  float bx = min(uv.x, 1.0 - uv.x);
  float by = min(uv.y - notch, 1.0 - uv.y);
  float border = step(bx, 0.07) * step(0.035, bx) + step(by, 0.05) * step(0.025, by) * step(0.035, bx);
  vec3 gold = vec3(0.62, 0.43, 0.14);
  vec3 col = mix(cloth, gold, clamp(border, 0.0, 1.0));
  if (uEmblem > 0.5) {
    // A gold crown: a band, three points and a pearl on each.
    vec2 e = (uv - vec2(0.5, 0.64)) * vec2(1.0, 2.8);
    float band = max(abs(e.x) - 0.24, abs(e.y + 0.1) - 0.045);
    float px = abs(e.x) > 0.12 ? abs(abs(e.x) - 0.2) : abs(e.x);
    float points = max(max(e.y + 0.06 - 0.24, -(e.y + 0.06)), px - (0.24 - (e.y + 0.06)) * 0.32);
    points = max(points, abs(e.x) - 0.26);
    float pearls = min(min(length(e - vec2(0.0, 0.2)), length(e - vec2(0.2, 0.2))), length(e - vec2(-0.2, 0.2))) - 0.035;
    float crown = min(min(band, points), pearls);
    float mark = smoothstep(0.012, 0.0, crown);
    col = mix(col, gold * 1.1, mark);
  }
  col *= hallLight(vWorld, vec3(0.0, 0.0, 1.0)) * 1.25;
  gl_FragColor = vec4(hallFog(col, vWorld), 1.0);
}`

const ROSE_FRAG = /* glsl */ `
${LIGHT}
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x + 1e-6);
  // Stone tracery: rings, twelve spokes and petal arcs between them.
  float spokes = abs(sin(a * 6.0));
  float petals = abs(sin(a * 12.0)) * 0.5;
  float lead = max(smoothstep(0.05, 0.0, abs(r - 0.3)), smoothstep(0.045, 0.0, abs(r - 0.62)));
  lead = max(lead, smoothstep(0.09, 0.0, spokes) * step(0.3, r));
  lead = max(lead, smoothstep(0.05, 0.0, abs(r - (0.8 + petals * 0.25))) * step(0.62, r));
  lead = max(lead, smoothstep(0.9, 1.0, r));
  // Dim moonlit glass, mostly cold blue, with a few deep ruby panes and a pale centre.
  float pane = floor((a + 3.1416) / 0.5236);
  vec3 glass = mix(vec3(0.2, 0.27, 0.45), vec3(0.42, 0.08, 0.1), step(0.75, fract(pane * 0.37)) * step(0.62, r));
  glass = mix(glass, vec3(0.5, 0.42, 0.26), step(r, 0.3));
  vec3 col = glass * (1.0 - lead) * uMoon * 1.4 * (0.45 + 0.55 * uRoom);
  gl_FragColor = vec4(hallFog(col, vWorld), 1.0);
}`

const SIMPLE_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

/** Flame: tongues of fire rising through noise, hottest at the core. Drawn facing the camera. */
const FLAME_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uSeed;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 uv = vUv;
  float t = uTime + uSeed * 17.0;
  float n = noise(vec2(uv.x * 3.5, uv.y * 2.6 - t * 2.2)) * 0.55 + noise(vec2(uv.x * 8.0, uv.y * 6.0 - t * 3.7)) * 0.45;
  vec2 p = uv - vec2(0.5, 0.2);
  p.x += (n - 0.5) * 0.3 * smoothstep(0.0, 0.6, p.y);
  // A torch burns broad and ragged, not to a candle's point.
  float h = clamp(p.y / 0.62, 0.0, 1.0);
  float width = 0.3 * pow(1.0 - h, 0.55) * (0.75 + 0.5 * n);
  float body = smoothstep(width, width * 0.25, abs(p.x)) * smoothstep(-0.1, 0.0, p.y) * smoothstep(1.0, 0.45, h + (n - 0.5) * 0.55);
  float core = smoothstep(width * 0.6, 0.0, abs(p.x)) * smoothstep(-0.05, 0.04, p.y) * smoothstep(0.42, 0.05, h);
  vec3 col = mix(vec3(0.7, 0.13, 0.02), vec3(1.0, 0.48, 0.1), body);
  col = mix(col, vec3(1.0, 0.74, 0.36), core);
  float a = body * uAmp;
  gl_FragColor = vec4(col * (0.95 + core * 0.55) * a, a);
}`
const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4) * uA;
  gl_FragColor = vec4(uColor * a, a);
}`

const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
uniform float uTime;
varying vec2 vUv;
void main() {
  float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
  float fall = smoothstep(0.0, 0.25, vUv.y) * (0.35 + 0.65 * vUv.y);
  float motes = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 0.6 + sin(vUv.x * 12.0) * 2.0);
  float a = edge * fall * motes * uA;
  gl_FragColor = vec4(uColor * a, a);
}`

export function RoyalHall({ anim }: { anim: ChestAnim }) {
  const tex = useMemo(() => hallTextures(), [])
  const torchColor = useMemo(() => new THREE.Color('#ffae5e'), [])
  const shared = useMemo(
    () => ({
      uTorch: { value: TORCHES.map((p) => new THREE.Vector3(...p)) },
      uAmp: { value: new Array<number>(N).fill(1) },
      uTorchColor: { value: torchColor },
      uRoom: { value: 1 },
      uFillColor: { value: new THREE.Color() },
      uFill: { value: 0 },
      uMoonColor: { value: new THREE.Color('#7f9bd6') },
      uMoon: { value: 0.35 },
      uFogColor: { value: new THREE.Color('#0b0806').convertSRGBToLinear() },
      uFogDensity: { value: 0.06 },
      uTime: { value: 0 },
      uBeam: { value: 0 },
      uBeamColor: { value: new THREE.Color() },
    }),
    [torchColor],
  )

  const stone = useMemo(() => {
    const make = (map: THREE.Texture, repeat: [number, number], base: string, opts: { gloss?: number; niche?: boolean } = {}) =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...shared,
          uMap: { value: map },
          uRepeat: { value: new THREE.Vector2(...repeat) },
          uBase: { value: new THREE.Color(base) },
          uGloss: { value: opts.gloss ?? 0 },
          uNiche: { value: opts.niche ? 1 : 0 },
        },
        vertexShader: VERT,
        fragmentShader: STONE_FRAG,
      })
    return {
      // Repeats keep flagstones about 1.1 m square, wall blocks about 0.7 by 0.35 m and
      // column drums about a metre tall.
      floor: make(tex.flags, [4, 9.7], '#6a625a', { gloss: 0.7 }),
      carpet: make(tex.carpet, [1, 5.1], '#ffffff', { gloss: 0.05 }),
      wall: make(tex.masonry, [1.57, 1.79], '#857b72', { niche: true }),
      side: make(tex.masonry, [3.8, 1.79], '#7a7067'),
      column: make(tex.drum, [1, 5.6], '#8e847a'),
      block: make(tex.drum, [1, 0.35], '#8e847a'),
      iron: make(tex.masonry, [1, 1], '#3a332d'),
      wood: make(tex.masonry, [0.2, 1], '#5a3a22'),
    }
  }, [shared, tex])

  const banner = useMemo(
    () =>
      [0, 1, 2].map(
        (i) =>
          new THREE.ShaderMaterial({
            uniforms: { ...shared, uPhase: { value: i * 2.1 }, uEmblem: { value: i === 0 ? 1 : 0 } },
            vertexShader: BANNER_VERT,
            fragmentShader: BANNER_FRAG,
            side: THREE.DoubleSide,
          }),
      ),
    [shared],
  )
  const rose = useMemo(() => new THREE.ShaderMaterial({ uniforms: shared, vertexShader: SIMPLE_VERT, fragmentShader: ROSE_FRAG }), [shared])
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const
  const flames = useMemo(
    () => TORCHES.map((_, i) => new THREE.ShaderMaterial({ ...additive, uniforms: { uTime: shared.uTime, uAmp: { value: 1 }, uSeed: { value: i * 0.37 } }, vertexShader: SIMPLE_VERT, fragmentShader: FLAME_FRAG })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  )
  const glows = useMemo(
    () => TORCHES.map(() => new THREE.ShaderMaterial({ ...additive, uniforms: { uColor: { value: new THREE.Color('#ff9a4a') }, uA: { value: 0.3 } }, vertexShader: SIMPLE_VERT, fragmentShader: GLOW_FRAG })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const shaft = useMemo(
    () => new THREE.ShaderMaterial({ ...additive, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color('#8fa8e0') }, uA: { value: 0.05 }, uTime: shared.uTime }, vertexShader: SIMPLE_VERT, fragmentShader: SHAFT_FRAG }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shared],
  )

  // Columns, their bases and capitals, and the torch brackets: one instanced draw each.
  const columns = useMemo(() => {
    const shaftGeo = new THREE.CylinderGeometry(0.3, 0.33, 5.6, 28, 1, true)
    // Octagonal plinths under the shafts and flared capitals above them.
    const blockGeo = new THREE.CylinderGeometry(0.44, 0.5, 0.34, 8)
    const capGeo = new THREE.CylinderGeometry(0.5, 0.36, 0.32, 8)
    const cupGeo = new THREE.CylinderGeometry(0.085, 0.05, 0.13, 14)
    // Wooden torch hafts, angled out from their brackets.
    const haftGeo = new THREE.CylinderGeometry(0.028, 0.022, 0.5, 10)
    const count = COL_Z.length * 2
    const shafts = new THREE.InstancedMesh(shaftGeo, stone.column, count)
    const bases = new THREE.InstancedMesh(blockGeo, stone.block, count)
    const caps = new THREE.InstancedMesh(capGeo, stone.block, count)
    const cups = new THREE.InstancedMesh(cupGeo, stone.iron, N)
    const hafts = new THREE.InstancedMesh(haftGeo, stone.wood, N)
    const m = new THREE.Matrix4()
    let i = 0
    for (const z of COL_Z) {
      for (const x of [-COL_X, COL_X]) {
        shafts.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y + 2.8, z))
        bases.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y + 0.17, z))
        caps.setMatrixAt(i, m.makeTranslation(x, FLOOR_Y + 5.5, z))
        i++
      }
    }
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const one = new THREE.Vector3(1, 1, 1)
    TORCHES.forEach((p, k) => {
      // Column torches lean in toward the aisle; wall torches lean out from the wall.
      const onWall = p[2] < WALL_Z + 0.5
      const lean = 0.42
      e.set(onWall ? lean : 0, 0, onWall ? 0 : p[0] < 0 ? -lean : lean)
      q.setFromEuler(e)
      const down = new THREE.Vector3(0, -0.27, 0).applyQuaternion(q)
      cups.setMatrixAt(k, m.compose(new THREE.Vector3(p[0], p[1] - 0.1, p[2]), q, one))
      hafts.setMatrixAt(k, m.compose(new THREE.Vector3(p[0] + down.x, p[1] - 0.1 + down.y, p[2] + down.z), q, one))
    })
    for (const mesh of [shafts, bases, caps, cups, hafts]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
    }
    return { shafts, bases, caps, cups, hafts }
  }, [stone])

  const flameRefs = useRef<(THREE.Mesh | null)[]>([])
  const glowRefs = useRef<(THREE.Mesh | null)[]>([])

  useEffect(
    () => () => {
      Object.values(stone).forEach((m) => m.dispose())
      banner.forEach((m) => m.dispose())
      flames.forEach((m) => m.dispose())
      glows.forEach((m) => m.dispose())
      rose.dispose()
      shaft.dispose()
      Object.values(columns).forEach((m) => m.geometry.dispose())
    },
    [stone, banner, flames, glows, rose, shaft, columns],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const room = anim.room
    const amps = shared.uAmp.value
    for (let i = 0; i < N; i++) {
      const ph = i * 1.7
      const flicker = anim.still ? 0.9 : 0.82 + Math.sin(t * 9.3 + ph) * 0.06 + Math.sin(t * 23.1 + ph * 1.3) * 0.05 + Math.sin(t * 3.7 + ph) * 0.07
      const a = flicker * room * (1 - Math.min(anim.beam, 1) * 0.3) * (1 + anim.flare * 0.3)
      amps[i] = a * 3.0
      const f = flames[i]
      if (f) f.uniforms.uAmp!.value = Math.min(1, a)
      const g = glows[i]
      if (g) g.uniforms.uA!.value = 0.3 * a
      flameRefs.current[i]?.quaternion.copy(state.camera.quaternion)
      glowRefs.current[i]?.quaternion.copy(state.camera.quaternion)
    }
    shared.uTime.value = anim.still ? 0 : t
    shared.uRoom.value = room
    // Fog fades into the page's own background color.
    if (state.scene.background instanceof THREE.Color) shared.uFogColor.value.copy(state.scene.background)
    // The chest's light reaches the hall; once the rarity is named it carries its color.
    shared.uFillColor.value.copy(anim.glowColor)
    shared.uFill.value = (Math.min(anim.beam, 1) * 0.7 + anim.flare * 0.2) * (0.35 + 0.65 * anim.tint)
    shared.uBeam.value = Math.min(anim.beam, 1)
    shared.uBeamColor.value.copy(anim.beamColor)
    shared.uMoon.value = 0.8 * (0.15 + 0.85 * room)
    shaft.uniforms.uA!.value = 0.045 * room
  })

  // The shaft runs from the rose window down toward the front of the altar.
  const shaftPose = useMemo(() => {
    const from = new THREE.Vector3(ROSE[0], ROSE[1], ROSE[2] + 0.1)
    const to = new THREE.Vector3(0, FLOOR_Y, -3.2)
    const dir = to.clone().sub(from)
    const len = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize())
    const mid = from.clone().add(to).multiplyScalar(0.5)
    return { len, q, mid }
  }, [])

  const hallDepth = 12 - WALL_Z
  return (
    <group>
      {/* Floor and the runner to the altar. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, (12 + WALL_Z) / 2]} material={stone.floor}>
        <planeGeometry args={[SIDE_X * 2, hallDepth]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.004, (6 + WALL_Z) / 2]} material={stone.carpet}>
        <planeGeometry args={[1.5, 6 - WALL_Z]} />
      </mesh>
      {/* Back wall with its niche, and the side walls behind the columns. */}
      <mesh position={[0, FLOOR_Y + 5, WALL_Z]} material={stone.wall}>
        <planeGeometry args={[SIDE_X * 2, 10]} />
      </mesh>
      <mesh position={[-SIDE_X, FLOOR_Y + 5, (12 + WALL_Z) / 2]} rotation={[0, Math.PI / 2, 0]} material={stone.side}>
        <planeGeometry args={[hallDepth, 10]} />
      </mesh>
      <mesh position={[SIDE_X, FLOOR_Y + 5, (12 + WALL_Z) / 2]} rotation={[0, -Math.PI / 2, 0]} material={stone.side}>
        <planeGeometry args={[hallDepth, 10]} />
      </mesh>
      <primitive object={columns.shafts} />
      <primitive object={columns.bases} />
      <primitive object={columns.caps} />
      <primitive object={columns.cups} />
      <primitive object={columns.hafts} />
      {/* Banners: the great one in the niche, two smaller on the wall. */}
      <mesh position={[0, FLOOR_Y + 2.55, WALL_Z + 0.08]} material={banner[0]}>
        <planeGeometry args={[1.25, 3.5, 1, 16]} />
      </mesh>
      <mesh position={[-ARCH_W - 1.75, FLOOR_Y + 3.0, WALL_Z + 0.06]} material={banner[1]}>
        <planeGeometry args={[0.9, 2.7, 1, 12]} />
      </mesh>
      <mesh position={[ARCH_W + 1.75, FLOOR_Y + 3.0, WALL_Z + 0.06]} material={banner[2]}>
        <planeGeometry args={[0.9, 2.7, 1, 12]} />
      </mesh>
      {/* The rose window and its shaft of moonlight. */}
      <mesh position={ROSE} material={rose}>
        <planeGeometry args={[1.8, 1.8]} />
      </mesh>
      <mesh position={shaftPose.mid} quaternion={shaftPose.q} material={shaft} renderOrder={3}>
        <planeGeometry args={[1.6, shaftPose.len]} />
      </mesh>
      {/* Torch flames and their halos. */}
      {TORCHES.map((p, i) => (
        <group key={i} position={p}>
          <mesh ref={(m) => void (glowRefs.current[i] = m)} position={[0, 0.22, 0]} material={glows[i]} renderOrder={4}>
            <planeGeometry args={[2.4, 2.4]} />
          </mesh>
          <mesh ref={(m) => void (flameRefs.current[i] = m)} position={[0, 0.22, 0]} material={flames[i]} renderOrder={5}>
            <planeGeometry args={[0.56, 0.78]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
