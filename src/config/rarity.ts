import type { RarityId } from '../types'

export interface Rarity {
  id: RarityId
  label: string
  /** CSS custom property holding the color. */
  cssVar: string
  /** Hex used by three.js lights and shaders. */
  hex: string
  /** 1 to 6, used for pips and to scale intensity. */
  tier: number
  /** Short flavor shown on the reveal stamp. */
  stamp: string
}

export const RARITIES: Record<RarityId, Rarity> = {
  common: { id: 'common', label: 'Common', cssVar: 'var(--r-common)', hex: '#a9b0ba', tier: 1, stamp: 'Common' },
  uncommon: { id: 'uncommon', label: 'Uncommon', cssVar: 'var(--r-uncommon)', hex: '#5fd1a6', tier: 2, stamp: 'Uncommon' },
  rare: { id: 'rare', label: 'Rare', cssVar: 'var(--r-rare)', hex: '#5b8cff', tier: 3, stamp: 'Rare' },
  epic: { id: 'epic', label: 'Epic', cssVar: 'var(--r-epic)', hex: '#b65cff', tier: 4, stamp: 'Epic' },
  legendary: { id: 'legendary', label: 'Legendary', cssVar: 'var(--r-legendary)', hex: '#ffc94d', tier: 5, stamp: 'Legendary' },
  relic: { id: 'relic', label: 'Relic', cssVar: 'var(--r-relic)', hex: '#ff3b2f', tier: 6, stamp: 'Relic' },
}

export const RARITY_ORDER: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'relic']

export function rarityAtLeast(r: RarityId, min: RarityId) {
  return RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(min)
}
