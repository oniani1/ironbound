import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { Item } from '../../types'
import type { ChestAnim } from './animState'

interface Props {
  item: Item
  anim: ChestAnim
  color: string
  /** Halo strength, scaled by rarity by the caller. */
  glow?: number
  /** Landing display: smaller, resting just above the open chest. */
  hero?: boolean
}

/** Size of the item plane in world units, normalized by shape so a dagger and a pike both read well. */
export function itemPlaneSize(aspect: number) {
  const h = aspect < 0.35 ? 1.45 : aspect < 0.7 ? 1.2 : aspect < 1.4 ? 0.95 : 0.8
  return { w: h * aspect, h, uprightH: h }
}

/** The detail a macro shot lands on: hilts and heads high, visors a little above center, boss and plates centered. */
const MACRO_BIAS: Record<string, number> = { sword: 0.3, dagger: 0.28, polearm: 0.32, axe: 0.28, helmet: 0.06, shield: 0, armor: 0.12, crossbow: 0.1, fitting: 0 }

/**
 * Where the piece actually sits inside its photo, as fractions of the image (v runs up).
 * Cut-outs often keep empty margins on one side; framing the plane's centre would put
 * the camera on empty air in a close-up.
 */
function contentBounds(img: CanvasImageSource & { width: number; height: number }) {
  const full = { u0: 0, u1: 1, v0: 0, v1: 1 }
  try {
    const W = 96
    const H = Math.max(8, Math.min(768, Math.round((W * img.height) / Math.max(1, img.width))))
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d', { willReadFrequently: true })
    if (!g) return full
    g.drawImage(img, 0, 0, W, H)
    const d = g.getImageData(0, 0, W, H).data
    let x0 = W
    let x1 = -1
    let y0 = H
    let y1 = -1
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((d[(y * W + x) * 4 + 3] ?? 0) > 24) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 < x0 || y1 < y0) return full
    return { u0: x0 / W, u1: (x1 + 1) / W, v0: 1 - (y1 + 1) / H, v1: 1 - y0 / H }
  } catch {
    return full
  }
}

/** Plain torchlight on the steel while the piece is studied, before its rarity is named. */
const PLAIN = new THREE.Color('#d9c3a3')

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

