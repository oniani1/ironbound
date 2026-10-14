import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { actions, useStore } from '../../lib/store'
import { sfx } from '../../lib/audio'
import { ITEM_BY_ID } from '../../data/items'
import { money } from '../../lib/format'
import { Emblem } from '../layout/Logo'
import { ItemImg } from '../ui/ItemImg'
import { Steps } from './steps'
import './onboarding.css'

type StepId = 'arms' | 'claim'
const ORDER: StepId[] = ['arms', 'claim']
const LABELS: Record<StepId, string> = { arms: 'Your banner', claim: 'Demo credit' }

/**
 * Runs after the free trial chest: name the vault the first piece went into, then claim
 * demo credit. Both steps can be skipped; the chest came first.
 */
export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const profile = useStore((s) => s.profile)
  const trialPull = useStore((s) => s.pulls.find((p) => p.chestId === 'trial'))
  const trialItem = trialPull ? ITEM_BY_ID[trialPull.itemId] : undefined
  const [step, setStep] = useState<StepId>(profile ? 'claim' : 'arms')
  const navigate = useNavigate()
  const idx = ORDER.indexOf(step)
  const reduced = useReducedMotion()
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  const go = (s: StepId) => {
    sfx.whoosh(0.5)
    setStep(s)
  }

  const finish = () => {
    actions.completeOnboarding()
    onFinish()
    navigate('/chests')
  }

  useEffect(() => {
    // Escape also works before the entrance animation has moved focus into the dialog.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      actions.completeOnboarding()
      onFinish()
      navigate('/chests')
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onFinish, navigate])

  let body: ReactNode
  if (step === 'arms') body = <Steps.Arms onNext={() => go('claim')} />
  else body = <Steps.Claim onNext={finish} onBack={() => go('arms')} />

  return (
    <motion.div
      data-lenis-prevent
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Set up your demo vault"
      className="ib-setup fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.4 }}
      data-testid="onboarding"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); finish(); return }
        if (event.key !== 'Tab') return
        const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')].filter((element) => element.getClientRects().length > 0)
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
      }}
    >
      <div className="ib-setup-header">
        <Emblem size={30} />
        <ol className="ib-setup-progress" aria-label="Setup progress">
          {ORDER.map((s, i) => (
            <li key={s} className="caps" aria-current={i === idx ? 'step' : undefined}>
              <span className="tabular">{i < idx ? <Check size={16} weight="light" aria-label="Completed" /> : String(i + 1).padStart(2, '0')}</span>
              <span>{LABELS[s]}</span>
              {i === idx && <motion.span className="ib-setup-line" layoutId={reduced ? undefined : 'setup-progress'} transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <button
          onClick={() => (step === 'claim' ? finish() : go('claim'))}
          className="ib-setup-skip caps"
        >
          {step === 'claim' ? 'Later' : 'Skip'}
        </button>
      </div>

      {/* Continuity with the chest just opened. */}
      {trialItem && step === 'arms' && (
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="ib-setup-receipt"
        >
          <div className="h-12 w-12 shrink-0 p-1">
            <ItemImg item={trialItem} className="h-full w-full" />
          </div>
          <p className="text-[13px] leading-snug text-bone-300 tabular">
            {trialPull?.status === 'sold' ? (
              <>
                You sold your <b className="font-semibold text-bone-50">{trialItem.name}</b> for {money(trialPull.soldFor ?? 0)}. Raise a banner, or skip.
              </>
            ) : (
              <>
                Your <b className="font-semibold text-bone-50">{trialItem.name}</b> is in your demo vault. Raise a banner for it, or skip.
              </>
            )}
          </p>
        </motion.div>
      )}

      <div className="relative z-10 flex flex-1 items-start justify-center px-0 pb-8 sm:items-center sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="w-full max-w-[980px]"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: reduced ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              const active = document.activeElement
              if (active instanceof HTMLElement && dialog.current?.contains(active) && !active.closest('.ib-setup-header')) return
              dialog.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
            }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
