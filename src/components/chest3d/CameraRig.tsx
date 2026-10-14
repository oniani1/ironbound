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
    // Phones: free band between the top bar (about 11%) and the sheet (about 45%).
    const needH = sheet ? (anim.focusH + 0.1) / (0.56 * tanHalf) : (anim.focusH * 0.78 + 0.16) / tanHalf
    // Wide pieces must also fit across: the full width on phones, the left 55% beside the card.
    const needW = (anim.focusW * 0.5 + 0.12) / (tanHalf * aspect * (sheet ? 0.92 : 0.55))
    const need = Math.max(needH, needW)
    const revealDist = Math.max(sheet ? 2.6 : 2.9, need)
    const halfH = revealDist * tanHalf
    const revealLook = sheet ? anim.focusY - halfH * 0.49 : anim.focusY
    let dist = baseDist - dolly * 0.55 + frame * (revealDist - baseDist)
    let lookY = 0.45 - dolly * 0.03 + frame * (revealLook - 0.45)
    let height = 1.05 - dolly * 0.12 + frame * (revealLook + 0.25 - 1.05)
    let offsetX = wide && !sheet ? frame * Math.min(0.75, halfH * aspect * 0.42) : 0
    // Macro: close on the upper third of the piece (hilt, visor, maker's mark), centered.
    const m = anim.macro * frame
    if (m > 0) {
      const macroLook = anim.focusY + anim.focusH * 0.26
      dist += (Math.max(1.1, revealDist * 0.46) - dist) * m
      lookY += (macroLook - lookY) * m
      height += (macroLook + 0.04 - height) * m
      offsetX *= 1 - m
    }
    if (anim.hero) {
      // Chest and displayed piece framed together, from the plinth to the tip of the blade.
      const top = anim.focusY + anim.focusH / 2
      lookY = top / 2 + 0.02
      dist = Math.max(baseDist, (top / 2 + 0.32) / tanHalf, (0.75 + 0.1) / (tanHalf * aspect))
      height = lookY + 0.42
    }
    const px = parallax ? pointer.x * 0.25 : 0
    const py = parallax ? pointer.y * 0.12 : 0
    const driftX = Math.sin(t * 0.37) * 0.025 + Math.sin(t * 0.91) * 0.01
    const driftY = Math.sin(t * 0.53) * 0.018
    const shake = anim.shake
    const sx = shake * (Math.sin(t * 71.3) * 0.6 + Math.sin(t * 113.7) * 0.4) * 0.05
    const sy = shake * (Math.sin(t * 89.1) * 0.6 + Math.sin(t * 127.3) * 0.4) * 0.05
    pos.set(offsetX + px + driftX + sx, height + py + driftY + sy, dist)
    look.set(offsetX + sx * 0.4, lookY + sy * 0.4, 0)
    const k = 1 - Math.exp(-dt * 4.5)
    camera.position.lerp(pos, k)
    target.current.lerp(look, k)
    camera.lookAt(target.current)
  })
  return null
}
