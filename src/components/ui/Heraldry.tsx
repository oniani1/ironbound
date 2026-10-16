import { useId } from 'react'
import type { Arms, Charge, Ordinary, Tincture } from '../../types'
import { CHARGES } from './charges'

export const TINCTURES: Record<Tincture, { name: string; fill: string; light: string; plain: string }> = {
  or: { name: 'Or', fill: '#d4a33b', light: '#f0cd73', plain: 'Gold' },
  argent: { name: 'Argent', fill: '#cfcdc4', light: '#f3f1e8', plain: 'Silver' },
  gules: { name: 'Gules', fill: '#9e2a26', light: '#c84a3f', plain: 'Crimson' },
  azure: { name: 'Azure', fill: '#284a8f', light: '#4a72c0', plain: 'Blue' },
  vert: { name: 'Vert', fill: '#2c6640', light: '#4f9363', plain: 'Green' },
  sable: { name: 'Sable', fill: '#1d1916', light: '#3b342e', plain: 'Black' },
  purpure: { name: 'Purpure', fill: '#5f3470', light: '#8a5a9e', plain: 'Purple' },
  tenne: { name: 'Tenné', fill: '#b5602a', light: '#d98a52', plain: 'Tawny' },
  murrey: { name: 'Murrey', fill: '#6b1c3a', light: '#95405f', plain: 'Mulberry' },
  celeste: { name: 'Bleu celeste', fill: '#5a92c8', light: '#88b5e0', plain: 'Sky' },
  cendree: { name: 'Cendrée', fill: '#6d7276', light: '#979ba0', plain: 'Ash' },
}

export const ORDINARIES: Ordinary[] = ['chevron', 'saltire', 'cross', 'bend', 'pale', 'fess', 'chief', 'quarterly', 'bordure', 'pile', 'perpale', 'perfess', 'paly', 'barry', 'chequy', 'gyronny', 'plain']

export const ORDINARY_NAMES: Record<Ordinary, string> = {
  chevron: 'Chevron',
  saltire: 'Saltire',
  cross: 'Cross',
  bend: 'Bend',
  pale: 'Pale',
  fess: 'Fess',
  chief: 'Chief',
  quarterly: 'Quarterly',
  bordure: 'Bordure',
  pile: 'Pile',
  perpale: 'Per pale',
  perfess: 'Per fess',
  paly: 'Paly',
  barry: 'Barry',
  chequy: 'Chequy',
  gyronny: 'Gyronny',
  plain: 'Plain',
}

export const CHARGE_NAMES: Record<Charge, string> = {
  none: 'No charge',
  ...Object.fromEntries(Object.entries(CHARGES).map(([id, c]) => [id, c.name])),
} as Record<Charge, string>

const SHIELD = 'M6 6 H94 V52 C94 84 72 104 50 115 C28 104 6 84 6 52 Z'
/** The shield's edge, set in by eight units, for the bordure. */
const SHIELD_INNER = 'M14 14 H86 V52 C86 78 68 94 50 103 C32 94 14 78 14 52 Z'
const CX = 50
const CY = 56
/** The charge's box: a rampant beast stands most of the shield's height, as heraldry draws it. */
const CHARGE = 66

