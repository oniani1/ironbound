import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestTheme, Item } from '../../types'
import type { ChestAnim } from './animState'
import { ChestModel } from './ChestModel'
import { CameraRig } from './CameraRig'
import { LootBeam, Shockwave, Sparks } from './Effects3D'
import { ItemRise } from './ItemRise'
import { PostFX } from './PostFX'
import { Stage } from './Stage'

/** Resolves a CSS color (any syntax the browser knows, including oklch) to a hex string. */
export function cssColorToHex(cssVar: string, fallback = '#0b0806') {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  if (!raw) return fallback
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const g = c.getContext('2d')
  if (!g) return fallback
  g.fillStyle = fallback
  g.fillStyle = raw
  g.fillRect(0, 0, 1, 1)
  const d = g.getImageData(0, 0, 1, 1).data
  return `#${[d[0], d[1], d[2]].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')}`
}

/** Dev only: exposes the scene and animation state for Playwright inspection. */
function DebugHandle({ anim }: { anim: ChestAnim }) {
  const state = useThree()
  useEffect(() => {
    const w = window as unknown as { __r3f?: unknown; __anim?: unknown }
    w.__r3f = state
    w.__anim = anim
  }, [state, anim])
  return null
}

interface Props {
  theme: ChestTheme
  anim: ChestAnim
  item?: Item | null
  rarityHex?: string
  parallax?: boolean
  plinth?: boolean
  fx?: boolean
  className?: string
  distance?: number
  frameloop?: 'always' | 'never' | 'demand'
  /** Transparent still for card art: no background, floor, plinth or post effects. */
  render?: boolean
}

export function ChestScene({ theme, anim, item, rarityHex = '#ffc94d', parallax, plinth = true, fx = true, className, distance, frameloop = 'always', render = false }: Props) {
  const bg = useMemo(() => cssColorToHex('--color-ink-950'), [])
  return (
    <Canvas
      className={className}
      shadows
      frameloop={frameloop}
      dpr={[1, 1.75]}
      gl={render ? { antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping } : { antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={render ? { fov: 26, position: [1.25, 1.0, 2.75], near: 0.05, far: 40 } : { fov: 32, position: [0, 1.05, 3.15], near: 0.05, far: 40 }}
      onCreated={render ? ({ camera }) => camera.lookAt(0, 0.3, 0) : undefined}
    >
      {!render && <color attach="background" args={[bg]} />}
      {!render && <fog attach="fog" args={[bg, 4.5, 11]} />}
      <Suspense fallback={null}>
        <Stage anim={anim} plinth={plinth && !render} floor={!render} />
        <ChestModel theme={theme} anim={anim} />
        <LootBeam anim={anim} />
        <Shockwave anim={anim} />
        {!render && <Sparks anim={anim} />}
      </Suspense>
      {item && (
        <Suspense fallback={null}>
          <ItemRise key={item.id} item={item} anim={anim} color={rarityHex} />
        </Suspense>
      )}
      {!render && <CameraRig anim={anim} parallax={parallax} distance={distance} />}
      {fx && !render && <PostFX anim={anim} />}
      {import.meta.env.DEV && <DebugHandle anim={anim} />}
    </Canvas>
  )
}
