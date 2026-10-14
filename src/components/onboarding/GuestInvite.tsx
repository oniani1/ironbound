import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { ITEM_BY_ID } from '../../data/items'
import { Button } from '../ui/Button'
import { ItemImg } from '../ui/ItemImg'
import { useOnboarding } from './OnboardingContext'
import './onboarding.css'

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
          className="ib-guest-invite"
          data-testid="guest-invite"
        >
          <div className="ib-invite-strip">
            <div className="ib-invite-object">
              <ItemImg item={item} className="h-full w-full" />
            </div>
            <p className="ib-invite-copy tabular">
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
            <div className="ib-invite-actions">
              <Button size="md" variant="secondary" onClick={start} data-testid="claim-credit">
                Claim demo credit
              </Button>
              <button type="button" className="ib-invite-dismiss" onClick={() => setDismissed(true)}>
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
