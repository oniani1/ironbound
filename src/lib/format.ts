const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** $1,250 or $1.25M for large values when compact. */
export function money(n: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 100_000) {
    const m = Math.abs(n) >= 1_000_000
    const v = m ? n / 1_000_000 : n / 1_000
    return `$${v.toFixed(v >= 100 ? 0 : 1).replace(/\.0$/, '')}${m ? 'M' : 'K'}`
  }
  return opts.cents ? usd2.format(n) : usd0.format(Math.round(n))
}

export function pct(p: number, digits?: number): string {
  const v = p * 100
  const d = digits ?? (v >= 10 ? 0 : v >= 1 ? 1 : v >= 0.1 ? 2 : 3)
  return `${v.toFixed(d)}%`
}

/** "1 in 2,000" style odds for small probabilities. */
export function oneIn(p: number): string {
  if (p <= 0) return 'None'
  const n = Math.round(1 / p)
  return `1 in ${n.toLocaleString('en-US')}`
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(1, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** Short era for chips and tiles: "Blade, 16th century; mounting, 19th century" becomes "16th century". */
export function shortEra(era: string): string {
  let e = era.split(';')[0] ?? era
  e = e.replace(/^Blade,?\s*/i, '').replace(/^probably\s+/i, '').replace(/^possibly\s+/i, '')
  e = e.replace(/^dated\b/i, 'Dated')
  return e.charAt(0).toUpperCase() + e.slice(1)
}
