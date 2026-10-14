import type { Chest } from '../../types'
import { RARITIES } from '../../config/rarity'
import { pct } from '../../lib/format'

/**
 * Stacked bar of the chest's rarity odds. Tiny bands keep a minimum sliver so the chase
 * tiers stay visible, and every segment is labeled for screen readers.
 */
export function OddsBar({ chest, height = 8, labels = false }: { chest: Chest; height?: number; labels?: boolean }) {
  const min = 0.018
  const raw = chest.bands.map((b) => Math.max(b.odds, min))
  const sum = raw.reduce((a, b) => a + b, 0)
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }} role="img" aria-label={chest.bands.map((b) => `${RARITIES[b.rarity].label} ${pct(b.odds)}`).join(', ')}>
        {chest.bands.map((b, i) => (
          <span key={b.rarity} className="block h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${((raw[i] ?? 0) / sum) * 100}%`, background: RARITIES[b.rarity].cssVar, opacity: 0.9 }} />
        ))}
      </div>
      {labels && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-bone-400">
          {chest.bands.map((b) => (
            <span key={b.rarity} className="inline-flex items-center gap-1.5">
              <span className="block h-[6px] w-[6px] rotate-45" style={{ background: RARITIES[b.rarity].cssVar }} />
              {RARITIES[b.rarity].label} <span className="text-bone-200 tabular">{pct(b.odds)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
