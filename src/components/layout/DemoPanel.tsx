import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { SlidersHorizontal } from '@phosphor-icons/react'
import { actions, useStore } from '../../lib/store'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'

// Open state shared by the panel and its toggles (floating on desktop, in the header on phones).
let isOpen = false
const listeners = new Set<() => void>()
function setOpen(next: boolean | ((o: boolean) => boolean)) {
  isOpen = typeof next === 'function' ? next(isOpen) : next
  listeners.forEach((l) => l())
}
function useOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => isOpen,
    () => isOpen,
  )
}

/** The small icon that opens the demo controls. Phones carry it in the header, so it never sits on content. */
export function DemoToggle({ className = '' }: { className?: string }) {
  const open = useOpen()
  const force = useStore((s) => s.settings.force)
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className={`relative place-items-center rounded-full bg-ink-900/85 text-bone-400 opacity-60 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-bone-100)_12%,transparent)] transition-[color,opacity] hover:text-bone-100 hover:opacity-100 ${className}`}
      title={force ? `Demo controls · next pull ${RARITIES[force].label}` : 'Demo controls'}
      aria-expanded={open}
      aria-label="Demo controls"
      data-testid="demo-toggle"
    >
      <SlidersHorizontal size={16} weight="light" aria-hidden />
      {force && <span className="absolute right-1 top-1 block h-2 w-2 rotate-45" style={{ background: RARITIES[force].cssVar }} aria-hidden />}
    </button>
  )
}

/**
 * Presenter controls for demos: choose the rarity of the next pull, top up the purse or
 * start over. Clearly labeled as a demo tool, never part of the product.
 */
export function DemoPanel() {
  const open = useOpen()
  const force = useStore((s) => s.settings.force)
  const navigate = useNavigate()
  return (
    <div className="fixed right-3 top-[calc(var(--header-h)+var(--ticker-h)+8px)] z-[35] flex flex-col items-end md:bottom-4 md:left-4 md:right-auto md:top-auto md:items-start">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="plate w-[264px] p-3.5 md:mb-2"
          >
            <p className="eyebrow !text-[10px]">Demo controls</p>
            <p className="mt-2 text-[12px] text-bone-300">Next pull lands as</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => actions.setForce(null)}
                className={`rounded-[4px] px-2 py-1.5 text-[11px] font-semibold ${force === null ? 'bg-bone-100 text-ink-950' : 'bg-ink-800 text-bone-300 hover:text-bone-50'}`}
              >
                Odds
              </button>
              {RARITY_ORDER.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    actions.setForce(r)
                  }}
                  className="rounded-[4px] px-2 py-1.5 text-[11px] font-semibold transition-colors"
                  style={
                    force === r
                      ? { background: RARITIES[r].cssVar, color: 'var(--color-ink-950)' }
                      : { background: `color-mix(in oklch, ${RARITIES[r].cssVar} 12%, var(--color-ink-800))`, color: RARITIES[r].cssVar }
                  }
                >
                  {RARITIES[r].label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  actions.addFunds(1000)
                }}
                className="rounded-[4px] bg-ink-800 px-2 py-1.5 text-[11px] font-semibold text-bone-200 hover:text-bone-50"
              >
                + $1,000
              </button>
              <button
                onClick={() => {
                  actions.reset()
                  setOpen(false)
                  navigate('/')
                }}
                className="rounded-[4px] bg-ink-800 px-2 py-1.5 text-[11px] font-semibold text-bone-200 hover:text-ember-400"
              >
                Reset demo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DemoToggle className="hidden h-9 w-9 md:grid" />
    </div>
  )
}
