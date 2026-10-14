import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { actions, useStore } from '../../lib/store'
import { sfx } from '../../lib/audio'
import { useOpening } from '../opening/OpeningProvider'
import { TRIAL_ITEM_ID } from '../../config/chests'
import { ITEM_BY_ID } from '../../data/items'
import { Button } from '../ui/Button'
import { Emblem } from '../layout/Logo'
import { Steps } from './steps'
import { asset } from '../../lib/asset'

type StepId = 'arms' | 'how' | 'trial' | 'claim'
const ORDER: StepId[] = ['arms', 'how', 'trial', 'claim']
const LABELS: Record<StepId, string> = { arms: 'Banner', how: 'The rules', trial: 'First chest', claim: 'Purse' }

/**
 * First-run flow. Value first: the visitor raises a banner, learns the rules in three
 * beats and opens a free chest before any sign-in. The purse comes last.
 */
export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const signedIn = useStore((s) => s.signedIn)
  const hasTrial = useStore((s) => s.pulls.some((p) => p.chestId === 'trial'))
  const [step, setStep] = useState<StepId>(hasTrial ? (signedIn ? 'claim' : 'claim') : 'arms')
  const { open } = useOpening()
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

  const openTrial = () => {
    open('trial', 1, {
      trial: true,
      fixedItemId: ITEM_BY_ID[TRIAL_ITEM_ID] ? TRIAL_ITEM_ID : undefined,
      onClose: () => go('claim'),
    })
  }

  let body: ReactNode
  if (step === 'arms') body = <Steps.Arms onNext={() => go('how')} />
  else if (step === 'how')
    body = (
      <Steps.How
        onNext={() => {
          // The last story's button reads "Open my free chest": open it straight away.
          setStep('trial')
          openTrial()
        }}
        onBack={() => go('arms')}
      />
    )
  else if (step === 'trial') body = <TrialIntro onOpen={openTrial} />
  else body = <Steps.Claim onNext={finish} />

  return (
    <motion.div
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
        <ol className="flex items-center gap-2 sm:gap-3" aria-label="Onboarding progress">
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
          className="text-[12px] text-bone-400 underline-offset-4 hover:text-bone-100 hover:underline"
        >
          {step === 'claim' ? 'Later' : 'Skip intro'}
        </button>
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
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

function TrialIntro({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
      <motion.img
        src={asset("/chests/trial.webp")}
        alt=""
        className="w-[min(340px,80vw)] drop-shadow-[0_30px_50px_oklch(0%_0_0/.7)]"
        initial={{ y: -40, opacity: 0, rotate: -3 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
      />
      <p className="eyebrow mt-6">On the house</p>
      <h2 className="font-display mt-2 text-[40px] font-semibold leading-[1.05] text-bone-50 sm:text-[52px]">Your first chest is free</h2>
      <p className="mt-3 max-w-[44ch] text-[15px] text-bone-300">
        It holds one real item worth $150 to $900. Break the seal, watch the light, and see what the armory gives you.
      </p>
      <Button size="lg" className="mt-7" onClick={onOpen} data-testid="open-trial">
        Break the seal
      </Button>
    </div>
  )
}

/** Cheap CSS embers drifting up behind the onboarding steps. */
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
