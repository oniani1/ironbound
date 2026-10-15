import type { Item } from '../types'

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

/** One line on where a piece comes from: era and origin for antiques, maker for newly forged pieces. */
export function provenanceLine(item: Pick<Item, 'provenance' | 'era' | 'origin' | 'maker'>): string {
  return item.provenance === 'antique' ? `${shortEra(item.era)} · ${item.origin} · Antique, authenticated` : `Newly forged · ${item.maker ?? 'Workshop'} · ${item.origin}`
}

export function resaleLabel(r: Item['resale']): string {
  return r === 'strong' ? 'Strong resale' : r === 'medium' ? 'Steady resale' : 'Low resale'
}

/** When the retail prices of newly forged pieces were read. */
export const RETAIL_CHECKED = 'October 2026'
export const RETAIL_CHECKED_SHORT = 'Oct 2026'

/** "regenyei.com" from a price source URL, for a short link label. */
export function sourceHost(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** The deed for a license as credited: "CC BY-SA 3.0", a ported "CC BY-SA 2.0 FR", CC0 or a public domain mark. */
function licenseDeed(license: string): string | null {
  if (license === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/'
  if (license === 'Public domain') return 'https://creativecommons.org/publicdomain/mark/1.0/'
  const m = license.match(/^CC (BY(?:-SA)?) (\d\.\d)(?: ([A-Z]{2}))?$/)
  return m ? `https://creativecommons.org/licenses/${m[1]!.toLowerCase()}/${m[2]}/${m[3] ? `${m[3].toLowerCase()}/` : ''}` : null
}

export interface PhotoCreditParts {
  /** "Photograph", "Photo" or "Example photo". */
  label: string
  by: string
  license: string | null
  licenseUrl: string | null
  /** Public domain: no attribution is owed, so small surfaces may leave the credit out. */
  publicDomain: boolean
  /** Every photo is a cutout of the original, and share-alike cutouts carry the same license. */
  changes: string
}

/**
 * Splits a stored credit ("Example photo: The Swedish History Museum, Stockholm, CC BY 2.0" or
 * "The Metropolitan Museum of Art, Open Access (CC0)") into who took it and its license, and
 * says what was changed.
 */
export function photoCredit(item: Pick<Item, 'credit' | 'provenance' | 'photoExact'>): PhotoCreditParts {
  const text = item.credit.replace(/^(Example photo|Photo): /, '')
  const match = text.match(/^(.*?)[,(]?\s*\(?(CC0|CC BY(?:-SA)? \d\.\d(?: [A-Z]{2})?|Public domain)\)?$/)
  const license = match?.[2] ?? null
  const shareAlike = !!license?.includes('-SA')
  return {
    label: item.provenance === 'antique' ? 'Photograph' : item.photoExact === false ? 'Example photo' : 'Photo',
    by: (match?.[1] ?? text).replace(/[,\s]+$/, ''),
    license,
    licenseUrl: license ? licenseDeed(license) : null,
    publicDomain: license === 'CC0' || license === 'Public domain',
    changes: shareAlike ? 'Cut out from the original photo; the cutout is shared under the same license.' : 'Cut out from the original photo.',
  }
}
