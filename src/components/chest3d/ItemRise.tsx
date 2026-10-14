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
const MACRO_BIAS: Record<string, number> = { sword: 0.3, dagger: 0.28, polearm: 0.32, axe: 0.28, helmet: 0.06, shield: 0, armor: 0.12, fitting: 0 }

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

export function ItemRise({ item, anim, color, glow = 1, hero = false }: Props) {
  const tex = useTexture(item.image)
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const size = useMemo(() => itemPlaneSize(item.aspect), [item.aspect])

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
        uTexel: { value: new THREE.Vector2(1 / (img?.width ?? 1024), 1 / (img?.height ?? 1024)) },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uLit;
        uniform float uGlint;
        uniform vec3 uRim;
        uniform float uOpacity;
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
          vec3 silhouette = vec3(0.02, 0.016, 0.012) + uRim * edge * 2.6;
          vec3 lit = tex.rgb * 1.04 + uRim * edge * 0.35;
          float diag = vUv.x * 0.55 + vUv.y;
          float band = smoothstep(0.08, 0.0, abs(diag - (uGlint * 1.9 - 0.2)));
          vec3 col = mix(silhouette, lit, uLit) + band * vec3(1.0, 0.95, 0.86) * 1.5 * uLit;
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
    const floatY = Math.sin(t * 1.4) * 0.025 * p
    const s = hero ? 0.62 : 1
    const restY = hero ? 0.62 + size.uprightH * s * 0.5 : 0.32 + 0.62 + size.uprightH * 0.5
    g.position.y = 0.32 + eased * (restY - 0.32) + floatY
    g.rotation.y = Math.sin(t * 0.6) * 0.2 * p
    g.scale.setScalar((0.55 + eased * 0.45) * s)
    // Tell the camera where the item will rest so it can frame it whole.
    anim.focusY = restY
    anim.focusH = size.uprightH * s
    anim.focusW = size.w * s
    anim.macroBias = MACRO_BIAS[item.category] ?? 0.2
    itemMat.uniforms.uLit!.value = anim.itemLit
    itemMat.uniforms.uGlint!.value = anim.glint
    itemMat.uniforms.uOpacity!.value = Math.min(1, p * 3)
    haloMat.uniforms.uA!.value = Math.min(1, p * 1.5) * (0.5 + anim.itemLit * 0.2) * (0.9 + Math.sin(t * 2.2) * 0.1) * glow
    if (halo.current) halo.current.quaternion.copy(state.camera.quaternion)
  })

  // Keep the halo close to the item; wide pieces get a capped glow so it never floods the frame.
  const haloSize = Math.min(2.2, Math.max(size.w, size.h) * 1.6)
  return (
    <group ref={group} position={[0, 0.32, 0.05]}>
      <mesh ref={halo} position={[0, 0, -0.06]} renderOrder={8} material={haloMat}>
        <planeGeometry args={[haloSize, haloSize]} />
      </mesh>
      <mesh renderOrder={12} material={itemMat}>
        <planeGeometry args={[size.w, size.h]} />
      </mesh>
    </group>
  )
}
