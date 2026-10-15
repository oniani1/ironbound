import type { ReactNode } from 'react'
import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'

const SIZES = { xs: 'text-[15px]', sm: 'text-[18px]', md: 'text-[22px]' } as const

/**
 * Rarity is always named and marked with pips, never color alone: the Gothic word in its
 * color with a pool of its own light behind it (globals.css, .ib-rarity). A label, not a pill.
 */
export function RarityTag({ rarity, size = 'sm', className = '' }: { rarity: RarityId; size?: keyof typeof SIZES; className?: string }) {
  const r = RARITIES[rarity]
  return (
    <span className={`ib-rarity ${SIZES[size]} ${className}`} style={{ color: r.cssVar }}>
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

/** A status label: 13 px, medium, sentence case, in the meaning color. The diamond belongs to rarity alone. */
export function Tag({ children, tone = 'bone', className = '', title }: { children: ReactNode; tone?: keyof typeof TONES; className?: string; title?: string }) {
  const color = TONES[tone]
  return (
    <span className={`inline-flex items-center text-[13px] font-medium ${className}`} style={{ color }} title={title}>
      {children}
    </span>
  )
}
