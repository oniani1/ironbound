import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

/** Vertical shaft of light that erupts from the open chest, tinted by rarity. */
export function LootBeam({ anim }: { anim: ChestAnim }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uStrength: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uStrength;
          varying vec2 vUv;
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          const float TAU = 6.2831853;
          void main() {
            float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
            float core = pow(facing, 3.2);
            float v = vUv.y;
            // Interpolated UVs can land a hair past 1.0 at the rim, and pow() of a negative
            // base is NaN on some GPUs; one NaN pixel, spread by the bloom, blacks out the frame.
            float fadeUp = pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
            float fadeBase = smoothstep(0.0, 0.04, v);
            // Whole numbers of waves around the cylinder: the streaks meet themselves at the
            // UV seam, so no line shows where the geometry closes.
            float a1 = vUv.x * TAU;
            float streaks = 0.5 + 0.25 * sin(a1 * 9.0 + v * 4.0 - uTime * 1.3) + 0.15 * sin(a1 * 17.0 - v * 6.0 + uTime * 0.9) + 0.1 * sin(a1 * 5.0 + uTime * 0.5);
            float a = core * fadeUp * fadeBase * (0.12 + streaks * 0.85) * uStrength * 0.75;
            vec3 col = mix(uColor, vec3(1.0, 0.97, 0.9), core * 0.22) * (0.75 + core * 0.7);
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  )
  useFrame((_, dt) => {
    const u = material.uniforms
    u.uTime!.value += dt
    ;(u.uColor!.value as THREE.Color).copy(anim.beamColor)
    u.uStrength!.value = anim.beam
    if (mesh.current) mesh.current.visible = anim.beam > 0.001
  })
  return (
    <mesh ref={mesh} position={[0, 0.42 + 2.2, 0.02]} renderOrder={10} material={material}>
      <cylinderGeometry args={[0.5, 0.2, 4.4, 48, 1, true]} />
    </mesh>
  )
}

