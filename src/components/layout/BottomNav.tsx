import { NavLink } from 'react-router-dom'
import { useStore } from '../../lib/store'

const ITEMS = [
  {
    to: '/',
    label: 'Home',
    icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  },
  {
    to: '/chests',
    label: 'Chests',
    icon: (
      <>
        <path d="M4 11c0-3.6 3.6-6 8-6s8 2.4 8 6z" />
        <rect x="4" y="12" width="16" height="7.5" rx="1" />
      </>
    ),
  },
  {
    to: '/vault',
    label: 'Vault',
    icon: (
      <>
        <rect x="4" y="4.5" width="16" height="15" rx="2" />
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 8.8V7M12 17v-1.8M15.2 12H17M7 12h1.8" />
      </>
    ),
  },
]

/** Thumb-reach navigation on phones. */
export function BottomNav() {
  const vaultCount = useStore((s) => s.pulls.filter((p) => p.status === 'vaulted').length)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-bone-100/[0.08] bg-ink-950/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="grid grid-cols-3">
        {ITEMS.map((i) => (
          <li key={i.to}>
            <NavLink
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${isActive ? 'text-brass-300' : 'text-bone-400'}`}
            >
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                {i.icon}
              </svg>
              {i.label}
              {i.to === '/vault' && vaultCount > 0 && (
                <span className="absolute right-[calc(50%-22px)] top-1.5 rounded-full bg-brass-500 px-1 text-[9px] font-bold leading-[14px] text-ink-950 tabular">{vaultCount}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
