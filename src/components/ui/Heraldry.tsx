import { useId } from 'react'
import type { Arms, Ordinary, Tincture } from '../../types'

export const TINCTURES: Record<Tincture, { name: string; fill: string; light: string }> = {
  or: { name: 'Or', fill: '#d4a33b', light: '#f0cd73' },
  argent: { name: 'Argent', fill: '#cfcdc4', light: '#f3f1e8' },
  gules: { name: 'Gules', fill: '#9e2a26', light: '#c84a3f' },
  azure: { name: 'Azure', fill: '#284a8f', light: '#4a72c0' },
  vert: { name: 'Vert', fill: '#2c6640', light: '#4f9363' },
  sable: { name: 'Sable', fill: '#1d1916', light: '#3b342e' },
  purpure: { name: 'Purpure', fill: '#5f3470', light: '#8a5a9e' },
}

export const ORDINARIES: Ordinary[] = ['chevron', 'saltire', 'cross', 'bend', 'pale', 'fess', 'chief', 'quarterly']

export const ORDINARY_NAMES: Record<Ordinary, string> = {
  chevron: 'Chevron',
  saltire: 'Saltire',
  cross: 'Cross',
  bend: 'Bend',
  pale: 'Pale',
  fess: 'Fess',
  chief: 'Chief',
  quarterly: 'Quarterly',
}

const SHIELD = 'M6 6 H94 V52 C94 84 72 104 50 115 C28 104 6 84 6 52 Z'

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
  }
}

/** Heater shield with a field and one ordinary, lit like enamel on metal. */
export function Shield({ arms, size = 48, className = '' }: { arms: Arms; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const field = TINCTURES[arms.field]
  const charge = TINCTURES[arms.charge]
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className={className} aria-label={`Arms: ${field.name}, a ${ORDINARY_NAMES[arms.ordinary].toLowerCase()} ${charge.name}`} role="img">
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
        <rect width="100" height="120" fill={`url(#g${id})`} />
      </g>
      <path d={SHIELD} fill="none" stroke="#e4c789" strokeOpacity="0.85" strokeWidth="3" />
      <path d={SHIELD} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" transform="translate(0 1)" />
    </svg>
  )
}

export const DEFAULT_ARMS: Arms = { field: 'gules', charge: 'or', ordinary: 'chevron' }