/** Expanding ring of light along the floor when the lid bursts. */
export function Shockwave({ anim }: { anim: ChestAnim }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color() }, uP: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uP;
          varying vec2 vUv;
          void main() {
            // vUv.x runs across the ring width in RingGeometry; soften both edges.
            float r = length(vUv - 0.5) * 2.0;
            float band = smoothstep(0.0, 0.5, 1.0 - abs(r - 0.94) / 0.06);
            float a = pow(clamp(1.0 - uP, 0.0, 1.0), 3.2) * 0.75 * band;
            gl_FragColor = vec4(uColor * 1.4, a);
          }`,
      }),
    [],
  )
  useFrame(() => {
    ;(material.uniforms.uColor!.value as THREE.Color).copy(anim.beamColor)
    material.uniforms.uP!.value = anim.ring
    if (mesh.current) {
      mesh.current.visible = anim.ring > 0.001 && anim.ring < 0.999
      const s = 0.55 + anim.ring * 1.7
      mesh.current.scale.set(s, s, s)
    }
  })
  return (
    <mesh ref={mesh} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5} material={material}>
      <ringGeometry args={[0.84, 1, 96]} />
    </mesh>
  )
}

const SPARK_COUNT = 900

/**
 * CPU particle system for embers and sparks. Idle embers drift up from the chest;
 * bursts requested through anim.emit() fan out with gravity and drag.
 */
export function Sparks({ anim, idleRate = 14 }: { anim: ChestAnim; idleRate?: number }) {
  const points = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const pos = new Float32Array(SPARK_COUNT * 3)
    const col = new Float32Array(SPARK_COUNT * 3)
    const size = new Float32Array(SPARK_COUNT)
    const vel = new Float32Array(SPARK_COUNT * 3)
    const life = new Float32Array(SPARK_COUNT)
    const maxLife = new Float32Array(SPARK_COUNT)
    const drag = new Float32Array(SPARK_COUNT)
    for (let i = 0; i < SPARK_COUNT; i++) pos[i * 3 + 1] = -100
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1))
    return { pos, col, size, vel, life, maxLife, drag, geo, cursor: 0, idleAcc: 0 }
  }, [])
  const ember = useMemo(() => new THREE.Color('#ff9a3c'), [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexColors: true,
        uniforms: { uScale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float size;
          varying vec3 vColor;
          varying float vSize;
          uniform float uScale;
          varying float vNear;
          void main() {
            vColor = color;
            vSize = size;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float z = -mv.z;
            // A spark that drifts up past a close camera would grow without bound (size / z)
            // and flash the frame. Sparks this close are dropped, nearer ones fade, and every
            // size is capped.
            if (z < 0.3) {
              vSize = 0.0;
              vNear = 0.0;
              gl_PointSize = 0.0;
              gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
              return;
            }
            vNear = smoothstep(0.3, 0.9, z);
            gl_PointSize = min(size * uScale * (300.0 / z), 40.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vSize;
          varying float vNear;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float a = smoothstep(0.5, 0.0, d);
            a = a * a * vNear;
            if (vSize <= 0.0) discard;
            gl_FragColor = vec4(min(vColor * (1.5 + a * 2.0) * a, vec3(6.0)), a);
          }`,
      }),
    [],
  )

  function spawn(color: THREE.Color, speed: number, burst: boolean) {
    const i = data.cursor
    data.cursor = (data.cursor + 1) % SPARK_COUNT
    const a = Math.random() * Math.PI * 2
    if (burst) {
      const up = 1.4 + Math.random() * 2.6
      const out = 0.4 + Math.random() * 1.6
      data.pos[i * 3] = (Math.random() - 0.5) * 0.6
      data.pos[i * 3 + 1] = 0.45 + Math.random() * 0.05
      data.pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3
      data.vel[i * 3] = Math.cos(a) * out * speed
      data.vel[i * 3 + 1] = up * speed
      data.vel[i * 3 + 2] = Math.sin(a) * out * speed * 0.7
      data.maxLife[i] = 0.9 + Math.random() * 1.4
      data.drag[i] = 1.4 + Math.random()
      data.size[i] = 0.05 + Math.random() * 0.09
    } else {
      data.pos[i * 3] = (Math.random() - 0.5) * 0.8
      data.pos[i * 3 + 1] = 0.35 + Math.random() * 0.15
      data.pos[i * 3 + 2] = (Math.random() - 0.5) * 0.45
      data.vel[i * 3] = (Math.random() - 0.5) * 0.15
      data.vel[i * 3 + 1] = 0.25 + Math.random() * 0.45
      data.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1
      data.maxLife[i] = 2.5 + Math.random() * 3
      data.drag[i] = 0.2
      data.size[i] = 0.025 + Math.random() * 0.045
    }
    data.life[i] = data.maxLife[i] ?? 1
    const tint = 0.75 + Math.random() * 0.5
    data.col[i * 3] = color.r * tint
    data.col[i * 3 + 1] = color.g * tint
    data.col[i * 3 + 2] = color.b * tint
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    material.uniforms.uScale!.value = state.size.height / 900
    while (anim.bursts.length) {
      const b = anim.bursts.shift()!
      for (let k = 0; k < b.count; k++) spawn(b.color, b.speed, true)
    }
    data.idleAcc += dt * idleRate * (0.3 + anim.glow + anim.heat * 2 + anim.lid * 1.5)
    while (data.idleAcc > 1) {
      data.idleAcc -= 1
      spawn(anim.heat > 0.4 ? ember : anim.lid > 0.2 ? anim.glowColor : ember, 1, false)
    }
    const t = state.clock.elapsedTime
    for (let i = 0; i < SPARK_COUNT; i++) {
      const l = data.life[i] ?? 0
      if (l <= 0) continue
      const nl = l - dt
      data.life[i] = nl
      const k = i * 3
      const d = Math.exp(-(data.drag[i] ?? 0) * dt)
      data.vel[k] = (data.vel[k] ?? 0) * d + Math.sin(t * 2 + i) * 0.02 * dt
      data.vel[k + 1] = (data.vel[k + 1] ?? 0) * d - (data.drag[i]! > 1 ? 2.4 : -0.05) * dt
      data.vel[k + 2] = (data.vel[k + 2] ?? 0) * d
      data.pos[k] = (data.pos[k] ?? 0) + (data.vel[k] ?? 0) * dt
      data.pos[k + 1] = (data.pos[k + 1] ?? 0) + (data.vel[k + 1] ?? 0) * dt
      data.pos[k + 2] = (data.pos[k + 2] ?? 0) + (data.vel[k + 2] ?? 0) * dt
      if (nl <= 0) {
        data.size[i] = 0
        data.pos[k + 1] = -100
      } else {
        const lifeT = nl / (data.maxLife[i] ?? 1)
        data.size[i] = (data.size[i] ?? 0) * (0.985 + lifeT * 0.015)
      }
    }
    const g = data.geo
    ;(g.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(g.attributes.color as THREE.BufferAttribute).needsUpdate = true
    ;(g.attributes.size as THREE.BufferAttribute).needsUpdate = true
  })

  return <points ref={points} geometry={data.geo} material={material} frustumCulled={false} renderOrder={20} />
}
