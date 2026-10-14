import { Link } from 'react-router-dom'

/** Iron-bound chest emblem: domed lid, two straps and a keyhole. */
export function Emblem({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="emb-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d690" />
          <stop offset="0.55" stopColor="#c99a52" />
          <stop offset="1" stopColor="#8a6430" />
        </linearGradient>
      </defs>
      <path d="M5 17 C5 9 11 5 20 5 C29 5 35 9 35 17 Z" fill="url(#emb-brass)" />
      <rect x="5" y="18.5" width="30" height="16" rx="2" fill="url(#emb-brass)" />
      <rect x="12" y="5.6" width="3.2" height="28.9" fill="#2a1d12" opacity="0.55" />
      <rect x="24.8" y="5.6" width="3.2" height="28.9" fill="#2a1d12" opacity="0.55" />
      <rect x="5" y="16.6" width="30" height="2" fill="#2a1d12" opacity="0.7" />
      <circle cx="20" cy="24.5" r="2.4" fill="#1a110a" />
      <path d="M19 25.5 L21 25.5 L21.6 30 L18.4 30 Z" fill="#1a110a" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Ironbound home">
      <Emblem className="transition-transform duration-300 group-hover:-rotate-6" />
      {!compact && <span className="font-gothic text-[26px] leading-none tracking-[0.01em] text-bone-50">Ironbound</span>}
    </Link>
  )
}
