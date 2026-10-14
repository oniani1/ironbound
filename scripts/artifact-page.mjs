// Turns the artifact build's index.html into the page fragment the claude.ai Artifact
// publisher expects (no html, head or body tags) and lists the supporting files in
// batches small enough for one publish each.
//
// Usage: node scripts/artifact-page.mjs [dist-artifact]
// Writes <dir>/ironbound.html and prints the batches as JSON.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const dir = process.argv[2] ?? 'dist-artifact'
const BATCH = 250

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
