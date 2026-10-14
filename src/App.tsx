import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { DemoPanel } from './components/layout/DemoPanel'
import { OpeningProvider } from './components/opening/OpeningProvider'
import { OnboardingProvider } from './components/onboarding/OnboardingContext'
import { GuestInvite } from './components/onboarding/GuestInvite'
import { Toasts } from './components/layout/Toasts'
import { startFeed } from './lib/feed'
import { scrollToTop, startSmoothScroll } from './lib/smoothScroll'
import 'lenis/dist/lenis.css'
import Landing from './pages/Landing'

const Chests = lazy(() => import('./pages/Chests'))
const ChestDetail = lazy(() => import('./pages/ChestDetail'))
const Lab = lazy(() => import('./pages/Lab'))
const RenderChest = lazy(() => import('./pages/RenderChest'))
const Vault = lazy(() => import('./pages/Vault'))
const ItemPage = lazy(() => import('./pages/Item'))

/** Page key: the vault list and an item inside it are different pages; chest ids too. */
function pageKey(pathname: string) {
  return pathname.replace(/\/$/, '') || '/'
}

/**
 * The header, tab bar and demo controls persist; pages cross-fade with a short rise.
 * Scroll resets once the old page has left, so the jump is never visible.
 */
function AppRoutes() {
  const location = useLocation()
  const bare = location.pathname.startsWith('/lab') || location.pathname.startsWith('/dev/')
  if (bare) {
    return (
      <Routes location={location}>
        {import.meta.env.DEV && <Route path="/lab" element={<Lab />} />}
        {import.meta.env.DEV && <Route path="/dev/render/:id" element={<RenderChest />} />}
      </Routes>
    )
  }
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <main>
        <GuestInvite />
        <AnimatePresence mode="wait" initial={false} onExitComplete={scrollToTop}>
          <motion.div
            key={pageKey(location.pathname)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: [0.7, 0, 0.84, 0] } }}
          >
            <Suspense fallback={<div className="min-h-[70dvh]" />}>
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/chests" element={<Chests />} />
                <Route path="/chests/:id" element={<ChestDetail />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/vault/:uid" element={<Vault />} />
                <Route path="/item/:id" element={<ItemPage />} />
                <Route path="*" element={<Landing />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <DemoPanel />
      <Toasts />
    </div>
  )
}

export default function App() {
  useEffect(() => startSmoothScroll(), [])

  useEffect(() => startFeed(), [])
  return (
    <OpeningProvider>
      <OnboardingProvider>
        <Suspense fallback={<div className="min-h-[100dvh] bg-ink-950" />}>
          <AppRoutes />
        </Suspense>
      </OnboardingProvider>
    </OpeningProvider>
  )
}
