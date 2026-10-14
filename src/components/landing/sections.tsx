import HowItWorksSection from './HowItWorksSection'
import ChestTiersSection from './ChestTiersSection'
import TrustSection from './TrustSection'
import FaqSection from './FaqSection'
import Footer from './Footer'
import { NotablePulls } from '../social/NotablePulls'

/** Everything below the hero and the showcase. */
export function LandingSections() {
  return (
    <>
      <HowItWorksSection />
      <ChestTiersSection />
      <div className="border-t border-ink-700 py-16 sm:py-24">
        <NotablePulls className="mx-auto max-w-[1400px] px-4 sm:px-6" />
      </div>
      <TrustSection />
      <FaqSection />
      <Footer />
    </>
  )
}
