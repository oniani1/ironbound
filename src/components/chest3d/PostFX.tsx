import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import type { ChestAnim } from './animState'

/**
 * The bloom's first pass reads the scene. A single NaN or infinite pixel there is spread by
 * the blur across the whole canvas and shows as a black frame, so its input is cleaned:
 * non-finite values become 0 and the rest is capped. The scene shaders avoid producing such
 * values; this keeps one stray pixel from ever blanking the screen.
 */
function guardBloomInput(effect: BloomEffect) {
  const mat = effect.luminancePass.fullscreenMaterial as THREE.ShaderMaterial
  const read = 'vec4 texel=texture2D(inputBuffer,vUv);'
  if (mat.userData.guarded || !mat.fragmentShader.includes(read)) return
  // isnan and isinf exist from GLSL ES 3.0; on WebGL 1 the cap alone has to do.
  const guard = '\n#if __VERSION__ >= 300\ntexel=any(isnan(texel))||any(isinf(texel))?vec4(0.0):clamp(texel,0.0,64.0);\n#else\ntexel=clamp(texel,0.0,64.0);\n#endif\n'
  mat.fragmentShader = mat.fragmentShader.replace(read, read + guard)
  mat.userData.guarded = true
  mat.needsUpdate = true
}

export function PostFX({ anim, base = 0.85, msaa = 0 }: { anim: ChestAnim; base?: number; msaa?: number }) {
  const bloom = useRef<BloomEffect>(null)
  const chroma = useRef<ChromaticAberrationEffect>(null)
  const offset = useRef(new THREE.Vector2(0, 0))
  useFrame(() => {
    // Dev only: the effects, for flicker experiments.
    if (import.meta.env.DEV) Object.assign(window, { __bloom: bloom.current, __chroma: chroma.current })
    if (bloom.current) guardBloomInput(bloom.current)
    // The close-up fills the frame with bright steel; full bloom would haze all of it.
    if (bloom.current) bloom.current.intensity = (base + anim.bloom * 0.8 + anim.beam * 0.15) * (1 - anim.macro * anim.frame * 0.55)
    const a = anim.aberration * 0.006
    offset.current.set(a, a * 0.6)
    if (chroma.current) chroma.current.offset = offset.current
  })
  return (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={base} luminanceThreshold={0.72} luminanceSmoothing={0.2} radius={0.72} />
      <ChromaticAberration ref={chroma} offset={offset.current} radialModulation modulationOffset={0.25} blendFunction={BlendFunction.NORMAL} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
