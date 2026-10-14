import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOpening } from '../opening/OpeningProvider'
import { getState, useStore } from '../../lib/store'
import { TRIAL_ITEM_ID } from '../../config/chests'
import { ITEM_BY_ID } from '../../data/items'

const Onboarding = lazy(() => import('./Onboarding'))

interface Ctx {
  start: () => void
  active: boolean
}

const OnboardingContext = createContext<Ctx | null>(null)

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider')
  return ctx
}

/** The guest call to action: the free chest first, then demo credit once it is used. */
export function useGuestCta() {
  const used = useStore((s) => s.pulls.some((p) => p.chestId === 'trial'))
  return used ? 'Claim demo credit' : 'Open a free chest'
}

/**
 * Value first: "Open a free chest" opens the trial chest at once. Afterwards the guest goes
 * where their choice points: the vault after Keep, the armory after Sell. The banner and
 * demo credit are offered there and stay optional.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const { open } = useOpening()
  const navigate = useNavigate()

  const start = useCallback(() => {
    const hasTrial = getState().pulls.some((p) => p.chestId === 'trial')
    if (hasTrial) {
      setActive(true)
      return
    }
    open('trial', 1, {
      trial: true,
      fixedItemId: ITEM_BY_ID[TRIAL_ITEM_ID] ? TRIAL_ITEM_ID : undefined,
      onClose: (pulls) => {
        const pull = getState().pulls.find((p) => p.uid === pulls[0]?.uid)
        if (pull) navigate(pull.status === 'sold' ? '/chests' : '/vault')
      },
    })
  }, [open, navigate])

  const value = useMemo(() => ({ start, active }), [start, active])
  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {active && (
        <Suspense fallback={null}>
          <Onboarding onFinish={() => setActive(false)} />
        </Suspense>
      )}
    </OnboardingContext.Provider>
  )
}
