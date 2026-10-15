import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import type { Arms } from '../../types'
import { actions, useStore } from '../../lib/store'
import { Button, IconButton } from '../ui/Button'
import { blazon, DEFAULT_ARMS, Shield } from '../ui/Heraldry'
import { ArmsEditor } from '../onboarding/ArmsEditor'
import './experience.css'

/**
 * Edit your arms and name, from the vault. The same pattern book as onboarding, in a sheet:
 * the live shield beside the controls, Save writes the profile, Cancel and Escape leave it as
 * it was. Focus stays inside and returns to the opener.
 */
export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion()
  const profile = useStore((s) => s.profile)
  const [name, setName] = useState(profile?.name ?? 'Wanderer')
  const [arms, setArms] = useState<Arms>(profile?.arms ?? DEFAULT_ARMS)
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const nodes = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href]')
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      opener?.focus({ preventScroll: true })
    }
  }, [onClose])

  const save = () => {
    actions.setProfile({ name: name.trim() || 'Wanderer', arms })
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/75 p-3 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit your arms and name"
      data-testid="profile-sheet"
      data-lenis-prevent
    >
      <motion.div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="ib-sheet ib-ledger ib-profile-sheet w-full max-w-[760px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7"
        initial={{ y: reduced ? 0 : 36, opacity: reduced ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduced ? 0 : 24, opacity: reduced ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold text-bone-50">Your arms and name</p>
          <IconButton ref={closeRef} onClick={onClose} aria-label="Close">
            <X size={16} weight="light" />
          </IconButton>
        </div>
        <form
          className="ib-profile-layout mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="ib-profile-preview">
            <Shield arms={arms} size={140} className="ib-large-shield" />
            <p className="font-display text-[26px] leading-tight text-bone-50 break-words max-w-full m-0">{name.trim() || 'Wanderer'}</p>
            <p className="ib-kicker m-0">{blazon(arms).replace(/^Arms: /, '')}</p>
          </div>
          <div className="ib-arms-controls">
            <ArmsEditor name={name} onName={setName} arms={arms} onArms={setArms} nameId="profile-name" />
            <div className="ib-profile-footer">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" data-testid="profile-save">
                Save
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
