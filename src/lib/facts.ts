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
  bow: 'A bow',
  crossbow: 'A crossbow',
  fitting: 'A fitting',
}

/**
 * Where the category is too broad to say what a piece is (a mace filed with the axes, a yari
 * with the polearms, a breastplate with the armor), its own name says it. The first match wins.
 */
const SPECIFIC: Partial<Record<Category, [RegExp, string][]>> = {
  axe: [
    [/\bmace\b/i, 'A mace'],
    [/hammer/i, 'A war hammer'],
  ],
  polearm: [
    [/halberd/i, 'A halberd'],
    [/glaive/i, 'A glaive'],
    [/partisan/i, 'A partisan'],
    [/\bbill\b/i, 'A bill'],
    [/poll?axe|pole ?axe/i, 'A pollaxe'],
    [/yari|spear/i, 'A spear'],
  ],
  armor: [
    [/gauntlets\b/i, 'A pair of gauntlets'],
    [/gauntlet\b/i, 'A gauntlet'],
    [/pauldrons\b/i, 'A pair of pauldrons'],
    [/breastplate|cuirass/i, 'A breastplate'],
    [/gorget/i, 'A gorget'],
    [/\barmou?r\b/i, 'A suit of armor'],
  ],
}

/** What a piece is, in a few words: its kind, named as closely as the record allows. */
export function kindOf(item: Pick<Item, 'name' | 'category'>) {
  const found = SPECIFIC[item.category]?.find(([re]) => re.test(item.name))
  return found ? found[1] : KIND[item.category]
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
    { label: 'Type', value: kindOf(item) },
  ]
  if (item.provenance === 'antique') {
    facts.push({ label: 'Age', value: 'Antique' })
    facts.push({ label: 'Made', value: shortEra(item.era).replace(/^C\.\s*/, 'Around ') })
  } else {
    facts.push({ label: 'Age', value: 'Newly forged' })
    facts.push({ label: 'Maker', value: item.maker ?? 'Master smith' })
  }
  if (item.weight) facts.push({ label: 'Weight', value: item.weight })
  return facts
}
