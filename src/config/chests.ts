import type { Chest } from '../types'

const B = (rarity: Chest['bands'][number]['rarity'], odds: number, min: number, max: number) => ({ rarity, odds, min, max })

export const CHESTS: Chest[] = [
  {
    id: 'squire',
    name: "Squire's Coffer",
    epithet: 'Relics of the field',
    tagline: 'Arrowheads, spurs and camp blades, with a long shot at a knight’s sword.',
    price: 50,
    buyback: 0.85,
    theme: { wood: '#e6d2bc', woodSat: 0.45, woodGain: 1.45, metal: '#8d9298', metalness: 0.8, roughness: 1, glow: '#ffb35c' },
    bands: [
      B('common', 0.775, 14, 45),
      B('uncommon', 0.165, 45, 100),
      B('rare', 0.048, 100, 320),
      B('epic', 0.0105, 320, 1500),
      B('legendary', 0.0013, 1500, 7000),
      B('relic', 0.0002, 7000, 30000),
    ],
  },
  {
    id: 'knight',
    name: "Knight's Chest",
    epithet: 'Steel that saw service',
    tagline: 'Daggers, axes and sword guards, and a real chance at a blade worth thousands.',
    price: 100,
    buyback: 0.88,
    theme: { wood: '#d2a478', woodSat: 0.85, woodGain: 1.25, metal: '#e4e9ef', metalness: 0.95, roughness: 0.55, glow: '#ffcf8a' },
    bands: [
      B('common', 0.72, 30, 90),
      B('uncommon', 0.19, 90, 220),
      B('rare', 0.066, 220, 700),
      B('epic', 0.019, 700, 2600),
      B('legendary', 0.0045, 2600, 14000),
      B('relic', 0.0005, 14000, 70000),
    ],
  },
  {
    id: 'shogun',
    name: "Shōgun's Lacquer Box",
    epithet: 'Limited · The Edo Armory',
    tagline: 'Sword guards, tantō, katana and kabuto from Japan. 500 boxes only.',
    price: 250,
    buyback: 0.9,
    theme: { wood: '#5a1c16', woodSat: 0.6, woodGain: 0.6, woodRough: 0.3, metal: '#f0c066', metalness: 1, roughness: 0.42, glow: '#ff6a3d' },
    limited: { total: 500, remaining: 137, endsInHours: 41 },
    filter: (item) => item.origin.toLowerCase().includes('japan'),
    bands: [
      B('common', 0.66, 80, 230),
      B('uncommon', 0.22, 230, 480),
      B('rare', 0.085, 480, 1600),
      B('epic', 0.027, 1600, 7000),
      B('legendary', 0.0065, 7000, 45000),
      B('relic', 0.0015, 45000, 400000),
    ],
  },
  {
    id: 'warlord',
    name: "Warlord's Hoard",
    epithet: 'Arms of captains',
    tagline: 'Rapiers, sabres, helmets and shields. Every pull is a wall piece.',
    price: 1000,
    buyback: 0.9,
    theme: { wood: '#4a4038', woodSat: 0.25, woodGain: 0.75, woodRough: 0.85, metal: '#d4924a', metalness: 1, roughness: 0.5, glow: '#ffb347' },
    bands: [
      B('common', 0.64, 380, 950),
      B('uncommon', 0.235, 950, 1900),
      B('rare', 0.088, 1900, 5200),
      B('epic', 0.029, 5200, 16000),
      B('legendary', 0.0065, 16000, 85000),
      B('relic', 0.0015, 85000, 400000),
    ],
  },
  {
    id: 'king',
    name: "King's Reliquary",
    epithet: 'Museum grade',
    tagline: 'Armor, helmets and swords fit for a royal armory. Grails up to $1.2M.',
    price: 5000,
    buyback: 0.92,
    theme: { wood: '#b8323a', woodSat: 1.15, woodGain: 0.95, woodRough: 0.6, metal: '#ffd884', metalness: 1, roughness: 0.32, glow: '#ffe1a3' },
    bands: [
      B('common', 0.6, 1800, 4800),
      B('uncommon', 0.25, 4800, 9000),
      B('rare', 0.1, 9000, 22000),
      B('epic', 0.036, 22000, 65000),
      B('legendary', 0.0115, 65000, 260000),
      B('relic', 0.0025, 260000, 1500000),
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
export const TRIAL_ITEM_ID = 'fencing-feder-27910'

export const CHEST_BY_ID = Object.fromEntries(CHESTS.map((c) => [c.id, c])) as Record<string, Chest>

export const VISIBLE_CHESTS = CHESTS.filter((c) => !c.hidden)
