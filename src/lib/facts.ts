import type { Category, Item } from '../types'
import { shortEra } from './format'

export interface RevealFact {
  label: string
  value: string
}

const KIND: Record<Category, string> = {
  sword: 'A sword',
  dagger: 'A dagger',
  polearm: 'A polearm',
  axe: 'An axe',
  helmet: 'A helmet',
  shield: 'A shield',
  armor: 'Armor',
  crossbow: 'A crossbow',
  fitting: 'A fitting',
}

/** Fittings are many things; the name says which, without giving the name away. */
const FITTING: [RegExp, string][] = [
  [/arrowhead|yano|bodkin/i, 'An arrowhead'],
  [/tsuba|guard/i, 'A sword guard'],
  [/spur/i, 'A spur'],
  [/stirrup/i, 'A stirrup'],
  [/kozuka/i, 'A knife handle'],
  [/collar|fuchi|kashira|menuki/i, 'A sword fitting'],
  [/\bbit\b|snaffle/i, 'A horse bit'],
]

function kind(item: Pick<Item, 'category' | 'name'>) {
  if (item.category === 'fitting') return FITTING.find(([re]) => re.test(item.name))?.[1] ?? KIND.fitting
  return KIND[item.category]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * What the opening tells about a piece before its rarity, one fact at a time and in this
 * order: where it is from, what it is, old or new, when it was made (or who made it), and
 * its weight when known. The name and the rarity are kept for last.
 */
export function revealFacts(item: Pick<Item, 'name' | 'origin' | 'category' | 'provenance' | 'era' | 'maker' | 'weight'>): RevealFact[] {
  const facts: RevealFact[] = [
    { label: 'Origin', value: capitalize((item.origin.split(';')[0] ?? item.origin).trim()) },
    { label: 'Type', value: kind(item) },
  ]
  if (item.provenance === 'antique') {
    facts.push({ label: 'Age', value: 'Antique' })
    facts.push({ label: 'Made', value: shortEra(item.era).replace(/^C\.\s*/, 'Around ') })
  } else {
    facts.push({ label: 'Age', value: 'New work' })
    facts.push({ label: 'Maker', value: item.maker ?? 'Master smith' })
  }
  if (item.weight) facts.push({ label: 'Weight', value: item.weight })
  return facts
}
