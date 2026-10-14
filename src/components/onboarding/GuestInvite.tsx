import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { ITEM_BY_ID } from '../../data/items'
import { Button } from '../ui/Button'
import { ItemImg } from '../ui/ItemImg'
import { useOnboarding } from './OnboardingContext'

/**
 * After the free chest, a guest lands where their choice took them: the vault after Keep,
 * the armory after Sell. This line confirms the outcome and offers demo credit; the banner
 * and sign-in stay optional.
 */
export function GuestInvite() {
  const signedIn = useStore((s) => s.signedIn)
  const trial = useStore((s) => s.pulls.find((p) => p.chestId === 'trial'))
  const { pathname } = useLocation()
  const { start, active } = useOnboarding()
  const [dismissed, setDismissed] = useState(false)
  const reduced = useReducedMotion()
  const item = trial ? ITEM_BY_ID[trial.itemId] : undefined
  const show = !signedIn && !!trial && !!item && !dismissed && !active && pathname !== '/'

  return (
    <AnimatePresence initial={false}>
      {show && item && trial && (
        <motion.div
          key="invite"
          initial={{ opacity: 0, y: reduced ? 0 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: reduced ? 0.2 : 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6"
          data-testid="guest-invite"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px] border border-brass-500/25 bg-brass-500/[0.07] p-3 sm:p-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-ink-950/60 p-1">
              <ItemImg item={item} className="h-full w-full" />
            </div>
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-bone-200">
              {trial.status === 'sold' ? (
                <>
                  <b className="font-semibold text-bone-50">{item.name} sold.</b> {money(trial.soldFor ?? 0)} demo credit added.
                </>
              ) : (
                <>
                  Your <b className="font-semibold text-bone-50">{item.name}</b> is in your demo vault.
                </>
              )}
              <span className="block text-bone-300">Claim $1,000 demo credit toward your next chest. A banner is optional.</span>
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button size="sm" className="!h-11 flex-1 sm:flex-none" onClick={start} data-testid="claim-credit">
                Claim demo credit
              </Button>
              <Button size="sm" variant="ghost" className="!h-11" onClick={() => setDismissed(true)}>
                Not now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
