// Turns the artifact build's index.html into the page fragment the claude.ai Artifact
// publisher expects (no html, head or body tags), repackages the 3D chest for locked-down
// hosts, and lists the supporting files in batches small enough for one publish each.
//
// Usage: VITE_NO_THUMBS=1 node scripts/artifact-page.mjs [dist-artifact] (same env as the build)
// Writes <dir>/ironbound.html and prints the batches as JSON.
import { existsSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const dir = process.argv[2] ?? 'dist-artifact'
const BATCH = 250

/**
 * Artifact hosts serve no .glb, block blob: URLs and refuse WebAssembly. The chest model
 * becomes plain geometry (meshopt decoded here, not in the browser) inside a base64
 * module, and its embedded textures become .webp files loaded like any photo.
 */
async function inlineChest() {
  const glbPath = join(dir, 'models', 'chest.glb')
  if (!existsSync(glbPath)) return
  const b = readFileSync(glbPath)
  const jsonLen = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'))
  const binAt = 20 + jsonLen
  const bin = b.subarray(binAt + 8, binAt + 8 + b.readUInt32LE(binAt))
  await MeshoptDecoder.ready

  const imageViews = new Set()
  json.images = json.images.map((img, i) => {
    const v = json.bufferViews[img.bufferView]
    const start = v.byteOffset ?? 0
    imageViews.add(img.bufferView)
    writeFileSync(join(dir, 'models', `chest-${i}.webp`), bin.subarray(start, start + v.byteLength))
    return { uri: `chest-${i}.webp`, mimeType: img.mimeType }
  })

  const fallback = json.buffers.findIndex((buf) => buf.extensions?.EXT_meshopt_compression?.fallback)
  if (fallback < 0) throw new Error('chest.glb: expected a meshopt fallback buffer')
  const out = Buffer.alloc(json.buffers[fallback].byteLength)
  json.bufferViews.forEach((v, i) => {
    const ext = v.extensions?.EXT_meshopt_compression
    if (ext) {
      const start = ext.byteOffset ?? 0
      const target = new Uint8Array(ext.count * ext.byteStride)
      MeshoptDecoder.decodeGltfBuffer(target, ext.count, ext.byteStride, bin.subarray(start, start + ext.byteLength), ext.mode, ext.filter ?? 'NONE')
      out.set(target, v.byteOffset ?? 0)
      delete v.extensions
      v.buffer = 0
    } else if (imageViews.has(i)) {
      // No longer referenced; any valid range will do.
      json.bufferViews[i] = { buffer: 0, byteOffset: 0, byteLength: 4 }
    } else {
      throw new Error(`chest.glb: buffer view ${i} is neither an image nor meshopt-compressed`)
    }
  })
  json.buffers = [{ byteLength: out.length }]
  const keep = (list) => list?.filter((e) => e !== 'EXT_meshopt_compression')
  json.extensionsUsed = keep(json.extensionsUsed)
  json.extensionsRequired = keep(json.extensionsRequired)
  if (json.extensionsRequired?.length === 0) delete json.extensionsRequired

  const jsonBuf = Buffer.from(JSON.stringify(json))
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4
  const binPad = (4 - (out.length % 4)) % 4
  const total = 20 + jsonBuf.length + jsonPad + 8 + out.length + binPad
  const glb = Buffer.alloc(total)
  glb.write('glTF', 0)
  glb.writeUInt32LE(2, 4)
  glb.writeUInt32LE(total, 8)
  glb.writeUInt32LE(jsonBuf.length + jsonPad, 12)
  glb.write('JSON', 16)
  jsonBuf.copy(glb, 20)
  glb.fill(0x20, 20 + jsonBuf.length, 20 + jsonBuf.length + jsonPad)
  const at = 20 + jsonBuf.length + jsonPad
  glb.writeUInt32LE(out.length + binPad, at)
  glb.write('BIN\0', at + 4)
  out.copy(glb, at + 8)
  writeFileSync(join(dir, 'models', 'chest.js'), `export default "${glb.toString('base64')}"\n`)
  unlinkSync(glbPath)
}

await inlineChest()

// The host caps a version at 511 files. A build made with VITE_NO_THUMBS=1 loads full images
// in lists, so the thumbnail copies are dropped from the upload.
if (process.env.VITE_NO_THUMBS) rmSync(join(dir, 'items', 'thumb'), { recursive: true, force: true })

const html = readFileSync(join(dir, 'index.html'), 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ''
const lines = head.split('\n').map((s) => s.trim())
const preloads = lines.filter((s) => s.startsWith('<link rel="modulepreload"'))
const styles = lines.filter((s) => s.startsWith('<link rel="stylesheet"'))
const entry = lines.find((s) => s.startsWith('<script type="module"'))
if (!entry || styles.length === 0) throw new Error('index.html has no module entry or stylesheet; build first')

const page = [
  '<title>Ironbound</title>',
  '<meta name="theme-color" content="#0b0806">',
  '<meta name="description" content="Open a chest. Keep the steel. A demo of a physical arms and armor gacha.">',
  '<link rel="icon" type="image/svg+xml" href="./favicon.svg">',
  ...preloads,
  ...styles,
  '<style>html,body{background:#0b0806}</style>',
  '<div id="root"></div>',
  entry,
  '',
].join('\n')
writeFileSync(join(dir, 'ironbound.html'), page)

const files = []
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) walk(p)
    else files.push(relative(dir, p).split(sep).join('/'))
  }
}
walk(dir)
const supporting = files.filter((f) => f !== 'index.html' && f !== 'ironbound.html' && !f.startsWith('.')).sort()
const batches = []
for (let i = 0; i < supporting.length; i += BATCH) batches.push(supporting.slice(i, i + BATCH))
const bytes = supporting.reduce((s, f) => s + statSync(join(dir, f)).size, 0)
console.log(JSON.stringify({ page: join(dir, 'ironbound.html'), files: supporting.length, mb: +(bytes / 1048576).toFixed(1), batches }, null, 1))
