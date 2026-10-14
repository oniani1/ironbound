import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { actions, useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio'
import { CountUp } from '../ui/CountUp'

/** Balance pill. Changes roll to the new value and flash a signed delta. */
export function Purse() {
  const balance = useStore((s) => s.balance)
  const prev = useRef(balance)
  const [from, setFrom] = useState(balance)
  const [delta, setDelta] = useState<{ id: number; v: number } | null>(null)

  useEffect(() => {
    if (balance !== prev.current) {
      setFrom(prev.current)
      setDelta({ id: Date.now(), v: balance - prev.current })
      prev.current = balance
      const t = window.setTimeout(() => setDelta(null), 1800)
      return () => window.clearTimeout(t)
    }
  }, [balance])

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => {
          actions.addFunds(500)
          sfx.coins(6)
        }}
        className="group flex h-9 items-center gap-2 rounded-full border border-brass-500/30 bg-ink-900/80 pl-2 pr-3 text-[13px] font-semibold text-bone-50 transition-colors hover:border-brass-400/60"
        title="Add $500 demo credit"
        data-testid="purse"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#f6dc95,#b98734)] text-[10px] font-bold text-ink-950 shadow-[inset_0_-1px_0_#7a5420]">
          $
        </span>
        <CountUp key={balance} from={from} to={balance} duration={0.9} format={(n) => money(n, { cents: true })} />
        <span className="ml-0.5 text-brass-400 opacity-60 transition-opacity group-hover:opacity-100">+</span>
      </button>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none absolute right-2 top-6 text-[12px] font-semibold tabular ${delta.v >= 0 ? 'text-moss-400' : 'text-ember-400'}`}
          >
            {delta.v >= 0 ? '+' : ''}
            {money(delta.v)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
