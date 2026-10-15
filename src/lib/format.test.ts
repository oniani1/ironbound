import { describe, expect, it } from 'vitest'
import { ITEMS } from '../data/items'
import { photoCredit } from './format'

describe('photo credits', () => {
  it('reads the author and license of every photo, with a link to the license', () => {
    for (const item of ITEMS) {
      const c = photoCredit(item)
      expect(c.license, item.id).not.toBeNull()
      expect(c.licenseUrl, item.id).toMatch(/^https:\/\/creativecommons\.org\//)
      expect(c.by.length, item.id).toBeGreaterThan(2)
      expect(c.by, item.id).not.toMatch(/CC0|CC BY|[,\s]$/)
    }
  })

  it('names the change and carries share-alike terms to the cutout', () => {
    expect(photoCredit({ credit: 'The Metropolitan Museum of Art, Open Access (CC0)', provenance: 'antique' })).toMatchObject({ label: 'Photograph', by: 'The Metropolitan Museum of Art, Open Access', license: 'CC0', publicDomain: true })
    const sa = photoCredit({ credit: 'Photo: Nicubunu, CC BY-SA 3.0', provenance: 'forged', photoExact: true })
    expect(sa).toMatchObject({ label: 'Photo', by: 'Nicubunu', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', publicDomain: false })
    expect(sa.changes).toMatch(/Cut out .*same license/)
    expect(photoCredit({ credit: 'Example photo: The Swedish History Museum, Stockholm, CC BY 2.0', provenance: 'forged', photoExact: false })).toMatchObject({ label: 'Example photo', by: 'The Swedish History Museum, Stockholm', license: 'CC BY 2.0' })
  })
})
