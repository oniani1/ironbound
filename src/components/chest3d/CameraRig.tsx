import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

interface Props {
  anim: ChestAnim
  /** Follow the pointer a little (landing hero). */
  parallax?: boolean
  /** Extra distance multiplier, e.g. for small inline previews. */
  distance?: number
}

/**
 * Damped camera that composes the shot from the animation state: base framing by viewport
 * shape, a slow push-in while the seal is charged, a tilt up to follow the item, handheld
 * drift and shake.
 */
export function CameraRig({ anim, parallax = false, distance = 1 }: Props) {
  const { camera, size, pointer } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.45, 0))
  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const t = state.clock.elapsedTime
    const aspect = size.width / Math.max(1, size.height)
    const portrait = aspect < 0.85
    const cam = camera as THREE.PerspectiveCamera
    const fov = portrait ? 44 : aspect < 1.25 ? 38 : 32
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    const baseDist = (portrait ? 4.15 : aspect < 1.25 ? 3.6 : 3.15) * distance
    const wide = !portrait && aspect >= 1.25
    // Shot composition. On the reveal the item must fit: whole screen height on wide
    // layouts (card on the right), the band above the bottom sheet on narrow ones.
    const dolly = anim.dolly
    const frame = anim.frame
    const sheet = size.width < 768
    const tanHalf = Math.tan(((fov * Math.PI) / 180) / 2)
    // Phones: fit the item in the measured band between the top bar and the result sheet,
    // with 24 px of clearance from the sheet.
    const bandTop = Math.min(0.2, 92 / size.height)
    const bandBottom = Math.max(bandTop + 0.2, 1 - anim.sheet - 24 / size.height)
    const bandFrac = bandBottom - bandTop
    const bandCenter = (bandTop + bandBottom) / 2
    const needH = sheet ? (anim.focusH + 0.1) / (2 * bandFrac * tanHalf) : (anim.focusH * 0.78 + 0.16) / tanHalf
    // Wide pieces must also fit across: the full width on phones, the left 55% beside the card.
    const needW = (anim.focusW * 0.5 + 0.12) / (tanHalf * aspect * (sheet ? 0.92 : 0.55))
    const need = Math.max(needH, needW)
    const revealDist = Math.max(sheet ? 2.6 : 2.9, need)
    const halfH = revealDist * tanHalf
    const revealLook = sheet ? anim.focusY - (0.5 - bandCenter) * 2 * halfH : anim.focusY
    // Phones: the waiting chest sits higher, nearer the seal control under it.
    const lift = portrait ? 0.24 * (1 - frame) : 0
    let dist = baseDist - dolly * 0.55 + frame * (revealDist - baseDist)
    let lookY = 0.45 - lift - dolly * 0.03 + frame * (revealLook - 0.45)
    let height = 1.05 - lift - dolly * 0.12 + frame * (revealLook + 0.25 - 1.05)
    let offsetX = wide && !sheet ? frame * anim.cardSide * Math.min(0.75, halfH * aspect * 0.42) : 0
    // Macro: close on the piece, travelling along it as anim.along runs 0 to 1. Tall pieces
    // are read top to bottom (hilt or crest first), wide ones left to right.
    const m = anim.macro * frame
    if (m > 0) {
      const tall = anim.focusH >= anim.focusW * 1.1
      const reach = 0.42
      const close = Math.min(1.3, Math.max(0.55, Math.max(anim.focusH, anim.focusW) * 0.75))
      const macroLook = tall ? anim.focusY + anim.focusH * (reach - anim.along * reach * 2) : anim.focusY
      const macroX = tall ? 0 : anim.focusW * (-reach + anim.along * reach * 2)
      dist += (close - dist) * m
      lookY += (macroLook - lookY) * m
      height += (macroLook + 0.04 - height) * m
      offsetX += (macroX - offsetX) * m
    }
    // Inspect zoom: move in on the piece and look along it.
    const z = anim.zoom * frame
    if (z > 0) {
      const zoomLook = anim.focusY + anim.panY * anim.focusH
      dist += (Math.max(0.8, revealDist * 0.3) - dist) * z
      lookY += (zoomLook - lookY) * z
      height += (zoomLook + 0.04 - height) * z
      offsetX *= 1 - z
    }
    if (anim.hero) {
      // Chest and displayed piece framed together, from the plinth to the tip of the blade.
      const top = anim.focusY + anim.focusH / 2
      lookY = top / 2 + 0.02
      dist = Math.max(baseDist, (top / 2 + 0.32) / tanHalf, (0.75 + 0.1) / (tanHalf * aspect))
      height = lookY + 0.42
    }
    const still = anim.still
    const px = parallax && !still ? pointer.x * 0.25 : 0
    const py = parallax && !still ? pointer.y * 0.12 : 0
    const driftX = still ? 0 : Math.sin(t * 0.37) * 0.025 + Math.sin(t * 0.91) * 0.01
    const driftY = still ? 0 : Math.sin(t * 0.53) * 0.018
    const shake = still ? 0 : anim.shake
    const sx = shake * (Math.sin(t * 71.3) * 0.6 + Math.sin(t * 113.7) * 0.4) * 0.05
    const sy = shake * (Math.sin(t * 89.1) * 0.6 + Math.sin(t * 127.3) * 0.4) * 0.05
    // Arrival: the camera starts high and far and cranes down to the framing.
    const crane = anim.crane
    height += crane * 1.7
    dist += crane * 1.3
    lookY += crane * 0.12
    pos.set(offsetX + px + driftX + sx, height + py + driftY + sy, dist)
    // The tease drifts slowly around the chest, which stays at the origin.
    if (anim.orbit) {
      const c = Math.cos(anim.orbit)
      const s = Math.sin(anim.orbit)
      const x = pos.x
      pos.x = x * c + pos.z * s
      pos.z = -x * s + pos.z * c
    }
    look.set(offsetX + sx * 0.4, lookY + sy * 0.4, 0)
    // Reduced motion: cut to the framing instead of easing toward it.
    const k = still ? 1 : 1 - Math.exp(-dt * 4.5)
    camera.position.lerp(pos, k)
    target.current.lerp(look, k)
    camera.lookAt(target.current)
  })
  return null
}
