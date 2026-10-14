import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { asset } from '../../lib/asset'

let pending: Promise<GLTF> | null = null

/**
 * Artifact builds: locked-down hosts refuse .glb files, blob: URLs and WebAssembly. There
 * the chest ships as a base64 module with plain geometry and separate .webp textures,
 * written by scripts/artifact-page.mjs, and is parsed in memory.
 */
export function loadInlineChest(): Promise<GLTF> {
  pending ??= (async () => {
    const url = new URL(asset('/models/chest.js'), document.baseURI).href
    const mod = (await import(/* @vite-ignore */ url)) as { default: string }
    const bin = atob(mod.default)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new GLTFLoader().parseAsync(bytes.buffer, new URL(asset('/models/'), document.baseURI).href)
  })()
  return pending
}
