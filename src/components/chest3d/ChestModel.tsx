import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestTheme } from '../../types'
import type { ChestAnim } from './animState'
import { asset } from '../../lib/asset'

const URL = asset('/models/chest.glb')
/** Hinge line of the lid in model space (from the source asset, before quantization). */
const HINGE = new THREE.Vector3(0, 0.4205, -0.2571)
const LID_OPEN = 1.92

interface Props {
  theme: ChestTheme
  anim: ChestAnim
}

/** Tints wood and metal separately using the metalness channel as a mask. */
function themedMaterial(base: THREE.MeshStandardMaterial, theme: ChestTheme, key: string) {
  const m = base.clone()
  const uniforms = {
    uWood: { value: new THREE.Color(theme.wood) },
    uWoodSat: { value: theme.woodSat ?? 0.8 },
    uWoodGain: { value: theme.woodGain ?? 1.2 },
    uWoodRough: { value: theme.woodRough ?? 1 },
    uMetal: { value: new THREE.Color(theme.metal) },
    uMetalness: { value: theme.metalness },
    uRough: { value: theme.roughness },
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uWood;
uniform float uWoodSat;
uniform float uWoodGain;
uniform float uWoodRough;
uniform vec3 uMetal;
uniform float uMetalness;
uniform float uRough;`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
float metalMask = smoothstep(0.3, 0.7, metalnessFactor);
float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 woodCol = mix(vec3(lum), diffuseColor.rgb, uWoodSat) * uWood * uWoodGain;
vec3 metalCol = uMetal * (0.5 + 1.1 * lum);
diffuseColor.rgb = mix(woodCol, metalCol, metalMask);
metalnessFactor = mix(0.0, uMetalness, metalMask);
roughnessFactor = mix(clamp(roughnessFactor * uWoodRough, 0.08, 1.0), clamp(roughnessFactor * uRough, 0.12, 1.0), metalMask);`,
      )
  }
  m.customProgramCacheKey = () => key
  return m
}

/** Clones the asset and rigs it: lid on a hinge pivot, lock with its own glowing material. */
function rig(scene: THREE.Object3D, theme: ChestTheme) {
  const clone = scene.clone(true)
  let lid: THREE.Object3D | null = null
  let lock: THREE.Mesh | null = null
  let baseMat: THREE.MeshStandardMaterial | null = null
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
      baseMat ??= mesh.material as THREE.MeshStandardMaterial
    }
    if (o.name === 'treasure_chest_lid') lid = o
    if (o.name === 'treasure_chest_lock') lock = mesh
  })
  const key = `chest-${JSON.stringify(theme)}`
  const mat = baseMat ? themedMaterial(baseMat, theme, key) : new THREE.MeshStandardMaterial()
  const lockMat = themedMaterial(baseMat ?? mat, theme, `${key}-lock`)
  lockMat.emissive = new THREE.Color('#ff5a1a')
  lockMat.emissiveIntensity = 0
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.material = o === lock ? lockMat : mat
  })
  const hinge = new THREE.Group()
  hinge.position.copy(HINGE)
  const lidObj = lid as THREE.Object3D | null
  if (lidObj) {
    lidObj.removeFromParent()
    lidObj.position.sub(HINGE)
    hinge.add(lidObj)
  }
  const lockObj = lock as THREE.Mesh | null
  const ornament = buildOrnament(theme)
  if (ornament) hinge.add(ornament)
  return { clone, hinge, lock: lockObj, lockBase: lockObj ? lockObj.position.clone() : new THREE.Vector3(), lockMat }
}

/**
 * Construction by tier, in chest space (body about 0.9 wide, 0.53 deep, lid hinge at 0.42).
 * scale reshapes the whole chest; lift raises it onto what it stands on.
 */
const FORMS: Record<NonNullable<ChestTheme['form']>, { scale: [number, number, number]; lift: number }> = {
  coffer: { scale: [0.84, 0.82, 0.84], lift: 0 },
  strongbox: { scale: [1, 1, 1], lift: 0.036 },
  lacquer: { scale: [1.06, 0.84, 0.92], lift: 0.06 },
  hoard: { scale: [1.14, 1.02, 1.1], lift: 0 },
  reliquary: { scale: [0.94, 1.1, 0.94], lift: 0.085 },
}

