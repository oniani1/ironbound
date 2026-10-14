import { lazy, Suspense, useState } from 'react'
import { Link, Route, Routes, useSearchParams } from 'react-router-dom'

const Lab = lazy(() => import('./pages/Lab'))
const Vault = lazy(() => import('./pages/Vault'))
const ArmsStep = lazy(() => import('./components/onboarding/ArmsStep'))
const HowItWorks = lazy(() => import('./components/onboarding/HowItWorks'))
const ClaimStep = lazy(() => import('./components/onboarding/ClaimStep'))
const HowItWorksSection = lazy(() => import('./components/landing/HowItWorksSection'))
const ChestTiersSection = lazy(() => import('./components/landing/ChestTiersSection'))
const TrustSection = lazy(() => import('./components/landing/TrustSection'))
const FaqSection = lazy(() => import('./components/landing/FaqSection'))
const Footer = lazy(() => import('./components/landing/Footer'))

function OnboardingPreview() {
  const [step, setStep] = useState(0)
  const [params] = useSearchParams()
  const landing = params.get('view') === 'landing'
  return (
    <>
      <nav className="flex min-h-16 flex-wrap items-center justify-center gap-2 border-b border-ink-600 px-5 py-2" aria-label="Development previews">
        <Link to="/vault" className="min-h-11 px-3 py-2 text-sm text-bone-200">Vault</Link>
        <Link to="/dev/onboarding?view=landing" className="min-h-11 px-3 py-2 text-sm text-bone-200">Landing sections</Link>
        {['Arms', 'Stories', 'Claim'].map((label, index) => (
          <Link key={label} to="/dev/onboarding" className="min-h-11 px-3 py-2 text-sm text-bone-200" onClick={() => setStep(index)}>{label}</Link>
        ))}
      </nav>
      {landing ? (
        <main><HowItWorksSection /><ChestTiersSection /><TrustSection /><FaqSection /><Footer /></main>
      ) : (
        <main>
          {step === 0 ? (
            <ArmsStep onNext={() => setStep(1)} />
          ) : step === 1 ? (
            <HowItWorks onNext={() => setStep(2)} onBack={() => setStep(0)} />
          ) : (
            <ClaimStep onNext={() => window.location.assign('/vault')} onBack={() => setStep(1)} />
          )}
        </main>
      )}
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/lab" element={<Lab />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/vault/:uid" element={<Vault />} />
        <Route path="/dev/onboarding" element={<OnboardingPreview />} />
        <Route path="*" element={<Lab />} />
      </Routes>
    </Suspense>
  )
}
