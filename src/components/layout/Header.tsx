import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { useStore } from '../../lib/store'
import { Logo } from './Logo'
import { Purse } from './Purse'
import { LiveTicker } from './LiveTicker'
import { Shield } from '../ui/Heraldry'
import { DemoToggle } from './DemoPanel'
import { Button } from '../ui/Button'
import { useGuestCta, useOnboarding } from '../onboarding/OnboardingContext'

const NAV = [
  { to: '/chests', label: 'Chests' },
  { to: '/vault', label: 'Vault' },
]

/**
 * A quiet header: wordmark, small caps navigation with a brass hairline under the active
 * page, sound, purse and banner. Transparent over the landing hero, ink with blur elsewhere.
 */
export function Header() {
  const signedIn = useStore((s) => s.signedIn)
  const profile = useStore((s) => s.profile)
  const vaultCount = useStore((s) => s.pulls.filter((p) => p.status === 'vaulted').length)
  const [scrolled, setScrolled] = useState(false)
  const { start } = useOnboarding()
  const guestCta = useGuestCta()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || pathname !== '/'

  return (
    <header
      className={`sticky top-0 z-30 transition-[background-color,box-shadow] duration-500 ${solid ? 'bg-ink-950 shadow-[0_1px_0_color-mix(in_oklch,var(--color-bone-100)_7%,transparent)]' : 'bg-transparent'}`}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1400px] items-center gap-10 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `relative py-2 text-[14px] font-medium transition-colors duration-200 ${isActive ? 'text-bone-50' : 'text-bone-300 hover:text-bone-50'}`}
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  {n.to === '/vault' && vaultCount > 0 && <sup className="ml-1 text-[12px] text-brass-300 tabular">{vaultCount}</sup>}
                  {isActive && <motion.span layoutId="nav-hairline" className="absolute inset-x-0 -bottom-0.5 mx-auto h-px w-6 bg-brass-400" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {signedIn && <DemoToggle className="grid h-11 w-11 md:hidden" />}
          {signedIn ? (
            <>
              <Purse />
              {profile && (
                <Link to="/vault" aria-label="Your vault" className="hidden sm:block">
                  <Shield arms={profile.arms} size={26} />
                </Link>
              )}
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => start()} data-testid="header-cta">
              {guestCta}
            </Button>
          )}
        </div>
      </div>
      <LiveTicker />
    </header>
  )
}