export function ItemRise({ item, anim, color, glow = 1, hero = false }: Props) {
  const tex = useTexture(item.image)
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const size = useMemo(() => itemPlaneSize(item.aspect), [item.aspect])
  // The piece itself: its size and how far its centre sits from the plane's centre.
  const content = useMemo(() => {
    const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined
    const b = img && img.width ? contentBounds(img) : { u0: 0, u1: 1, v0: 0, v1: 1 }
    return { w: (b.u1 - b.u0) * size.w, h: (b.v1 - b.v0) * size.h, x: ((b.u0 + b.u1) / 2 - 0.5) * size.w, y: ((b.v0 + b.v1) / 2 - 0.5) * size.h }
  }, [tex, size])
  const rarity = useMemo(() => new THREE.Color(color), [color])
  const rim = useMemo(() => new THREE.Color(), [])

  const itemMat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const img = tex.image as { width?: number; height?: number } | undefined
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uMap: { value: tex },
        uLit: { value: 0 },
        uGlint: { value: -1 },
        uRim: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uSheen: { value: 1 },
        uTexel: { value: new THREE.Vector2(1 / (img?.width ?? 1024), 1 / (img?.height ?? 1024)) },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uLit;
        uniform float uGlint;
        uniform vec3 uRim;
        uniform float uOpacity;
        uniform float uSheen;
        uniform vec2 uTexel;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          float a = tex.a;
          if (a < 0.02) discard;
          vec2 o = uTexel * 2.5;
          float n = texture2D(uMap, vUv + vec2(o.x, 0.0)).a + texture2D(uMap, vUv - vec2(o.x, 0.0)).a
                  + texture2D(uMap, vUv + vec2(0.0, o.y)).a + texture2D(uMap, vUv - vec2(0.0, o.y)).a;
          float edge = clamp((4.0 * a - n) * 1.4, 0.0, 1.0);
          // Backlit, not blacked out: a trace of the steel shows so a broad piece held close
          // reads as an object in shadow, never as a black slab.
          vec3 silhouette = tex.rgb * mix(vec3(0.13), uRim * 0.15, 0.5) + uRim * edge * 1.25;
          vec3 lit = tex.rgb * 1.04 + uRim * edge * 0.35;
          float diag = vUv.x * 0.55 + vUv.y;
          float d = abs(diag - (uGlint * 1.9 - 0.2));
          float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
          float band = smoothstep(0.1, 0.0, d);
          float rake = smoothstep(0.38, 0.0, d);
          vec3 sheen = vec3(1.0, 0.95, 0.86) * (band * (0.3 + 1.1 * lum) + rake * 0.4 * lum);
          vec3 col = mix(silhouette, lit, uLit) + sheen * uLit * uSheen;
          gl_FragColor = vec4(col, a * uOpacity);
        }`,
    })
  }, [tex, color])

  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uA; varying vec2 vUv;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.6) * uA;
            gl_FragColor = vec4(uColor * 1.2, a);
          }`,
      }),
    [color],
  )

  useEffect(() => () => {
    itemMat.dispose()
    haloMat.dispose()
  }, [itemMat, haloMat])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const p = anim.item
    const g = group.current
    if (!g) return
    g.visible = p > 0.001
    const eased = 1 - Math.pow(1 - p, 3)
    const floatY = anim.still ? 0 : Math.sin(t * 1.4) * 0.025 * p
    const s = hero ? 0.62 : 1
    const restY = hero ? 0.62 + content.h * s * 0.5 : 0.32 + 0.62 + content.h * 0.5
    g.position.y = 0.32 + eased * (restY - 0.32) + floatY
    g.rotation.y = anim.still ? 0 : Math.sin(t * 0.6) * 0.2 * p
    g.scale.setScalar((0.55 + eased * 0.45) * s)
    // Tell the camera where the item will rest so it can frame it whole.
    anim.focusY = restY
    anim.focusH = content.h * s
    anim.focusW = content.w * s
    anim.macroBias = MACRO_BIAS[item.category] ?? 0.2
    // The rim and the halo stay plain until the rarity is named; the landing display is lit
    // in its rarity from the start.
    const tint = hero ? 1 : anim.tint
    rim.copy(PLAIN).lerp(rarity, tint)
    ;(itemMat.uniforms.uRim!.value as THREE.Color).copy(rim)
    ;(haloMat.uniforms.uColor!.value as THREE.Color).copy(rim)
    itemMat.uniforms.uLit!.value = anim.itemLit
    itemMat.uniforms.uGlint!.value = anim.glint
    // Held this close, a full-strength glint washes the steel out to white.
    itemMat.uniforms.uSheen!.value = 1 - anim.macro * 0.8
    itemMat.uniforms.uOpacity!.value = Math.min(1, p * 3)
    haloMat.uniforms.uA!.value = Math.min(1, p * 1.5) * (0.5 + anim.itemLit * 0.2) * (0.9 + Math.sin(t * 2.2) * 0.1) * glow * (0.15 + 0.85 * tint)
    if (halo.current) halo.current.quaternion.copy(state.camera.quaternion)
  })

  // Keep the halo close to the item; wide pieces get a capped glow so it never floods the frame.
  const haloSize = Math.min(2.2, Math.max(content.w, content.h) * 1.6)
  return (
    <group ref={group} position={[0, 0.32, 0.05]}>
      <mesh ref={halo} position={[0, 0, -0.06]} renderOrder={8} material={haloMat}>
        <planeGeometry args={[haloSize, haloSize]} />
      </mesh>
      {/* Shifted so the piece, not the photo, is centred on the group. */}
      <mesh position={[-content.x, -content.y, 0]} renderOrder={12} material={itemMat}>
        <planeGeometry args={[size.w, size.h]} />
      </mesh>
    </group>
  )
}
