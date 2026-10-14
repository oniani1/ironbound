import { NavLink } from 'react-router-dom'
import { House, TreasureChest, Vault } from '@phosphor-icons/react'
import { useStore } from '../../lib/store'

const ITEMS = [
  { to: '/', label: 'Home', Icon: House },
  { to: '/chests', label: 'Chests', Icon: TreasureChest },
  { to: '/vault', label: 'Vault', Icon: Vault },
]

/** Thumb-reach navigation on phones. */
export function BottomNav() {
  const vaultCount = useStore((s) => s.pulls.filter((p) => p.status === 'vaulted').length)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-bone-100/[0.07] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Primary">
      <ul className="grid grid-cols-3">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors ${isActive ? 'text-brass-300' : 'text-bone-400'}`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} weight={isActive ? 'regular' : 'light'} aria-hidden />
                  {label}
                  {to === '/vault' && vaultCount > 0 && (
                    <span className="absolute right-[calc(50%-20px)] top-1.5 min-w-[15px] rounded-full bg-brass-500 px-1 text-center text-[9px] font-bold leading-[15px] tracking-normal text-ink-950 tabular">{vaultCount}</span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
