import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Coins, Plus } from '@phosphor-icons/react'
import { actions, useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { CountUp } from '../ui/CountUp'

/**
 * The purse as a ledger figure, not a pill. Changes roll to the new value; money coming in, a sale
 * or a top-up, also shows its amount. A chest's price is never flashed as a loss (the founder, 2026-10-16).
 */
export function Purse() {
  const balance = useStore((s) => s.balance)
  const prev = useRef(balance)
  const [from, setFrom] = useState(balance)
  const [delta, setDelta] = useState<{ id: number; v: number } | null>(null)

  useEffect(() => {
    if (balance !== prev.current) {
      const gained = balance - prev.current
      setFrom(prev.current)
      prev.current = balance
      if (gained <= 0) {
        setDelta(null)
        return
      }
      setDelta({ id: Date.now(), v: gained })
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
        className="group flex h-11 items-center gap-2 rounded-[2px] px-2.5 text-[14px] font-semibold text-bone-50 transition-colors hover:bg-bone-100/[0.05]"
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
            className="pointer-events-none absolute right-2 top-6 text-[12px] font-semibold text-moss-400 tabular"
          >
            +{money(delta.v)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
