import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestAnim } from './animState'
import { asset } from '../../lib/asset'
import { Quiet } from './Quiet'

const STONE = { map: asset('/textures/hall/stone_diff.webp'), normal: asset('/textures/hall/stone_nor.webp') }

/** Dressed stone for the altar, from the hall's own texture set. */
function useAltarStone() {
  const tex = useTexture(STONE)
  return useMemo(() => {
    const map = tex.map.clone()
    const normal = tex.normal.clone()
    for (const t of [map, normal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(1, 1)
      t.anisotropy = 8
      t.needsUpdate = true
    }
    map.colorSpace = THREE.SRGBColorSpace
    return { map, normal }
  }, [tex])
}

/** The altar in its dressed stone. */
function StonePlinth({ anim }: { anim: ChestAnim }) {
  const stone = useAltarStone()
  return <Plinth anim={anim} stone={stone} />
}

/** Worn round dais with bevelled edges and an engraved ring that catches the chest's light. */
function Plinth({ anim, stone }: { anim: ChestAnim; stone?: { map: THREE.Texture; normal: THREE.Texture } }) {
  const geometry = useMemo(() => {
    const p = (r: number, y: number) => new THREE.Vector2(r, y)
    const profile = [
      p(0, -0.36), p(0.98, -0.36), p(1.0, -0.345), p(1.0, -0.11), p(0.985, -0.095), p(0.95, -0.09),
      p(0.95, -0.05), p(0.935, -0.035), p(0.92, -0.03), p(0.92, -0.012), p(0.905, 0), p(0, 0),
    ]
    const g = new THREE.LatheGeometry(profile, 72)
    g.computeVertexNormals()
    // Lathe UVs run along the profile, which smears the stone into spokes on the top. The top
    // gets flat XZ coordinates (about a metre per tile), the sides wrap around and up.
    const pos = g.attributes.position as THREE.BufferAttribute
    const nor = g.attributes.normal as THREE.BufferAttribute
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      if (nor.getY(i) > 0.7) uv.setXY(i, x * 0.35 + 0.5, z * 0.35 + 0.5)
      else uv.setXY(i, ((Math.atan2(z, x) / (Math.PI * 2) + 0.5) * Math.PI * 2) / 3, y / 3)
    }
    uv.needsUpdate = true
    return g
  }, [])
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    ringMat.color.copy(anim.glowColor).multiplyScalar(0.25 + Math.min(anim.glow, 2) * 0.45 + anim.beam * 0.6)
    ringMat.opacity = 0.18 + anim.glow * 0.12 + anim.beam * 0.35 + Math.sin(t * 1.6) * 0.03
  })
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial map={stone?.map ?? null} normalMap={stone?.normal ?? null} normalScale={[0.3, 0.3]} color="#6f665d" roughness={0.9} metalness={0} envMapIntensity={0.25} />
      </mesh>
      <mesh ref={ring} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.78, 0.8, 96]} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.84, 0.845, 96]} />
      </mesh>
    </group>
  )
}

export function Stage({ anim, plinth = true, floor = true }: { anim: ChestAnim; plinth?: boolean; floor?: boolean }) {
  const floorUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#1a1410') } }), [])
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.SpotLight>(null)
  const rim = useRef<THREE.SpotLight>(null)
  // Room light: the arrival brings it up, a blackout takes it almost to nothing.
  useFrame((state) => {
    const r = anim.room
    if (ambient.current) ambient.current.intensity = 0.12 * r
    if (key.current) key.current.intensity = 30 * (0.12 + r * 0.88)
    if (rim.current) rim.current.intensity = 10 * r
    state.scene.environmentIntensity = 1.2 * (0.1 + r * 0.9)
  })
  return (
    <>
      <ambientLight ref={ambient} intensity={0.12} color="#ffe2c4" />
      {/* Key: a soft warm light from the front, so the chest reads against the dark hall. */}
      <spotLight ref={key} position={[1.6, 3.6, 2.4]} angle={0.42} penumbra={0.9} intensity={30} distance={12} decay={1.6} color="#ffd9ad" />
      {/* Warm rim from behind, on the side away from the sun, to keep the silhouette. */}
      <spotLight ref={rim} position={[2.4, 2.6, -2.8]} angle={0.5} penumbra={1} intensity={10} distance={10} color="#ffe0bb" />
      <Environment resolution={128} frames={1} environmentIntensity={1.2}>
        <Lightformer form="rect" intensity={1.5} color="#ffd2a0" position={[0, 4, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffe6c4" position={[0.5, 1.6, 4]} scale={[6, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffcf9a" position={[-4, 2.5, -2]} rotation-y={Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="ring" intensity={0.7} color="#ffe2b8" position={[0, 2, 4]} scale={1.5} />
      </Environment>
      {plinth && (
        <Quiet fallback={<Plinth anim={anim} />}>
          <StonePlinth anim={anim} />
        </Quiet>
      )}
      {/* Floor fades into darkness with a radial falloff (used where the hall is not drawn). */}
      {floor && (
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
      )}
      <ContactShadows position={[0, 0.002, 0]} opacity={0.55} scale={2.4} blur={3.2} far={1} resolution={512} color="#000000" />
    </>
  )
}
