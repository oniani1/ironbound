import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestTheme } from '../../types'
import type { ChestAnim } from './animState'

const URL = '/models/chest.glb'
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
  return { clone, hinge, lock: lockObj, lockBase: lockObj ? lockObj.position.clone() : new THREE.Vector3(), lockMat }
}

export function ChestModel({ theme, anim }: Props) {
  const { scene } = useGLTF(URL)
  const seam = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const root = useRef<THREE.Group>(null)
  const rigged = useMemo(() => rig(scene, theme), [scene, theme])
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
    const idleCrack = anim.idle * (0.018 + Math.sin(t * 1.3) * 0.008)
    hinge.rotation.x = -(anim.lid * LID_OPEN + Math.max(0, rattle) * 0.06 + idleCrack)
    if (root.current) {
      root.current.rotation.z = anim.rattle * Math.sin(t * 43) * 0.014
      root.current.position.x = anim.rattle * Math.sin(t * 57) * 0.007
      root.current.position.y = (1 - anim.drop) * 1.8
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
  )
}

useGLTF.preload(URL)
