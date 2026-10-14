import type { RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'

/** Rarity is always named and marked with pips, never color alone. */
export function RarityTag({ rarity, size = 'sm', className = '' }: { rarity: RarityId; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const r = RARITIES[rarity]
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px] gap-1' : size === 'sm' ? 'px-2 py-1 text-[11px] gap-1.5' : 'px-2.5 py-1 text-[12px] gap-2'
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-[0.14em] ${pad} ${className}`}
      style={{
        color: r.cssVar,
        background: `color-mix(in oklch, ${r.cssVar} 13%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${r.cssVar} 32%, transparent)`,
      }}
    >
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
