import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Arms, Charge } from '../../types'
import { CHARGES, CHARGE_ORDER } from './charges'
import { blazon, DEFAULT_ARMS, ORDINARIES, ORDINARY_NAMES, Shield, TINCTURES } from './Heraldry'

describe('the shield', () => {
  it('draws every ordinary and partition', () => {
    for (const ordinary of ORDINARIES) {
      const html = renderToStaticMarkup(<Shield arms={{ ...DEFAULT_ARMS, ordinary }} />)
      expect(html, ordinary).toContain('<svg')
      expect(html, ordinary).toContain(TINCTURES.gules.fill)
      if (ordinary !== 'plain') expect(html, ordinary).toContain(TINCTURES.or.fill)
      expect(ORDINARY_NAMES[ordinary]).toBeTruthy()
    }
  })

  it('draws every charge in its own tincture, with a credit', () => {
    for (const symbol of CHARGE_ORDER) {
      const arms: Arms = { ...DEFAULT_ARMS, symbol, symbolColor: 'argent' }
      const html = renderToStaticMarkup(<Shield arms={arms} />)
      if (symbol === 'none') {
        expect(html).not.toContain(TINCTURES.argent.fill)
        continue
      }
      const charge = CHARGES[symbol as Exclude<Charge, 'none'>]
      expect(html, symbol).toContain(TINCTURES.argent.fill)
      expect(html, symbol).toContain(charge.d.slice(0, 24))
      expect(charge.by, symbol).toBeTruthy()
      expect(['CC0', 'Public domain', 'CC BY 2.5', 'CC BY 3.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'Original'], symbol).toContain(charge.license)
    }
  })

  it('reads the arms in words', () => {
    expect(blazon({ field: 'azure', charge: 'or', ordinary: 'saltire', symbol: 'lion', symbolColor: 'argent' })).toBe('Arms: Azure, saltire Or, lion Argent')
    expect(blazon({ field: 'gules', charge: 'or', ordinary: 'plain', symbol: 'none', symbolColor: 'or' })).toBe('Arms: Gules')
  })
})
