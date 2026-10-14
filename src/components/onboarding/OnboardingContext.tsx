import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const start = useCallback(() => setActive(true), [])
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
