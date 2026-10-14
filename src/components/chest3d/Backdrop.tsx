import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ChestAnim } from './animState'
import { asset } from '../../lib/asset'

// Turns the panorama so the cellar's slit window sits behind the chest, a little to the right.
const ROTATION_Y = 1.75

/**
 * The room around the chest: the stone-vaulted cellar of Castle Zavelstein ("Castle Zavelstein
 * Cellar" by Andreas Mischok, Poly Haven, CC0), darkened, warmed toward torchlight and softly
 * blurred so it reads as depth, never as a photo. It dims with the room light, so a blackout
 * takes the castle away with everything else.
 */
export function CastleBackdrop({ anim, strength = 0.3 }: { anim: ChestAnim; strength?: number }) {
  const tex = useTexture(asset('/env/castle-cellar.webp'))
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    const prev = scene.background
    scene.background = tex
    scene.backgroundBlurriness = 0.065
    scene.backgroundRotation.set(0, ROTATION_Y, 0)
    return () => {
      scene.background = prev
    }
  }, [tex, scene])
  useFrame(() => {
    // The beam's glare and a blackout both swallow the room.
    scene.backgroundIntensity = strength * (0.06 + 0.94 * anim.room) * (1 - Math.min(anim.beam, 1) * 0.3)
  })
  return null
}
