import { Check } from '@phosphor-icons/react'
import type { Arms, Charge, Tincture } from '../../types'
import { CHARGES, CHARGE_ORDER } from '../ui/charges'
import { CHARGE_NAMES, ORDINARIES, ORDINARY_NAMES, Shield, TINCTURES } from '../ui/Heraldry'

const TINCTURE_KEYS = Object.keys(TINCTURES) as Tincture[]
const PARTS = [
  { part: 'field', label: 'Field color', prefix: 'Field' },
  { part: 'charge', label: 'Ordinary color', prefix: 'Charge' },
  { part: 'symbolColor', label: 'Charge color', prefix: 'Symbol' },
] as const

/**
 * The pattern book: a name, the ordinary, the field and ordinary colors, a charge and its color.
 * Shared by the onboarding step and the vault's edit sheet. The caller shows the preview.
 */
export function ArmsEditor({ name, onName, arms, onArms, nameId = 'banner-name', compact = false }: { name?: string; onName?: (name: string) => void; arms: Arms; onArms: (arms: Arms) => void; nameId?: string; /** Onboarding: the ordinaries and charges as one scrolling strip each, so the step fits a screen. */ compact?: boolean }) {
  const strip = compact ? ' ib-arms-picker--compact ib-arms-picker--strip' : ''
  const tight = compact ? ' ib-arms-picker--compact' : ''
  function color(part: 'field' | 'charge' | 'symbolColor', tincture: Tincture) {
    if (part === 'symbolColor') return onArms({ ...arms, symbolColor: tincture })
    // The field and its ordinary never share a tincture: the other side steps to a contrast.
    const other = part === 'field' ? 'charge' : 'field'
    onArms({ ...arms, [part]: tincture, [other]: arms[other] === tincture ? (tincture === 'or' ? 'gules' : 'or') : arms[other] })
  }
  return (
    <>
      {onName && (
        <div className="ib-field">
          <label htmlFor={nameId}>Your name</label>
          <input id={nameId} className="ib-input" name="banner-name" autoComplete="nickname" maxLength={32} value={name ?? ''} onChange={(e) => onName(e.target.value)} />
        </div>
      )}
      <fieldset className={`ib-arms-picker${strip}`}>
        <legend>
          Choose your ordinary <span>the shape on your shield</span>
        </legend>
        <div className="ib-ordinary-options">
          {ORDINARIES.map((ordinary) => (
            <button type="button" key={ordinary} aria-pressed={arms.ordinary === ordinary} className="ib-ordinary plate" onClick={() => onArms({ ...arms, ordinary })}>
              <span aria-hidden="true">
                <Shield arms={{ ...arms, ordinary }} size={32} />
              </span>
              <span className="caps">{ORDINARY_NAMES[ordinary]}</span>
              {arms.ordinary === ordinary && <Check className="ib-ordinary-check" size={16} weight="light" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={`ib-arms-picker${strip}`}>
        <legend>
          Choose your charge <span>{CHARGE_NAMES[arms.symbol]}</span>
        </legend>
        <div className="ib-charge-options">
          {CHARGE_ORDER.map((charge) => (
            <button type="button" key={charge} aria-pressed={arms.symbol === charge} aria-label={CHARGE_NAMES[charge]} className="ib-charge plate" onClick={() => onArms({ ...arms, symbol: charge })}>
              <ChargeGlyph charge={charge} />
              <span className="caps">{CHARGE_NAMES[charge]}</span>
              {arms.symbol === charge && <Check className="ib-ordinary-check" size={16} weight="light" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>
      {PARTS.map(({ part, label, prefix }) =>
        part === 'symbolColor' && arms.symbol === 'none' ? null : (
          <fieldset key={part} className={`ib-arms-picker${tight}`}>
            <legend>
              {label} <span>{TINCTURES[arms[part]].plain}</span>
            </legend>
            <div className="ib-swatches">
              {TINCTURE_KEYS.map((tincture) => (
                <button type="button" key={tincture} className="ib-swatch" aria-label={`${prefix}: ${TINCTURES[tincture].plain} (${TINCTURES[tincture].name})`} aria-pressed={arms[part] === tincture} onClick={() => color(part, tincture)}>
                  <svg viewBox="0 0 32 40" width="28" height="35" aria-hidden="true">
                    <path d="M3 3h26v16c0 9-6 14-13 18C9 33 3 28 3 19Z" fill={TINCTURES[tincture].fill} stroke="var(--color-bone-400)" strokeWidth="1" />
                  </svg>
                  {arms[part] === tincture && <Check size={16} weight="light" className="ib-tincture-check" style={{ color: ['or', 'argent', 'celeste', 'cendree'].includes(tincture) ? 'var(--color-ink-950)' : 'var(--color-bone-100)' }} aria-hidden="true" />}
                  <span className="ib-tincture-name" aria-hidden="true">
                    {TINCTURES[tincture].name}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ),
      )}
    </>
  )
}

/** A charge on its own, in bone, for the pattern book's tiles. */
function ChargeGlyph({ charge }: { charge: Charge }) {
  if (charge === 'none') {
    return (
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeWidth="22" strokeDasharray="28 28" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d={CHARGES[charge].d} fill="currentColor" />
    </svg>
  )
}