/** What the chest stands on and carries by: built in root space, under the scaled body. */
function buildBase(theme: ChestTheme): THREE.Object3D | null {
  const form = theme.form
  if (!form) return null
  const f = FORMS[form]
  const [sx, sy, sz] = f.scale
  const halfW = 0.45 * sx
  const halfD = 0.265 * sz
  const g = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: theme.metal, metalness: 1, roughness: 0.38 })
  const iron = new THREE.MeshStandardMaterial({ color: '#2b2622', metalness: 0.85, roughness: 0.5 })
  if (form === 'coffer') {
    // Rope carry loops on both ends: a field chest, not a treasury.
    const rope = new THREE.MeshStandardMaterial({ color: '#8a6a43', roughness: 1, metalness: 0 })
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 10, 28), rope)
      loop.rotation.y = Math.PI / 2
      loop.position.set(s * (halfW + 0.004), 0.25 * sy, 0)
      g.add(loop)
    }
  } else if (form === 'strongbox') {
    // Iron-shod runners under the base and drop handles on the ends.
    const wood = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.9 })
    for (const x of [-0.3, 0.3]) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.07, f.lift, halfD * 2 + 0.06), wood)
      runner.position.set(x, f.lift / 2, 0)
      g.add(runner)
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.008, halfD * 2 + 0.064), iron)
      shoe.position.set(x, 0.004, 0)
      g.add(shoe)
    }
    for (const s of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 10, 24, Math.PI), metal)
      handle.rotation.set(0, Math.PI / 2, Math.PI)
      handle.position.set(s * (halfW + 0.012), f.lift + 0.3 * sy, 0)
      g.add(handle)
    }
  } else if (form === 'lacquer') {
    // A low black-lacquer stand with a gilt edge.
    const lacquer = new THREE.MeshStandardMaterial({ color: '#120c0a', roughness: 0.18, metalness: 0.1 })
    const stand = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.1, f.lift - 0.012, halfD * 2 + 0.1), lacquer)
    stand.position.y = (f.lift - 0.012) / 2 + 0.012
    g.add(stand)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.104, 0.008, halfD * 2 + 0.104), metal)
    edge.position.y = f.lift - 0.004
    g.add(edge)
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.06), lacquer)
        foot.position.set(x * (halfW + 0.02), 0.006, z * (halfD + 0.02))
        g.add(foot)
      }
    }
  } else if (form === 'hoard') {
    // Heavy iron ring handles: a chest built to be dragged off a field.
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), iron)
      plate.rotation.z = Math.PI / 2
      plate.position.set(s * (halfW + 0.004), 0.33 * sy, 0)
      g.add(plate)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 28), iron)
      ring.rotation.y = Math.PI / 2
      ring.position.set(s * (halfW + 0.014), 0.27 * sy, 0)
      g.add(ring)
    }
  } else if (form === 'reliquary') {
    // Raised on four gilt ball feet, like a church reliquary.
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 14), metal)
        ball.position.set(x * (halfW - 0.05), 0.042, z * (halfD - 0.04))
        g.add(ball)
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.02, 18), metal)
        collar.position.set(x * (halfW - 0.05), f.lift - 0.01, z * (halfD - 0.04))
        g.add(collar)
      }
    }
  }
  g.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })
  return g
}

/**
 * Tier ornaments, in hinge-local space (origin on the hinge line; the lid's crown sits
 * around y 0.2, z 0.26; its front edge around z 0.52).
 */
function buildOrnament(theme: ChestTheme): THREE.Object3D | null {
  if (!theme.ornament) return null
  const g = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: theme.metal, metalness: 1, roughness: 0.32 })
  if (theme.ornament === 'crown') {
    g.position.set(0, 0.196, 0.26)
    g.scale.setScalar(1.25)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.035, 28, 1, true), metal)
    band.material = metal.clone()
    ;(band.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    band.position.y = 0.018
    g.add(band)
    const jewel = new THREE.MeshStandardMaterial({ color: '#c3122a', emissive: '#ff2a3a', emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.15 })
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.055, 10), metal)
      spike.position.set(Math.cos(a) * 0.072, 0.06, Math.sin(a) * 0.072)
      g.add(spike)
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), jewel)
      gem.position.set(Math.cos(a) * 0.072, 0.093, Math.sin(a) * 0.072)
      g.add(gem)
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), jewel)
    center.position.set(0, 0.03, 0.08)
    g.add(center)
  } else if (theme.ornament === 'tassel') {
    // A vermilion silk knot and tassel tied at the front of the lid.
    g.position.set(0, 0.035, 0.528)
    const silk = new THREE.MeshStandardMaterial({ color: '#c8281e', roughness: 0.75, metalness: 0 })
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.018, 0.007, 48, 8, 2, 3), silk)
    g.add(knot)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.016, 16), metal)
    cap.position.y = -0.03
    g.add(cap)
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 18, 1, true), silk)
    tassel.material = silk.clone()
    ;(tassel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide
    tassel.rotation.x = Math.PI
    tassel.position.y = -0.085
    g.add(tassel)
  } else if (theme.ornament === 'spikes') {
    // Iron studs along the crown of the lid.
    const iron = new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.9, roughness: 0.45 })
    for (const x of [-0.33, -0.11, 0.11, 0.33]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.012, 14), metal)
      base.position.set(x, 0.198, 0.26)
      g.add(base)
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 12), iron)
      spike.position.set(x, 0.232, 0.26)
      g.add(spike)
    }
  }
  g.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.castShadow = true
  })
  return g
}

