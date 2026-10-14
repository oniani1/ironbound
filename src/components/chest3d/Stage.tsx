import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

/** Procedural stone texture so the plinth reads as carved rock without any downloads. */
function useStoneTexture() {
  return useMemo(() => {
    const size = 256
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    const img = g.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const n =
          Math.sin(x * 0.08 + Math.sin(y * 0.05) * 2) * 0.25 +
          Math.sin(y * 0.11 + Math.cos(x * 0.03) * 3) * 0.2 +
          (Math.random() - 0.5) * 0.35
        const v = 70 + n * 40
        img.data[i] = v * 1.05
        img.data[i + 1] = v * 0.97
        img.data[i + 2] = v * 0.88
        img.data[i + 3] = 255
      }
    }
    g.putImageData(img, 0, 0)
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function Torch({ position, phase, anim }: { position: [number, number, number]; phase: number; anim: ChestAnim }) {
  const light = useRef<THREE.PointLight>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    const flicker = 0.82 + Math.sin(t * 9.3) * 0.06 + Math.sin(t * 23.1) * 0.05 + Math.sin(t * 3.7) * 0.07
    if (light.current) light.current.intensity = 5.5 * flicker * (1 - anim.beam * 0.35)
  })
  return <pointLight ref={light} position={position} color="#ff9b4a" distance={7} decay={1.6} />
}

export function Stage({ anim, plinth = true }: { anim: ChestAnim; plinth?: boolean }) {
  const stone = useStoneTexture()
  const floorUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#1a1410') } }), [])
  return (
    <>
      <ambientLight intensity={0.16} color="#ffd9b0" />
      {/* Key: warm top-front light, the "candle above the vault". */}
      <spotLight
        position={[1.6, 3.6, 2.4]}
        angle={0.42}
        penumbra={0.85}
        intensity={42}
        distance={12}
        decay={1.6}
        color="#ffd6a3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Cool rim from behind to separate the silhouette from the dark. */}
      <spotLight position={[-2.2, 2.6, -2.8]} angle={0.5} penumbra={1} intensity={16} distance={10} color="#9fb4ff" />
      <Torch position={[-2.4, 1.6, -1.2]} phase={0} anim={anim} />
      <Torch position={[2.5, 1.5, -1.4]} phase={2.1} anim={anim} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#ffcf99" position={[0, 4, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ff8a3d" position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#8fa6ff" position={[4, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffe2b8" position={[0, 2, 4]} scale={1.5} />
      </Environment>
      {plinth && (
        <group position={[0, -0.36, 0]}>
          <mesh receiveShadow castShadow position={[0, 0.165, 0]}>
            <cylinderGeometry args={[0.86, 0.94, 0.33, 8, 1]} />
            <meshStandardMaterial map={stone} color="#8c8278" roughness={0.92} metalness={0} />
          </mesh>
          <mesh receiveShadow position={[0, 0.345, 0]}>
            <cylinderGeometry args={[0.8, 0.86, 0.03, 8, 1]} />
            <meshStandardMaterial map={stone} color="#a39686" roughness={0.85} metalness={0} />
          </mesh>
        </group>
      )}
      {/* Floor fades into darkness with a radial falloff. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, plinth ? -0.36 : 0, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <shaderMaterial
          transparent
          uniforms={floorUniforms}
          vertexShader={/* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={/* glsl */ `
            uniform vec3 uColor; varying vec2 vUv;
            void main(){
              float d = length(vUv - 0.5) * 2.0;
              float a = smoothstep(1.0, 0.0, d);
              gl_FragColor = vec4(uColor * (0.6 + 0.6 * (1.0 - d)), a);
            }`}
        />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={2.6} blur={2.4} far={1.2} resolution={512} color="#000000" />
    </>
  )
}
