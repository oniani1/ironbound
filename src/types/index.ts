export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'relic'

/** 'fitting' is kept for archived pulls; the catalog holds none. */
export type Category = 'sword' | 'dagger' | 'polearm' | 'axe' | 'helmet' | 'shield' | 'armor' | 'bow' | 'crossbow' | 'fitting'

export type Provenance = 'antique' | 'forged'

export interface Item {
  id: string
  name: string
  category: Category
  era: string
  origin: string
  provenance: Provenance
  maker?: string
  materials: string
  length?: string
  weight?: string
  value: number
  blurb: string
  image: string
  /** Small version for grids and lists. */
  thumb?: string
  /** Natural aspect ratio of the cut-out image (width / height). */
  aspect: number
  credit: string
  sourceUrl: string
  /** Newly forged only: the maker's catalog id. */
  makerId?: string
  /** Newly forged only: false when the photo shows an example of the type, not this exact model. */
  photoExact?: boolean
  /** Newly forged only: where the retail price was read. */
  priceSource?: string
  /** Newly forged only: how well the maker's pieces hold value on resale. */
  resale?: 'strong' | 'medium' | 'low'
}

/** What is kept of a piece that has left the catalog, so a vault that holds it can still name it. */
export type ArchivedItem = Pick<Item, 'id' | 'name' | 'category' | 'era' | 'origin' | 'provenance'> & { sourceUrl?: string }

export interface Maker {
  id: string
  name: string
  country: string | null
  city: string | null
  founded: number | null
  specialty: string
  priceRange: string
  reputation: string
  resale: 'strong' | 'medium' | 'low'
  website: string
}

export interface ChestBand {
  rarity: RarityId
  odds: number
  min: number
  max: number
}

export interface ChestTheme {
  /** Multiplies the wood albedo after desaturation. */
  wood: string
  /** Wood saturation (0 grey, 1 original). */
  woodSat?: number
  /** Wood brightness multiplier. */
  woodGain?: number
  /** Wood roughness multiplier; low values read as lacquer. */
  woodRough?: number
  /** Tint for the iron straps and fittings. */
  metal: string
  metalness: number
  roughness: number
  /** Color of the idle light leaking from the seams. */
  glow: string
  /** Tier ornament fixed to the lid. */
  ornament?: 'crown' | 'tassel' | 'spikes'
  /** Construction: proportions and what the chest stands on, so tiers differ in silhouette. */
  form?: 'coffer' | 'strongbox' | 'lacquer' | 'hoard' | 'reliquary'
}

export interface Chest {
  id: string
  name: string
  epithet: string
  price: number
  buyback: number
  bands: ChestBand[]
  theme: ChestTheme
  limited?: { total: number; remaining: number; endsInHours: number }
  tagline: string
  hidden?: boolean
  /** Restricts the pool, e.g. Japanese arms only for the Shōgun box. */
  filter?: (item: Item) => boolean
}

export type PullStatus = 'vaulted' | 'sold' | 'shipping' | 'shipped'

export interface Pull {
  uid: string
  itemId: string
  chestId: string
  rarity: RarityId
  price: number
  value: number
  at: number
  status: PullStatus
  /** Mock verifiable-randomness receipt for the draw. */
  draw?: string
  soldFor?: number
  shipment?: { name: string; city: string; country: string; method: 'standard' | 'express'; eta: string; tracking: string }
}

export type Tincture = 'or' | 'argent' | 'gules' | 'azure' | 'vert' | 'sable' | 'purpure' | 'tenne' | 'murrey' | 'celeste' | 'cendree'
export type Ordinary = 'chevron' | 'saltire' | 'cross' | 'bend' | 'pale' | 'fess' | 'chief' | 'quarterly' | 'bordure' | 'pile' | 'perpale' | 'perfess' | 'paly' | 'barry' | 'chequy' | 'gyronny' | 'plain'
/** A charge drawn over the field and the ordinary, or none. */
export type Charge = 'none' | 'lion' | 'crown' | 'eagle' | 'stag' | 'boar' | 'wolf' | 'bear' | 'griffin' | 'unicorn' | 'horse' | 'raven' | 'castle' | 'fleur' | 'swords' | 'rose' | 'sun'

/** A coat of arms: a field tincture with one ordinary in a second tincture. */
export interface Arms {
  field: Tincture
  /** The ordinary's tincture. */
  charge: Tincture
  ordinary: Ordinary
  symbol: Charge
  /** The charge's tincture. */
  symbolColor: Tincture
}
