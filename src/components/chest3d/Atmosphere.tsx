import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

// Four candles on the plinth's edge, in the order they catch: front left, back right,
// back left, front right. Heights vary so the row does not look stamped.
const CANDLES: { pos: [number, number, number]; h: number }[] = [
  { pos: [-0.68, 0, 0.47], h: 0.2 },
  { pos: [0.66, 0, -0.5], h: 0.15 },
  { pos: [-0.64, 0, -0.52], h: 0.24 },
  { pos: [0.7, 0, 0.45], h: 0.13 },
]

/** One flame: a teardrop of light that sways, always facing the camera. */
function Flame({ anim, index, y }: { anim: ChestAnim; index: number; y: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uLit: { value: 0 }, uColor: { value: new THREE.Color('#ff9a4a') }, uSeed: { value: index * 1.7 } },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uLit; uniform vec3 uColor; uniform float uSeed; varying vec2 vUv;
          void main(){
            vec2 p = vUv - vec2(0.5, 0.18);
            float sway = sin(uTime * 7.0 + uSeed) * 0.03 + sin(uTime * 13.0 + uSeed * 2.0) * 0.015;
            p.x -= sway * p.y * 2.0;
            // Teardrop: round at the base, pointed at the tip.
            float w = mix(0.22, 0.02, clamp(p.y / 0.78, 0.0, 1.0));
            float d = length(vec2(p.x / max(w, 0.001), max(p.y, 0.0) / 0.8)) + max(-p.y, 0.0) * 6.0;
            float a = smoothstep(1.0, 0.25, d);
            float core = smoothstep(0.55, 0.0, d);
            vec3 col = mix(uColor, vec3(1.0, 0.96, 0.82), core * 0.85);
            gl_FragColor = vec4(col * (1.2 + core), a * uLit);
          }`,
      }),
    [index],
  )
  const camera = useThree((s) => s.camera)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const lit = Math.max(0, Math.min(1, anim.candles * CANDLES.length - index))
    mat.uniforms.uTime!.value = anim.still ? 0 : t
    mat.uniforms.uLit!.value = lit * (0.9 + (anim.still ? 0 : Math.sin(t * 11 + index) * 0.08))
    ;(mat.uniforms.uColor!.value as THREE.Color).set('#ff9a4a').lerp(anim.candleTint, anim.candleTintAmt)
    const m = mesh.current
    if (m) {
      m.quaternion.copy(camera.quaternion)
      const s = lit * (1 + anim.flare * 0.7)
      m.scale.set(s, s * (1 + anim.flare * 0.4), s)
      m.visible = lit > 0.01
    }
  })
  return (
    <mesh ref={mesh} position={[0, y + 0.045, 0]} material={mat}>
      <planeGeometry args={[0.07, 0.15]} />
    </mesh>
  )
}

/**
 * Candles on the plinth. During an opening they catch one after another as the room comes
 * up, flare on each beat and take the rarity color for the top tiers. The two in front
 * cast real light onto the stone and the chest.
 */
export function Candles({ anim }: { anim: ChestAnim }) {
  const wax = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9a582', roughness: 0.6, emissive: new THREE.Color('#ff8a3d'), emissiveIntensity: 0.04 }), [])
  const wick = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1a120c' }), [])
  const lights = useRef<(THREE.PointLight | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    lights.current.forEach((l, i) => {
      if (!l) return
      const lit = Math.max(0, Math.min(1, anim.candles * CANDLES.length - (i === 0 ? 0 : 3)))
      const flicker = anim.still ? 1 : 0.86 + Math.sin(t * 9.7 + i * 3) * 0.07 + Math.sin(t * 21.3 + i) * 0.05
      l.intensity = lit * flicker * (1.1 + anim.flare * 1.4)
      l.color.set('#ff9a4a').lerp(anim.candleTint, anim.candleTintAmt)
    })
    wax.emissiveIntensity = (0.02 + anim.candles * 0.05 + anim.flare * 0.06) * (0.3 + anim.room * 0.7)
  })
  return (
    <group>
      {CANDLES.map((c, i) => (
        <group key={i} position={c.pos}>
          <mesh position={[0, c.h / 2, 0]} material={wax} castShadow>
            <cylinderGeometry args={[0.028, 0.032, c.h, 18]} />
          </mesh>
          <mesh position={[0, c.h + 0.012, 0]} material={wick}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.024, 6]} />
          </mesh>
          <Flame anim={anim} index={i} y={c.h} />
        </group>
      ))}
      {/* Real light from the two front candles only; the back pair hide behind the chest. */}
      <pointLight ref={(l) => void (lights.current[0] = l)} position={[CANDLES[0]!.pos[0], CANDLES[0]!.h + 0.08, CANDLES[0]!.pos[2]]} distance={2.6} decay={1.8} />
      <pointLight ref={(l) => void (lights.current[1] = l)} position={[CANDLES[3]!.pos[0], CANDLES[3]!.h + 0.08, CANDLES[3]!.pos[2]]} distance={2.6} decay={1.8} />
    </group>
  )
}

/**
 * Dust hanging in the air around the chest. Nearly invisible in the dark, it shows in the
 * light from the lid and the beam, which is what makes the light feel like a volume.
 */
export function DustMotes({ anim, count = 240 }: { anim: ChestAnim; count?: number }) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 1.35
      const a = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = Math.random() * 2.8
      pos[i * 3 + 2] = Math.sin(a) * r * 0.8
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uBright: { value: 0 }, uColor: { value: new THREE.Color() }, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float seed; uniform float uTime; uniform float uPx; varying float vNear; varying float vSeed;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.03 + seed * 0.05), 2.8);
          p.x += sin(uTime * 0.4 + seed * 31.0) * 0.06;
          p.z += cos(uTime * 0.33 + seed * 17.0) * 0.05;
          // Brighter near the axis, where the lid and beam light the air.
          vNear = 1.0 - smoothstep(0.15, 1.2, length(p.xz));
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (2.0 + seed * 3.0) * uPx * (2.2 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uBright; uniform vec3 uColor; varying float vNear; varying float vSeed;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(mix(vec3(1.0, 0.92, 0.8), uColor, 0.55), a * uBright * (0.25 + vNear * 0.75) * (0.5 + vSeed * 0.5));
        }`,
    })
    return { geometry: g, material: m }
  }, [count])
  const dpr = useThree((s) => s.viewport.dpr)
  useFrame((state) => {
    material.uniforms.uTime!.value = anim.still ? 0 : state.clock.elapsedTime
    material.uniforms.uPx!.value = dpr * 1.6
    material.uniforms.uBright!.value = Math.min(1.4, 0.06 + anim.gapLight * 0.55 + anim.beam * 0.7 + anim.glow * 0.12) * (0.4 + anim.room * 0.6)
    ;(material.uniforms.uColor!.value as THREE.Color).copy(anim.glowColor)
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
