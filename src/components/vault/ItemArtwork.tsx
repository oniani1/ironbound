import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import './vault.css'

export function ItemArtwork({ item, rarity, className = '', eager = false }: { item: Item; rarity?: RarityId; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  const rotate = item.rotate ?? 0
  const sideways = Math.abs(rotate) % 180 === 90
  const aspect = Math.max(0.08, Math.min(8, item.aspect || 1))
  const upright = sideways ? 1 / aspect : aspect
  return <div className={`ib-artwork ib-artwork-${item.category} ${className}`} style={{ '--item-light': rarity ? RARITIES[rarity].cssVar : 'var(--color-brass-500)', '--item-aspect': upright } as CSSProperties}>
    <span className="ib-item-pool" aria-hidden="true" />
    {failed ? <span className="ib-photo-unavailable">Photograph unavailable</span> : <div className="ib-image-fit" style={{ aspectRatio: upright }}>
      <img src={item.image} alt={`${item.name}, ${item.era}, ${item.origin}`} draggable={false} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} style={sideways ? { width: `${aspect * 100}%`, maxWidth: 'none', height: `${100 / aspect}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` } : { transform: `translate(-50%, -50%) rotate(${rotate}deg)` }} />
    </div>}
  </div>
}
