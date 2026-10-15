import { describe, expect, it } from 'vitest'
import { parseSave } from './store'
import { ARCHIVE_BY_ID, ITEM_BY_ID } from '../data/items'
import { CHEST_BY_ID } from '../config/chests'

const pull = { uid: 'a', itemId: 'arming-sword-23367', chestId: 'warlord', rarity: 'epic', price: 1000, value: 2651, at: 1, status: 'vaulted' }
const good = {
  version: 2,
  profile: { name: 'Nika', arms: { field: 'azure', charge: 'or', ordinary: 'saltire' } },
  onboarded: true,
  signedIn: true,
  signInMethod: 'email',
  balance: 500,
  pulls: [pull],
  settings: { fast: true, force: null, sound: false },
  stats: { spent: 1000, opened: 1, soldFor: 0 },
}

describe('saved state', () => {
  it('keeps a well-formed save and drops settings that no longer exist', () => {
    const s = parseSave(JSON.stringify(good))
    expect(s.profile?.name).toBe('Nika')
    expect(s.pulls).toEqual([pull])
    expect(s.settings).toEqual({ fast: true, force: null })
  })

  it('starts on any damaged save', () => {
    const damaged = ['{', 'null', '[]', '{"version":2,"pulls":null}', '{"version":2,"pulls":[null,7,"x"]}', '{"version":2,"profile":{"name":"A","arms":{"field":"pink"}},"stats":null,"settings":"x","balance":"lots"}']
    for (const raw of damaged) {
      const s = parseSave(raw)
      expect(s.pulls, raw).toEqual([])
      expect(s.profile, raw).toBeNull()
      expect(Number.isFinite(s.balance), raw).toBe(true)
      expect(s.settings, raw).toEqual({ fast: false, force: null })
    }
  })

  it('keeps the sound pulls of a partly damaged save', () => {
    const s = parseSave(JSON.stringify({ ...good, pulls: [null, { uid: 'b' }, pull, { ...pull, uid: 'c', rarity: 'mythic' }, { ...pull, uid: 'd', status: 'lost' }] }))
    expect(s.pulls.map((p) => p.uid)).toEqual(['a'])
  })

  it('never finds a built-in for a saved id', () => {
    const s = parseSave(JSON.stringify({ ...good, pulls: [{ ...pull, uid: 'p', itemId: '__proto__', chestId: 'constructor' }] }))
    const saved = s.pulls[0]!
    for (const id of [saved.itemId, 'constructor', 'toString', 'hasOwnProperty']) {
      expect(ITEM_BY_ID[id], id).toBeUndefined()
      expect(ARCHIVE_BY_ID[id], id).toBeUndefined()
    }
    expect(CHEST_BY_ID[saved.chestId]).toBeUndefined()
  })
})
