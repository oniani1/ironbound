import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Check, Copy, ShareNetwork, X } from '@phosphor-icons/react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { money, shortEra } from '../../lib/format'
import { Button, IconButton } from '../ui/Button'
import { ItemImg } from '../ui/ItemImg'
import { Pips } from '../ui/RarityTag'

export interface SharePull {
  item: Item
  rarity: RarityId
  chestName: string
  /** Owner's display name, shown on the card. */
  by?: string
  at?: number
}

export function shareText({ item, rarity, chestName }: SharePull) {
  return `Pulled a ${RARITIES[rarity].label} ${item.name} (${money(item.value)}) from the ${chestName} on Ironbound. Demo pull, simulated value.`
}

/**
 * The share card for one pull: the piece in its rarity light, the stamp, the name and the
 * value, set like a catalog plate. Copy the line, or hand it to the system share sheet where
 * the browser offers one. Downloads are left out on purpose: sandboxed hosts block them.
 */
export function ShareSheet({ pull, onClose }: { pull: SharePull; onClose: () => void }) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState<'idle' | 'done' | 'manual'>('idle')
  const r = RARITIES[pull.rarity]
  const text = shareText(pull)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const date = new Date(pull.at ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // Focus stays inside the sheet; Escape closes it and focus returns to the opener.
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
      const nodes = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, [href]')
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied('done')
    } catch {
      // Some hosts refuse clipboard access; select the line so it can be copied by hand.
      setCopied('manual')
      window.setTimeout(() => textRef.current?.select(), 0)
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: `${pull.item.name} · Ironbound`, text })
    } catch {
      // Dismissed, or blocked by the host. Copy stays available.
    }
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/80 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${pull.item.name}`}
      data-testid="share-sheet"
      data-lenis-prevent
    >
      <motion.div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-t-[10px] border border-bone-100/10 bg-ink-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[10px]"
        initial={{ y: reduced ? 0 : 36, opacity: reduced ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: reduced ? 0 : 24, opacity: reduced ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <p className="caps text-bone-400">Share this pull</p>
          <IconButton ref={closeRef} onClick={onClose} aria-label="Close">
            <X size={16} weight="light" />
          </IconButton>
        </div>

        {/* The card itself. */}
        <figure
          className="relative mt-4 overflow-hidden rounded-[6px] border border-bone-100/[0.08] bg-ink-950"
          style={{ '--light': r.cssVar } as CSSProperties}
          data-testid="share-card"
        >
          <div className="vitrine relative aspect-[4/3.4]">
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3.5">
              <span className="font-gothic text-[17px] leading-none text-bone-100">Ironbound</span>
              <span className="caps !text-[10px] text-bone-400">{pull.chestName}</span>
            </div>
            <ItemImg item={pull.item} size="full" eager alt="" className="relative h-full w-full p-[13%] drop-shadow-[0_18px_26px_oklch(0%_0_0/.6)]" />
          </div>
          <figcaption className="border-t border-bone-100/[0.08] px-4 pb-4 pt-3.5">
            <div className="flex items-center gap-2.5">
              <span className="font-gothic text-[26px] leading-none" style={{ color: r.cssVar }}>
                {r.stamp}
              </span>
              <Pips tier={r.tier} color={r.cssVar} />
            </div>
            <p className="font-display mt-2 text-[26px] font-semibold leading-[1.05] text-bone-50">{pull.item.name}</p>
            <p className="mt-1 text-[12px] text-bone-400">
              {pull.item.provenance === 'forged' ? `New · ${pull.item.maker ?? 'Master smith'}` : `${shortEra(pull.item.era)} · ${pull.item.origin}`}
            </p>
            <div className="mt-3 flex items-end justify-between border-t border-bone-100/[0.08] pt-3">
              <span className="text-[26px] font-semibold leading-none text-bone-50 tabular">{money(pull.item.value)}</span>
              <span className="text-right text-[11px] leading-tight text-bone-400">
                {pull.by ? `${pull.by} · ` : ''}
                {date}
                <br />
                Demo · simulated value
              </span>
            </div>
          </figcaption>
        </figure>

        <textarea
          ref={textRef}
          readOnly
          value={text}
          rows={2}
          aria-label="Share text"
          className={`mt-4 w-full resize-none rounded-[6px] border border-bone-100/10 bg-ink-950 px-3 py-2 text-[13px] leading-snug text-bone-200 focus:border-brass-500/60 focus:outline-none ${copied === 'manual' ? '' : 'sr-only'}`}
        />
        {copied === 'manual' && <p className="mt-1.5 text-[12px] text-bone-400">This page cannot reach your clipboard. The line is selected: press Ctrl+C or Cmd+C.</p>}

        <div className={`mt-4 grid gap-2 ${canShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button variant={canShare ? 'secondary' : 'primary'} icon={copied === 'done' ? <Check size={16} weight="bold" /> : <Copy size={16} weight="light" />} onClick={copy} data-testid="share-copy">
            {copied === 'done' ? 'Copied' : 'Copy text'}
          </Button>
          {canShare && (
            <Button variant="primary" icon={<ShareNetwork size={16} weight="light" />} onClick={share}>
              Share
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
