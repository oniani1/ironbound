import { describe, expect, it } from 'vitest'
import { kindOf, revealFacts } from './facts'
import { ITEMS } from '../data/items'

describe('reveal facts', () => {
  it('names the kind of piece, not only its category', () => {
    expect(kindOf({ name: 'Seven-Flanged Mace', category: 'axe' })).toBe('A mace')
    expect(kindOf({ name: 'Scandinavian Battle Axe', category: 'axe' })).toBe('An axe')
    expect(kindOf({ name: 'Su Yari', category: 'polearm' })).toBe('A spear')
    expect(kindOf({ name: 'Swiss Halberd', category: 'polearm' })).toBe('A halberd')
    expect(kindOf({ name: 'Hour Glass Gauntlets', category: 'armor' })).toBe('A pair of gauntlets')
    expect(kindOf({ name: 'Churburg Breastplate', category: 'armor' })).toBe('A breastplate')
    expect(kindOf({ name: 'Great Helm', category: 'helmet' })).toBe('A helmet')
  })

  it('never gives away the name before the rarity', () => {
    for (const item of ITEMS) {
      for (const fact of revealFacts(item)) expect(fact.value.toLowerCase(), item.id).not.toBe(item.name.toLowerCase())
    }
  })
})
