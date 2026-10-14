import { useId, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'
import type { Chest } from '../../types'
import { RARITIES } from '../../config/rarity'
import { pct } from '../../lib/format'

/**
 * Actual rarity proportions as a ledger rule: one segment per rarity at its exact share,
 * percentages in an expandable legend. Rarity is named in the legend, never color alone.
 */
export function OddsBar({ chest, height = 6, defaultExpanded = false }: { chest: Chest; height?: number; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const legendId = useId()
  const total = chest.bands.reduce((sum, b) => sum + b.odds, 0) || 1
  return (
    <div>
      {/* Exact proportions inside one strip: no minimum widths and no gaps, so a 0.01% tier
          is as thin as it should be. Hairline dividers are drawn inside each segment. */}
      <div className="flex w-full overflow-hidden rounded-[1px]" style={{ height }} role="img" aria-label={`Rarity odds: ${chest.bands.map((b) => `${RARITIES[b.rarity].label} ${pct(b.odds, 2)}`).join(', ')}`}>
        {chest.bands.map((b) => (
          <span key={b.rarity} className="block h-full shrink-0 shadow-[inset_-1px_0_0_var(--color-ink-950)] last:shadow-none" style={{ width: `${(b.odds / total) * 100}%`, background: RARITIES[b.rarity].cssVar }} />
        ))}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={legendId}
        onClick={() => setExpanded((open) => !open)}
        className="pointer-events-auto mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-bone-400 transition-colors hover:text-bone-100"
      >
        Odds
        {expanded ? <Minus size={11} weight="bold" aria-hidden /> : <Plus size={11} weight="bold" aria-hidden />}
      </button>
      <dl id={legendId} className={`mt-1 grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] text-bone-300 sm:grid-cols-3 ${expanded ? 'grid' : 'hidden'}`}>
        {chest.bands.map((b) => (
          <div key={b.rarity} className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="block h-[5px] w-[5px] rotate-45" style={{ background: RARITIES[b.rarity].cssVar }} />
              {RARITIES[b.rarity].label}
            </dt>
            <dd className="text-bone-100 tabular">{pct(b.odds, 2)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
