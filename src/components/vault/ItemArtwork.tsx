import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import './vault.css'

export function ItemArtwork({ item, rarity, className = '', eager = false }: { item: Item; rarity?: RarityId; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  // Catalog images are stored upright, so the photo's own aspect is the display aspect.
  const upright = Math.max(0.08, Math.min(8, item.aspect || 1))
  return <div className={`ib-artwork ib-artwork-${item.category} ${className}`} style={{ '--item-light': rarity ? RARITIES[rarity].cssVar : 'var(--color-brass-500)', '--item-aspect': upright } as CSSProperties}>
    <span className="ib-item-pool" aria-hidden="true" />
    {failed ? <span className="ib-photo-unavailable">Photograph unavailable</span> : <div className="ib-image-fit" style={{ aspectRatio: upright }}>
      <img src={item.thumb ?? item.image} alt={`${item.name}, ${item.era}, ${item.origin}`} draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} style={{ transform: 'translate(-50%, -50%)' }} />
    </div>}
  </div>
}
