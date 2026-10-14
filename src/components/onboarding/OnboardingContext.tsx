import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useOpening } from '../opening/OpeningProvider'
import { getState } from '../../lib/store'
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

/**
 * Value first: "Open a free chest" opens the trial chest at once. Naming the banner and
 * claiming demo credit come after the reveal, and both can be skipped.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const { open } = useOpening()

  const start = useCallback(() => {
    const hasTrial = getState().pulls.some((p) => p.chestId === 'trial')
    if (hasTrial) {
      setActive(true)
      return
    }
    open('trial', 1, {
      trial: true,
      fixedItemId: ITEM_BY_ID[TRIAL_ITEM_ID] ? TRIAL_ITEM_ID : undefined,
      onClose: () => setActive(true),
    })
  }, [open])

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