export function ChestModel({ theme, anim }: Props) {
  const { scene } = useGLTF(URL)
  const seam = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const root = useRef<THREE.Group>(null)
  const rigged = useMemo(() => rig(scene, theme), [scene, theme])
  const form = theme.form ? FORMS[theme.form] : null
  const base = useMemo(() => buildBase(theme), [theme])
  const heatColor = useMemo(() => new THREE.Color(), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  // Pool of light inside the chest: radial falloff with a slow shimmer, not a flat card.
  const innerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color() }, uA: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uA; uniform float uTime; varying vec2 vUv;
          void main(){
            vec2 p = (vUv - 0.5) * vec2(1.0, 1.9);
            float d = length(p) * 2.0;
            float core = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
            float shimmer = 0.85 + 0.15 * sin(uTime * 2.3 + vUv.x * 9.0) * sin(uTime * 1.7 + vUv.y * 7.0);
            float a = core * uA * shimmer;
            gl_FragColor = vec4(uColor * (0.9 + core * 0.8), a);
          }`,
      }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { hinge, lock, lockBase, lockMat } = rigged
    // Lid: opening plus a high-frequency rattle while the seal strains.
    const rattle = anim.rattle * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97) * 0.4)
    const idleCrack = anim.idle * (0.018 + (anim.still ? 0 : Math.sin(t * 1.3) * 0.008))
    hinge.rotation.x = -(anim.lid * LID_OPEN + Math.max(0, rattle) * 0.06 + idleCrack)
    if (root.current) {
      root.current.rotation.z = anim.rattle * Math.sin(t * 43) * 0.014
      root.current.position.x = anim.rattle * Math.sin(t * 57) * 0.007
      root.current.position.y = (1 - anim.drop) * 1.8 + (form?.lift ?? 0)
    }
    if (lock) {
      const off = anim.lockOff
      lock.position.set(lockBase.x + off * 0.14, lockBase.y - off * off * 1.2, lockBase.z + off * 0.4)
      lock.rotation.set(off * 2.6, 0, off * -1.4)
      lock.visible = off < 0.98
    }
    const h = anim.heat
    heatColor.setRGB(1, 0.22 + h * 0.6, 0.04 + h * h * 0.75)
    lockMat.emissive.copy(heatColor)
    lockMat.emissiveIntensity = h * h * 7
    // Interior light and seam glow follow the rarity color.
    const open = anim.lid
    const glow = anim.glow
    if (light.current) {
      light.current.color.copy(anim.glowColor)
      light.current.intensity = Math.min(glow, 2) * (0.8 + open * 3.4)
      light.current.distance = 2.2 + open * 2.5
    }
    if (seam.current) {
      const m = seam.current.material as THREE.MeshBasicMaterial
      tmp.copy(anim.glowColor).multiplyScalar(0.9 + Math.min(glow, 2) * 1.1)
      m.color.copy(tmp)
      m.opacity = Math.min(0.85, glow * (0.45 + 0.35 * Math.sin(t * 3.1) ** 2)) * Math.max(0, 1 - open * 2.5)
    }
    innerMat.uniforms.uTime!.value = t
    ;(innerMat.uniforms.uColor!.value as THREE.Color).copy(anim.glowColor).multiplyScalar(0.6 + Math.min(glow, 2.4) * 0.55)
    innerMat.uniforms.uA!.value = Math.min(1, glow * 0.7) * Math.min(1, open * 3 + anim.idle * 0.05)
  })

  return (
    <group ref={root} dispose={null}>
      {base && <primitive object={base} position={[0, -(form?.lift ?? 0), 0]} />}
      <group scale={form?.scale ?? [1, 1, 1]}>
      <primitive object={rigged.clone} />
      <primitive object={rigged.hinge} />
      {/* Thin glowing seam just under the lid edge. */}
      <mesh ref={seam} position={[0, 0.419, 0.2635]}>
        <planeGeometry args={[0.84, 0.007]} />
        <meshBasicMaterial transparent toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Light pooled inside the open chest. */}
      <mesh ref={inner} position={[0, 0.39, 0]} rotation={[-Math.PI / 2, 0, 0]} material={innerMat}>
        <planeGeometry args={[0.86, 0.46]} />
      </mesh>
      <pointLight ref={light} position={[0, 0.52, 0.05]} decay={2} />
      </group>
    </group>
  )
}

useGLTF.preload(URL)
