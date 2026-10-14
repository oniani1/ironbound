import type { CSSProperties, ReactNode } from 'react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { money, shortEra } from '../../lib/format'
import { ItemImg } from './ItemImg'
import { RarityTag } from './RarityTag'

/**
 * One object in a museum vitrine: the piece stands in a pool of its rarity light over a dark
 * floor, with a catalog caption under it. No box, no border. Hover lifts the piece.
 */
export function ItemVitrine({
  item,
  rarity,
  className = '',
  aspect = 'aspect-square',
  showRarity = true,
  meta,
  footer,
}: {
  item: Item
  rarity?: RarityId
  className?: string
  aspect?: string
  showRarity?: boolean
  /** Replaces the era line under the name. */
  meta?: ReactNode
  footer?: ReactNode
}) {
  const light = rarity ? RARITIES[rarity].cssVar : 'var(--color-brass-500)'
  return (
    <figure className={`group relative m-0 ${className}`}>
      <div className={`vitrine relative ${aspect} overflow-hidden rounded-[2px]`} style={{ '--light': light } as CSSProperties}>
        <span
          className="pointer-events-none absolute inset-x-[22%] bottom-[7%] h-[9%] rounded-[50%] bg-[oklch(0%_0_0/.55)] blur-md transition-[transform,opacity] duration-500 ease-out group-hover:scale-x-90 group-hover:opacity-70"
          aria-hidden
        />
        {/* The light comes up a little when the piece is approached. */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(50% 46% at 50% 58%, color-mix(in oklch, ${light} 14%, transparent), transparent 75%)` }}
          aria-hidden
        />
        <ItemImg
          item={item}
          alt={item.name}
          className="relative h-full w-full p-[12%] drop-shadow-[0_18px_22px_oklch(0%_0_0/.55)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1"
        />
      </div>
      <figcaption className="mt-3 min-w-0">
        {showRarity && rarity && <RarityTag rarity={rarity} size="xs" />}
        <p className="font-display mt-1 line-clamp-1 text-[18px] font-semibold leading-snug text-bone-50">{item.name}</p>
        <p className="mt-0.5 flex items-baseline justify-between gap-3 text-[12px] text-bone-400">
          <span className="truncate">{meta ?? (item.provenance === 'forged' ? item.maker ?? 'New work' : shortEra(item.era))}</span>
          <span className="shrink-0 font-semibold text-bone-200 tabular">{money(item.value, { compact: true })}</span>
        </p>
        {footer}
      </figcaption>
    </figure>
  )
}
