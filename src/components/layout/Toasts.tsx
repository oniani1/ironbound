import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { dismissToast, useToasts } from '../../lib/toast'

/** Status lines under the header, announced politely to screen readers. */
export function Toasts() {
  const toasts = useToasts()
  const reduced = useReducedMotion()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-h)+var(--ticker-h)+12px)] z-[45] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout={!reduced}
            initial={{ opacity: 0, y: reduced ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: reduced ? 0.2 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex max-w-[520px] items-center gap-2 rounded-full border border-bone-100/12 bg-ink-900/95 py-1 pl-4 pr-1 text-[14px] text-bone-100 shadow-[0_18px_40px_-18px_oklch(0%_0_0/.8)]"
          >
            <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-moss-400" aria-hidden />
            <span className="py-2">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-bone-400 hover:text-bone-100" aria-label="Dismiss">
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
