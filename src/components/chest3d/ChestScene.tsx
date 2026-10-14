import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
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
  // Frame timing measured inside the loop: CPU cost of each render call plus frame deltas.
  useEffect(() => {
    const gl = state.gl
    const w = window as unknown as { __perf?: { render: number[]; delta: number[] } }
    const perf: { render: number[]; delta: number[] } = (w.__perf = { render: [], delta: [] })
    const orig = gl.render.bind(gl)
    let acc = 0
    gl.render = (scene, camera) => {
      const t0 = performance.now()
      orig(scene, camera)
      acc += performance.now() - t0
    }
    let last = performance.now()
    let raf = 0
    const tick = () => {
      const now = performance.now()
      perf.delta.push(now - last)
      perf.render.push(acc)
      acc = 0
      last = now
      if (perf.delta.length > 600) {
        perf.delta.shift()
        perf.render.shift()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      gl.render = orig
    }
  }, [state.gl])
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
  itemGlow?: number
  heroItem?: boolean
}

let webglOk: boolean | null = null
function hasWebGL() {
  if (webglOk !== null) return webglOk
  try {
    const c = document.createElement('canvas')
    webglOk = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglOk = false
  }
  return webglOk
}

/** Without WebGL (old devices, locked-down browsers) the page shows the still chest art instead. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function StillChest({ theme, className }: { theme: ChestTheme; className?: string }) {
  return (
    <div className={`grid place-items-center ${className ?? ''}`} style={{ background: `radial-gradient(50% 40% at 50% 60%, color-mix(in oklch, ${theme.glow} 22%, transparent), transparent)` }}>
      <div className="h-[46%] w-[min(520px,70%)] animate-pulse-soft rounded-[40%_40%_8px_8px]" style={{ background: `linear-gradient(180deg, ${theme.metal}, ${theme.wood})`, boxShadow: `0 0 80px ${theme.glow}` }} />
    </div>
  )
}

export function ChestScene(props: Props) {
  if (typeof window !== 'undefined' && !hasWebGL()) return <StillChest theme={props.theme} className={props.className} />
  return (
    <SceneBoundary fallback={<StillChest theme={props.theme} className={props.className} />}>
      <ChestSceneInner {...props} />
    </SceneBoundary>
  )
}

function ChestSceneInner({ theme, anim, item, rarityHex = '#ffc94d', parallax, plinth = true, fx = true, className, distance, frameloop = 'always', render = false, itemGlow = 1, heroItem = false }: Props) {
  const bg = useMemo(() => cssColorToHex('--color-ink-950'), [])
  // Start sharp, drop resolution if the device cannot hold the frame rate.
  const [dpr, setDpr] = useState(() => Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1.75))
  // Low-density screens alias on the gold trim, so they get 4x MSAA until the frame rate drops.
  const [msaa, setMsaa] = useState(() => (typeof window !== 'undefined' && window.devicePixelRatio < 1.5 ? 4 : 0))
  return (
    <Canvas
      className={className}
      frameloop={frameloop}
      dpr={render ? 1 : dpr}
      gl={render ? { antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping } : { antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={render ? { fov: 26, position: [1.25, 1.0, 2.75], near: 0.05, far: 40 } : { fov: 32, position: [0, 1.05, 3.15], near: 0.05, far: 40 }}
      onCreated={render ? ({ camera }) => camera.lookAt(0, 0.3, 0) : undefined}
    >
      {!render && <PerformanceMonitor
          onDecline={() => {
            setDpr(1)
            setMsaa(0)
          }}
          onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.75))}
        />}
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
          <ItemRise key={item.id} item={item} anim={anim} color={rarityHex} glow={itemGlow} hero={heroItem} />
        </Suspense>
      )}
      {!render && <CameraRig anim={anim} parallax={parallax} distance={distance} />}
      {fx && !render && <PostFX anim={anim} msaa={msaa} />}
      {import.meta.env.DEV && <DebugHandle anim={anim} />}
    </Canvas>
  )
}
