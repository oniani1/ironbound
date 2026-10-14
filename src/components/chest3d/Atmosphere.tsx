import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

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
