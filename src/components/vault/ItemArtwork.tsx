import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import './vault.css'

export function ItemArtwork({ item, rarity, className = '', eager = false, sheen = false, full = false }: { item: Item; rarity?: RarityId; className?: string; eager?: boolean; sheen?: boolean; full?: boolean }) {
  const [failed, setFailed] = useState(false)
  // Catalog images are stored upright, so the photo's own aspect is the display aspect.
  const upright = Math.max(0.08, Math.min(8, item.aspect || 1))
  return <div className={`ib-artwork vitrine ib-artwork-${item.category} ${className}`} style={{ '--light': rarity ? RARITIES[rarity].cssVar : 'var(--color-bone-300)', '--item-aspect': upright } as CSSProperties}>
    {failed ? <span className="ib-photo-unavailable">Photograph unavailable</span> : <div className="ib-image-fit" style={{ aspectRatio: upright }}>
      <img src={full ? item.image : item.thumb ?? item.image} alt={`${item.name}, ${item.era}, ${item.origin}`} draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} style={{ transform: 'translate(-50%, -50%)' }} />
    </div>}
    {sheen && <span className="sheen ib-object-sheen" aria-hidden="true" />}
  </div>
}
