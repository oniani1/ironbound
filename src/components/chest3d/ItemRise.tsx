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
}

/** Size of the item plane in world units, normalized by shape so a dagger and a pike both read well. */
export function itemPlaneSize(aspect: number, rot: number) {
  const sideways = Math.abs(rot) === 90
  const upright = sideways ? 1 / aspect : aspect
  const h = upright < 0.35 ? 1.55 : upright < 0.7 ? 1.25 : upright < 1.4 ? 0.95 : 0.8
  const w = h * upright
  // Plane is built in the photo's own orientation, then rotated.
  return sideways ? { w: h, h: w, uprightH: h } : { w, h, uprightH: h }
}

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

export function ItemRise({ item, anim, color }: Props) {
  const tex = useTexture(item.image)
  const group = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const rot = item.rotate ?? 0
  const size = useMemo(() => itemPlaneSize(item.aspect, rot), [item.aspect, rot])

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
    g.position.y = 0.32 + eased * (0.62 + size.uprightH * 0.5) + floatY
    g.rotation.y = Math.sin(t * 0.6) * 0.2 * p
    g.scale.setScalar(0.55 + eased * 0.45)
    itemMat.uniforms.uLit!.value = anim.itemLit
    itemMat.uniforms.uGlint!.value = anim.glint
    itemMat.uniforms.uOpacity!.value = Math.min(1, p * 3)
    haloMat.uniforms.uA!.value = Math.min(1, p * 1.5) * (0.5 + anim.itemLit * 0.2) * (0.9 + Math.sin(t * 2.2) * 0.1)
    if (halo.current) halo.current.quaternion.copy(state.camera.quaternion)
  })

  const haloSize = Math.max(size.w, size.h) * 1.7
  return (
    <group ref={group} position={[0, 0.32, 0.05]}>
      <mesh ref={halo} position={[0, 0, -0.06]} renderOrder={8} material={haloMat}>
        <planeGeometry args={[haloSize, haloSize]} />
      </mesh>
      <mesh rotation={[0, 0, (rot * Math.PI) / 180]} renderOrder={12} material={itemMat}>
        <planeGeometry args={[size.w, size.h]} />
      </mesh>
    </group>
  )
}
