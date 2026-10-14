import { useId, useState } from 'react'
import type { Chest } from '../../types'
import { RARITIES } from '../../config/rarity'
import { pct } from '../../lib/format'

/** Actual rarity proportions, with exact percentages in an expandable legend. */
export function OddsBar({ chest, height = 8, defaultExpanded = false }: { chest: Chest; height?: number; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const legendId = useId()
  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-full" style={{ height }} role="img" aria-label={`Rarity odds: ${chest.bands.map((b) => `${RARITIES[b.rarity].label} ${pct(b.odds, 2)}`).join(', ')}`}>
        {chest.bands.map((b) => (
          <span key={b.rarity} className="block h-full shrink-0 first:rounded-l-full last:rounded-r-full" style={{ width: `${b.odds * 100}%`, background: RARITIES[b.rarity].cssVar, opacity: 0.9 }} />
        ))}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={legendId}
        onClick={() => setExpanded((open) => !open)}
        className="pointer-events-auto mt-1 inline-flex min-h-8 items-center gap-2 rounded px-1 text-[12px] text-bone-300 transition-colors hover:text-bone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-300"
      >
        Rarity odds <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <dl id={legendId} className={`mt-1 flex-wrap gap-x-3 gap-y-1 text-[12px] text-bone-300 ${expanded ? 'flex' : 'hidden'}`}>
        {chest.bands.map((b) => (
          <div key={b.rarity} className="inline-flex items-center gap-1.5">
            <dt className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="block h-[6px] w-[6px] rotate-45" style={{ background: RARITIES[b.rarity].cssVar }} />
              {RARITIES[b.rarity].label}
            </dt>
            <dd className="text-bone-200 tabular">{pct(b.odds, 2)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
