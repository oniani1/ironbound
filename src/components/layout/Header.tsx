import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { actions, useStore } from '../../lib/store'
import { Logo } from './Logo'
import { Purse } from './Purse'
import { LiveTicker } from './LiveTicker'
import { Shield } from '../ui/Heraldry'
import { Button } from '../ui/Button'
import { useOnboarding } from '../onboarding/OnboardingContext'

const NAV = [
  { to: '/chests', label: 'Chests' },
  { to: '/vault', label: 'Vault' },
]

export function Header() {
  const signedIn = useStore((s) => s.signedIn)
  const profile = useStore((s) => s.profile)
  const sound = useStore((s) => s.settings.sound)
  const vaultCount = useStore((s) => s.pulls.filter((p) => p.status === 'vaulted').length)
  const [scrolled, setScrolled] = useState(false)
  const { start } = useOnboarding()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-30 transition-colors duration-300 ${scrolled || pathname !== '/' ? 'bg-ink-950/85 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${isActive ? 'text-bone-50' : 'text-bone-300 hover:text-bone-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  {n.to === '/vault' && vaultCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-brass-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brass-300 tabular">{vaultCount}</span>
                  )}
                  {isActive && <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-brass-400 to-transparent" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => actions.toggleSound()}
            className="hidden h-9 w-9 place-items-center rounded-full text-bone-300 transition-colors hover:bg-bone-100/[0.06] hover:text-bone-50 sm:grid"
            aria-label={sound ? 'Mute sound' : 'Unmute sound'}
            title={sound ? 'Sound on' : 'Sound off'}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
              {sound ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
          </button>
          {signedIn ? (
            <>
              <Purse />
              {profile && <Shield arms={profile.arms} size={26} className="hidden sm:block" />}
            </>
          ) : (
            <Button size="sm" onClick={() => start()} data-testid="header-cta">
              Open a free chest
            </Button>
          )}
        </div>
      </div>
      <LiveTicker />
    </header>
  )
}
