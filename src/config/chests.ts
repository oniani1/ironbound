import type { Chest } from '../types'
import { byId } from '../lib/byId'

const B = (rarity: Chest['bands'][number]['rarity'], odds: number, min: number, max: number) => ({ rarity, odds, min, max })

// Bands are value ranges [min, max) over the catalog, cheapest chest first. The catalog holds
// complete pieces only, the cheapest at $45. Filled from the cheapest pieces up (three at
// least in Common and Uncommon, two in every other band), a chest is still worth about $87 a
// draw, so none can cost under $100 and keep its expected value at 88 to 92% of the price.
export const CHESTS: Chest[] = [
  {
    id: 'squire',
    name: "Squire's Coffer",
    epithet: 'Relics of the field',
    tagline: 'Helms, shields, daggers and bows, with a long shot at a knight’s sword.',
    price: 100,
    buyback: 0.85,
    theme: { wood: '#e6d2bc', woodSat: 0.45, woodGain: 1.45, metal: '#8d9298', metalness: 0.8, roughness: 1, glow: '#ffb35c', form: 'coffer' },
    bands: [
      B('common', 0.5035, 40, 95),
      B('uncommon', 0.3, 95, 115),
      B('rare', 0.13, 115, 125),
      B('epic', 0.05, 125, 200),
      B('legendary', 0.016, 200, 400),
      B('relic', 0.0005, 400, 1300),
    ],
  },
  {
    id: 'knight',
    name: "Knight's Chest",
    epithet: 'Steel that saw service',
    tagline: 'Roman blades, helms, crossbows and spears, and a shot at a longsword from a named maker.',
    price: 250,
    buyback: 0.88,
    theme: { wood: '#d2a478', woodSat: 0.85, woodGain: 1.25, metal: '#e4e9ef', metalness: 0.95, roughness: 0.55, glow: '#ffcf8a', form: 'strongbox' },
    bands: [
      B('common', 0.5, 90, 150),
      B('uncommon', 0.3, 150, 240),
      B('rare', 0.13, 240, 400),
      B('epic', 0.05, 400, 700),
      B('legendary', 0.016, 700, 2000),
      B('relic', 0.004, 2000, 7500),
    ],
  },
  {
    id: 'warlord',
    name: "Warlord's Hoard",
    epithet: 'Arms of captains',
    tagline: 'Albion swords, bascinets and crossbows, yari and halberds, with antique arms and armor at the top.',
    price: 1000,
    buyback: 0.9,
    theme: { wood: '#4a4038', woodSat: 0.25, woodGain: 0.75, woodRough: 0.85, metal: '#d4924a', metalness: 1, roughness: 0.5, glow: '#ffb347', ornament: 'spikes', form: 'hoard' },
    bands: [
      B('common', 0.5, 400, 650),
      B('uncommon', 0.3, 650, 1000),
      B('rare', 0.13, 1000, 1800),
      B('epic', 0.05, 1800, 3500),
      B('legendary', 0.016, 3500, 7000),
      B('relic', 0.004, 7000, 50000),
    ],
  },
  {
    id: 'shogun',
    name: "Shōgun's Lacquer Box",
    epithet: 'Limited · The Edo Armory',
    tagline: 'Katana, tantō, yari, yumi and kabuto from Japan. 500 boxes only.',
    // Pieces made in Japan only: three under $1,000 (a yumi, a yari, an iaito) and three more
    // under $3,000, so the box is priced where its odds stay honest (expected value 90%).
    price: 2500,
    buyback: 0.9,
    theme: { wood: '#5a1c16', woodSat: 0.6, woodGain: 0.6, woodRough: 0.3, metal: '#f0c066', metalness: 1, roughness: 0.42, glow: '#ff6a3d', ornament: 'tassel', form: 'lacquer' },
    limited: { total: 500, remaining: 137, endsInHours: 41 },
    filter: (item) => item.origin.toLowerCase().includes('japan'),
    bands: [
      B('common', 0.5035, 300, 1000),
      B('uncommon', 0.3, 1000, 3000),
      B('rare', 0.13, 3000, 7500),
      B('epic', 0.05, 7500, 11500),
      B('legendary', 0.016, 11500, 15000),
      B('relic', 0.0005, 15000, 150000),
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
      B('common', 0.503, 1500, 3500),
      B('uncommon', 0.3, 3500, 6250),
      B('rare', 0.13, 6250, 9000),
      B('epic', 0.05, 9000, 15000),
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
