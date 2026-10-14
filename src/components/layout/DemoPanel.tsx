import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { actions, useStore } from '../../lib/store'
import { RARITIES, RARITY_ORDER } from '../../config/rarity'
import { sfx } from '../../lib/audio'

/**
 * Presenter controls for demos: choose the rarity of the next pull, top up the purse or
 * start over. Clearly labeled as a demo tool, never part of the product.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(false)
  const force = useStore((s) => s.settings.force)
  return (
    <div className="fixed bottom-[calc(136px+env(safe-area-inset-bottom))] right-3 z-[35] flex flex-col items-end md:bottom-4 md:left-4 md:right-auto md:items-start">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="plate mb-2 w-[260px] rounded-[16px] p-3"
          >
            <p className="eyebrow !text-[10px]">Demo controls</p>
            <p className="mt-2 text-[12px] text-bone-300">Next pull lands as</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => actions.setForce(null)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${force === null ? 'bg-bone-100 text-ink-950' : 'bg-ink-800 text-bone-300 hover:text-bone-50'}`}
              >
                Odds
              </button>
              {RARITY_ORDER.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    actions.setForce(r)
                    sfx.click()
                  }}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors"
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
                  sfx.coins(6)
                }}
                className="rounded-lg bg-ink-800 px-2 py-1.5 text-[11px] font-semibold text-bone-200 hover:text-bone-50"
              >
                + $1,000
              </button>
              <button
                onClick={() => {
                  actions.reset()
                  window.location.assign('/')
                }}
                className="rounded-lg bg-ink-800 px-2 py-1.5 text-[11px] font-semibold text-bone-200 hover:text-ember-400"
              >
                Reset demo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-bone-100/10 bg-ink-900/85 px-2.5 py-1 text-[10px] font-semibold text-bone-400 opacity-70 backdrop-blur transition-[color,opacity] hover:text-bone-100 hover:opacity-100 md:px-3 md:py-1.5 md:text-[11px]"
        aria-expanded={open}
        data-testid="demo-toggle"
      >
        <span className="block h-1.5 w-1.5 rounded-full" style={{ background: force ? RARITIES[force].cssVar : 'var(--color-bone-400)' }} />
        Demo{force ? ` · ${RARITIES[force].label}` : ''}
      </button>
    </div>
  )
}
