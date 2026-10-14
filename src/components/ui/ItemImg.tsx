import type { Item } from '../../types'

/** Cut-out item photo. Thumbnails for grids and lists, the full image for detail views. */
export function ItemImg({ item, size = 'thumb', className = '', alt = '', eager = false }: { item: Item; size?: 'thumb' | 'full'; className?: string; alt?: string; eager?: boolean }) {
  return (
    <img
      src={size === 'thumb' ? (item.thumb ?? item.image) : item.image}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`object-contain ${className}`}
    />
  )
}
