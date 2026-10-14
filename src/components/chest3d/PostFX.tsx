import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

export function PostFX({ anim, base = 0.85 }: { anim: ChestAnim; base?: number }) {
  const bloom = useRef<BloomEffect>(null)
  const chroma = useRef<ChromaticAberrationEffect>(null)
  const offset = useRef(new THREE.Vector2(0, 0))
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = base + anim.bloom * 0.8 + anim.beam * 0.15
    const a = anim.aberration * 0.006
    offset.current.set(a, a * 0.6)
    if (chroma.current) chroma.current.offset = offset.current
  })
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={base} luminanceThreshold={0.72} luminanceSmoothing={0.2} radius={0.72} />
      <ChromaticAberration ref={chroma} offset={offset.current} radialModulation modulationOffset={0.25} blendFunction={BlendFunction.NORMAL} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