/** Eight wedges from the centre, every other one in the charge's tincture. */
function gyrons(fill: string) {
  const r = 160
  const wedges = []
  for (let i = 0; i < 8; i += 2) {
    const a0 = (i * Math.PI) / 4
    const a1 = ((i + 1) * Math.PI) / 4
    wedges.push(`${CX},${CY} ${CX + r * Math.cos(a0)},${CY + r * Math.sin(a0)} ${CX + r * Math.cos(a1)},${CY + r * Math.sin(a1)}`)
  }
  return (
    <g fill={fill}>
      {wedges.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </g>
  )
}

function OrdinaryShape({ ordinary, fill }: { ordinary: Ordinary; fill: string }) {
  switch (ordinary) {
    case 'chevron':
      return <polygon points="50,34 100,84 100,106 50,56 0,106 0,84" fill={fill} />
    case 'saltire':
      return (
        <g fill={fill}>
          <rect x="-30" y="48" width="160" height="17" transform="rotate(45 50 56)" />
          <rect x="-30" y="48" width="160" height="17" transform="rotate(-45 50 56)" />
        </g>
      )
    case 'cross':
      return (
        <g fill={fill}>
          <rect x="40" y="0" width="20" height="120" />
          <rect x="0" y="40" width="100" height="20" />
        </g>
      )
    case 'bend':
      return <rect x="-30" y="45" width="160" height="22" transform="rotate(45 50 56)" fill={fill} />
    case 'pale':
      return <rect x="36" y="0" width="28" height="120" fill={fill} />
    case 'fess':
      return <rect x="0" y="40" width="100" height="26" fill={fill} />
    case 'chief':
      return <rect x="0" y="0" width="100" height="36" fill={fill} />
    case 'quarterly':
      return (
        <g fill={fill}>
          <rect x="0" y="0" width="50" height="56" />
          <rect x="50" y="56" width="50" height="64" />
        </g>
      )
    case 'bordure':
      return <path d={`${SHIELD} ${SHIELD_INNER}`} fillRule="evenodd" fill={fill} />
    case 'pile':
      return <polygon points="8,6 92,6 50,98" fill={fill} />
    case 'perpale':
      return <rect x="50" y="0" width="50" height="120" fill={fill} />
    case 'perfess':
      return <rect x="0" y="0" width="100" height="56" fill={fill} />
    case 'paly':
      return (
        <g fill={fill}>
          {[16.5, 50, 83.5].map((x) => (
            <rect key={x} x={x - 8.25} y="0" width="16.5" height="120" />
          ))}
        </g>
      )
    case 'barry':
      return (
        <g fill={fill}>
          {[15, 45, 75, 105].map((y) => (
            <rect key={y} x="0" y={y} width="100" height="15" />
          ))}
        </g>
      )
    case 'chequy':
      return (
        <g fill={fill}>
          {Array.from({ length: 10 }, (_, row) =>
            Array.from({ length: 4 }, (_, k) => {
              const x = (k * 2 + (row % 2)) * 12.5
              return <rect key={`${row}-${k}`} x={x} y={row * 12.5} width="12.5" height="12.5" />
            }),
          )}
        </g>
      )
    case 'gyronny':
      return gyrons(fill)
    case 'plain':
      return null
  }
}

/** A charge drawn in a 66-unit box centred on the shield, with a dark edge so it reads on any tincture. */
function ChargeShape({ charge, fill }: { charge: Charge; fill: string }) {
  if (charge === 'none') return null
  const k = CHARGE / 512
  return (
    <g transform={`translate(${CX - CHARGE / 2} ${CY - CHARGE / 2}) scale(${k})`}>
      <path d={CHARGES[charge].d} fill={fill} stroke="#1a1512" strokeOpacity="0.55" strokeWidth={1.1 / k} strokeLinejoin="round" paintOrder="stroke" />
    </g>
  )
}

/** Heater shield with a field, an ordinary and a charge, lit like enamel on metal. */
export function Shield({ arms, size = 48, className = '' }: { arms: Arms; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const field = TINCTURES[arms.field]
  const charge = TINCTURES[arms.charge]
  const symbol = TINCTURES[arms.symbolColor]
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className={className} aria-label={blazon(arms)} role="img">
      <defs>
        <clipPath id={`c${id}`}>
          <path d={SHIELD} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="100" height="120" fill={field.fill} />
        <OrdinaryShape ordinary={arms.ordinary} fill={charge.fill} />
        <ChargeShape charge={arms.symbol} fill={symbol.fill} />
        <rect width="100" height="120" fill={`url(#g${id})`} />
      </g>
      <path d={SHIELD} fill="none" stroke="#e4c789" strokeOpacity="0.85" strokeWidth="3" />
      <path d={SHIELD} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" transform="translate(0 1)" />
    </svg>
  )
}

/** The arms in words, the way a herald would read them, for labels and screen readers. */
export function blazon(arms: Arms): string {
  const field = TINCTURES[arms.field].name
  const ordinary = arms.ordinary === 'plain' ? '' : `, ${ORDINARY_NAMES[arms.ordinary].toLowerCase()} ${TINCTURES[arms.charge].name}`
  const charge = arms.symbol === 'none' ? '' : `, ${CHARGE_NAMES[arms.symbol].toLowerCase()} ${TINCTURES[arms.symbolColor].name}`
  return `Arms: ${field}${ordinary}${charge}`
}

export const DEFAULT_ARMS: Arms = { field: 'gules', charge: 'or', ordinary: 'chevron', symbol: 'none', symbolColor: 'or' }
