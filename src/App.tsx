import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { OpeningProvider } from './components/opening/OpeningProvider'
import { OnboardingProvider } from './components/onboarding/OnboardingContext'
import { startFeed } from './lib/feed'
import Landing from './pages/Landing'

const Chests = lazy(() => import('./pages/Chests'))
const ChestDetail = lazy(() => import('./pages/ChestDetail'))
const Lab = lazy(() => import('./pages/Lab'))
const RenderChest = lazy(() => import('./pages/RenderChest'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}

function VaultSoon() {
  return <div className="mx-auto max-w-[1400px] px-6 py-24 text-bone-300">Vault coming in the next merge.</div>
}

export default function App() {
  useEffect(() => {
    startFeed()
  }, [])
  return (
    <OpeningProvider>
      <OnboardingProvider>
        <ScrollToTop />
        <Suspense fallback={<div className="min-h-[100dvh] bg-ink-950" />}>
          <Routes>
            <Route path="/lab" element={<Lab />} />
            <Route path="/dev/render/:id" element={<RenderChest />} />
            <Route path="/" element={<Shell><Landing /></Shell>} />
            <Route path="/chests" element={<Shell><Chests /></Shell>} />
            <Route path="/chests/:id" element={<Shell><ChestDetail /></Shell>} />
            <Route path="/vault/*" element={<Shell><VaultSoon /></Shell>} />
            <Route path="*" element={<Shell><Landing /></Shell>} />
          </Routes>
        </Suspense>
      </OnboardingProvider>
    </OpeningProvider>
  )
}
