import type { ReactNode } from 'react'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'

/** Rarity is always named and marked with pips, never color alone. A label, not a pill. */
export function RarityTag({ rarity, size = 'sm', className = '' }: { rarity: RarityId; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const r = RARITIES[rarity]
  const text = size === 'xs' ? 'text-[10px] gap-1' : size === 'sm' ? 'text-[11px] gap-1.5' : 'text-[12px] gap-2'
  return (
    <span className={`inline-flex items-center font-semibold uppercase tracking-[0.16em] ${text} ${className}`} style={{ color: r.cssVar }}>
      <Pips tier={r.tier} color={r.cssVar} />
      {r.label}
    </span>
  )
}

export function Pips({ tier, color }: { tier: number; color: string }) {
  return (
    <span className="inline-flex gap-[2px]" aria-hidden>
      {Array.from({ length: Math.min(tier, 6) }, (_, i) => (
        <span key={i} className="block h-[5px] w-[5px] rotate-45" style={{ background: color }} />
      ))}
    </span>
  )
}

const TONES = {
  bone: 'var(--color-bone-400)',
  brass: 'var(--color-brass-400)',
  ember: 'var(--color-ember-400)',
  moss: 'var(--color-moss-400)',
  relic: 'var(--r-relic)',
} as const

/** A status label: small caps behind a diamond in the meaning color. Replaces pills. */
export function Tag({ children, tone = 'bone', className = '', title }: { children: ReactNode; tone?: keyof typeof TONES; className?: string; title?: string }) {
  const color = TONES[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`} style={{ color }} title={title}>
      <span className="block h-[5px] w-[5px] rotate-45" style={{ background: color }} aria-hidden />
      {children}
    </span>
  )
}
