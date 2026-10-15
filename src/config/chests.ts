import type { Chest } from '../types'
import { byId } from '../lib/byId'

const B = (rarity: Chest['bands'][number]['rarity'], odds: number, min: number, max: number) => ({ rarity, odds, min, max })

export const CHESTS: Chest[] = [
  {
    id: 'squire',
    name: "Squire's Coffer",
    epithet: 'Relics of the field',
    tagline: 'Arrowheads, axes and newly forged helms, with a long shot at a knight’s sword.',
    price: 50,
    buyback: 0.85,
    theme: { wood: '#e6d2bc', woodSat: 0.45, woodGain: 1.45, metal: '#8d9298', metalness: 0.8, roughness: 1, glow: '#ffb35c', form: 'coffer' },
    bands: [
      B('common', 0.5035, 15, 30),
      B('uncommon', 0.3, 30, 60),
      B('rare', 0.13, 60, 75),
      B('epic', 0.05, 75, 150),
      B('legendary', 0.016, 150, 300),
      B('relic', 0.0005, 300, 1500),
    ],
  },
  {
    id: 'knight',
    name: "Knight's Chest",
    epithet: 'Steel that saw service',
    tagline: 'Axes, helms and Roman blades, and a shot at a longsword from a named maker.',
    price: 100,
    buyback: 0.88,
    theme: { wood: '#d2a478', woodSat: 0.85, woodGain: 1.25, metal: '#e4e9ef', metalness: 0.95, roughness: 0.55, glow: '#ffcf8a', form: 'strongbox' },
    bands: [
      B('common', 0.5, 25, 60),
      B('uncommon', 0.3, 60, 100),
      B('rare', 0.13, 100, 200),
      B('epic', 0.05, 200, 300),
      B('legendary', 0.016, 300, 600),
      B('relic', 0.004, 600, 7500),
    ],
  },
  {
    id: 'shogun',
    name: "Shōgun's Lacquer Box",
    epithet: 'Limited · The Edo Armory',
    tagline: 'Sword guards, tantō, katana and kabuto from Japan. 500 boxes only.',
    // Japanese pieces start around $100, so the box is priced where its odds stay honest.
    price: 500,
    buyback: 0.9,
    theme: { wood: '#5a1c16', woodSat: 0.6, woodGain: 0.6, woodRough: 0.3, metal: '#f0c066', metalness: 1, roughness: 0.42, glow: '#ff6a3d', ornament: 'tassel', form: 'lacquer' },
    limited: { total: 500, remaining: 137, endsInHours: 41 },
    filter: (item) => item.origin.toLowerCase().includes('japan'),
    bands: [
      B('common', 0.5035, 75, 250),
      B('uncommon', 0.3, 250, 600),
      B('rare', 0.13, 600, 1000),
      B('epic', 0.05, 1000, 1500),
      B('legendary', 0.016, 1500, 7500),
      B('relic', 0.0005, 7500, 20000),
    ],
  },
  {
    id: 'warlord',
    name: "Warlord's Hoard",
    epithet: 'Arms of captains',
    tagline: 'Albion swords, bascinets and crossbows, with antique blades and armor at the top.',
    price: 1000,
    buyback: 0.9,
    theme: { wood: '#4a4038', woodSat: 0.25, woodGain: 0.75, woodRough: 0.85, metal: '#d4924a', metalness: 1, roughness: 0.5, glow: '#ffb347', ornament: 'spikes', form: 'hoard' },
    bands: [
      B('common', 0.5, 400, 600),
      B('uncommon', 0.3, 600, 1000),
      B('rare', 0.13, 1000, 2000),
      B('epic', 0.05, 2000, 3000),
      B('legendary', 0.016, 3000, 6000),
      B('relic', 0.004, 6000, 30000),
    ],
  },
  {
    id: 'king',
    name: "King's Reliquary",
    epithet: 'Museum grade',
    tagline: 'Antique arms, signed katana and made-to-measure harness. Grails up to $1.2M.',
    price: 5000,
    buyback: 0.92,
    theme: { wood: '#b8323a', woodSat: 1.15, woodGain: 0.95, woodRough: 0.6, metal: '#ffd884', metalness: 1, roughness: 0.32, glow: '#ffe1a3', ornament: 'crown', form: 'reliquary' },
    bands: [
      B('common', 0.503, 2500, 3000),
      B('uncommon', 0.3, 3000, 5000),
      B('rare', 0.13, 5000, 7500),
      B('epic', 0.05, 7500, 15000),
      B('legendary', 0.016, 15000, 30000),
      B('relic', 0.001, 30000, 1500000),
    ],
  },
  {
    id: 'trial',
    name: 'Trial Chest',
    epithet: 'On the house',
    tagline: 'Your first chest, free.',
    price: 0,
    buyback: 0.9,
    hidden: true,
    theme: { wood: '#e0c6a6', woodSat: 0.6, woodGain: 1.4, metal: '#caa463', metalness: 0.95, roughness: 0.6, glow: '#ffb35c' },
    bands: [B('rare', 1, 150, 900)],
  },
]

/** The item every new player receives from the trial chest. */
export const TRIAL_ITEM_ID = 'regenyei-standard-feder'

export const CHEST_BY_ID = byId(CHESTS)

export const VISIBLE_CHESTS = CHESTS.filter((c) => !c.hidden)
