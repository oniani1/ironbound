import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { actions, useStore } from '../../lib/store'
import { sfx } from '../../lib/audio'
import { ITEM_BY_ID } from '../../data/items'
import { money } from '../../lib/format'
import { Emblem } from '../layout/Logo'
import { ItemImg } from '../ui/ItemImg'
import { Steps } from './steps'

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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
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

  let body: ReactNode
  if (step === 'arms') body = <Steps.Arms onNext={() => go('claim')} />
  else body = <Steps.Claim onNext={finish} onBack={() => go('arms')} />

  return (
    <motion.div
      data-lenis-prevent
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      data-testid="onboarding"
    >
      <Embers />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,oklch(30%_0.08_50/.35),transparent_70%)]" />
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Emblem size={30} />
        <ol className="flex items-center gap-2 sm:gap-3" aria-label="Setup progress">
          {ORDER.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition-all duration-500 ${i < idx ? 'bg-brass-500 text-ink-950' : i === idx ? 'bg-[#8e2a22] text-bone-50 shadow-[0_0_0_3px_oklch(56%_0.17_27/.25)]' : 'bg-ink-800 text-bone-400'}`}
                aria-current={i === idx ? 'step' : undefined}
              >
                {i < idx ? '✓' : i + 1}
              </span>
              <span className={`hidden text-[12px] sm:inline ${i === idx ? 'text-bone-100' : 'text-bone-400'}`}>{LABELS[s]}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={() => (step === 'claim' ? finish() : go('claim'))}
          className="min-h-11 px-2 text-[13px] text-bone-400 underline-offset-4 hover:text-bone-100 hover:underline"
        >
          {step === 'claim' ? 'Later' : 'Skip'}
        </button>
      </div>

      {/* Continuity with the chest just opened. */}
      {trialItem && step === 'arms' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto mt-5 flex w-[min(100%-2rem,560px)] items-center gap-3 rounded-[16px] border border-brass-500/25 bg-brass-500/[0.07] p-3"
        >
          <div className="h-12 w-12 shrink-0 rounded-xl bg-ink-950/60 p-1">
            <ItemImg item={trialItem} className="h-full w-full" />
          </div>
          <p className="text-[14px] leading-snug text-bone-200">
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
            initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(4px)', transition: { duration: 0.25 } }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/** Cheap CSS embers drifting up behind the steps. */
function Embers() {
  const [embers] = useState(() =>
    Array.from({ length: 26 }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      delay: `${(i * 0.73) % 6}s`,
      duration: `${6 + ((i * 1.7) % 5)}s`,
      drift: `${((i * 13) % 60) - 30}px`,
      size: 2 + (i % 3),
    })),
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {embers.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-[-10px] block animate-ember-rise rounded-full bg-ember-400"
          style={{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.duration, boxShadow: '0 0 8px var(--color-ember-500)', ['--drift' as string]: e.drift }}
        />
      ))}
    </div>
  )
}
