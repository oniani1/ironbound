import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Coins, Plus } from '@phosphor-icons/react'
import { actions, useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { CountUp } from '../ui/CountUp'

/** The purse as a ledger figure, not a pill. Changes roll to the new value and show a signed delta. */
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
        }}
        className="group flex h-10 items-center gap-2 rounded-[6px] px-2.5 text-[14px] font-semibold text-bone-50 transition-colors hover:bg-bone-100/[0.05]"
        title="Add $500 demo credit"
        aria-label="Purse. Add $500 demo credit"
        data-testid="purse"
      >
        <Coins size={18} weight="light" className="text-brass-400" aria-hidden />
        <CountUp key={balance} from={from} to={balance} duration={0.9} format={(n) => money(n, { cents: !Number.isInteger(balance) })} />
        <Plus size={12} weight="bold" className="text-brass-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
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
