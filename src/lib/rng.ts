/** Uniform float in [0, 1) from the platform CSPRNG. */
export function random(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] ?? 0) / 0x1_0000_0000
}

export function pickWeighted<T>(entries: readonly T[], weight: (t: T) => number, r: number = random()): T {
  if (entries.length === 0) throw new Error('pickWeighted: empty list')
  const total = entries.reduce((s, e) => s + Math.max(0, weight(e)), 0)
  let x = r * total
  for (const e of entries) {
    x -= Math.max(0, weight(e))
    if (x < 0) return e
  }
  return entries[entries.length - 1] as T
}

export function pickOne<T>(entries: readonly T[], r: number = random()): T {
  if (entries.length === 0) throw new Error('pickOne: empty list')
  return entries[Math.min(entries.length - 1, Math.floor(r * entries.length))] as T
}

/** A 32-byte hex string, used as a mock verifiable draw receipt. */
export function drawId(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function uid(): string {
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}
