import { useCallback, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import type { Arms, Charge, Tincture } from '../../types'
import { Button } from '../ui/Button'
import { CHARGES, CHARGE_ORDER } from '../ui/charges'
import { CHARGE_NAMES, ORDINARIES, ORDINARY_NAMES, Shield, TINCTURES } from '../ui/Heraldry'
import { EXPO } from '../vault/Experience'

const TINCTURE_KEYS = Object.keys(TINCTURES) as Tincture[]

const STEPS = [
  { id: 'name', label: 'Name', title: 'Your name', hint: 'It stands under your banner and on your vault.' },
  { id: 'ordinary', label: 'Ordinary', title: 'Choose your ordinary', hint: 'The bold shape across your shield.' },
  { id: 'charge', label: 'Charge', title: 'Choose your charge', hint: 'The figure at the heart of your shield.' },
  { id: 'colors', label: 'Colors', title: 'Choose your colors', hint: 'Heralds call them tinctures. The field and its ordinary never match.' },
] as const

type Part = 'field' | 'charge' | 'symbolColor'
const PARTS: { part: Part; label: string }[] = [
  { part: 'field', label: 'Field' },
  { part: 'charge', label: 'Ordinary' },
  { part: 'symbolColor', label: 'Charge' },
]

/**
 * The pattern book, one page at a time: name, ordinary, charge, colors. Every choice on a page
 * is in view at once; Next and Back turn the pages, and the step names above them jump. Shared
 * by the onboarding step and the vault's edit sheet. The caller shows the preview.
 */
export function ArmsEditor({
  name,
  onName,
  arms,
  onArms,
  nameId = 'banner-name',
  doneLabel,
  onDone,
  lead,
  saveAnyPage = false,
  size = 'md',
}: {
  name: string
  onName: (name: string) => void
  arms: Arms
  onArms: (arms: Arms) => void
  nameId?: string
  /** The last page's main action. */
  doneLabel: ReactNode
  onDone: () => void
  /** Left of the actions on the first page, where Back stands on the others. */
  lead?: ReactNode
  /** Editing from the vault: Save in plain words on every page, beside Next. */
  saveAnyPage?: boolean
  size?: 'md' | 'lg'
}) {
  const reduced = useReducedMotion()
  const id = useId()
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  // A swatch under the pointer or focus names its color in the legend before it is chosen.
  const [peek, setPeek] = useState<{ part: Part; tincture: Tincture } | null>(null)
  const turned = useRef(false)
  const step = STEPS[page] ?? STEPS[0]
  const next = STEPS[page + 1]
  const titleId = `${id}-title`

  // A turned page takes focus at its heading, so a screen reader reads where you are. On a short
  // screen the shield and the whole page are brought into view together.
  const arrive = useCallback(
    (heading: HTMLHeadingElement | null) => {
      if (!heading || !turned.current) return
      turned.current = false
      heading.focus({ preventScroll: true })
      const book = heading.closest('.ib-book')
      if (book && book.getBoundingClientRect().bottom > window.innerHeight) book.parentElement?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    },
    [reduced],
  )

  function turn(to: number) {
    if (to === page || to < 0 || to >= STEPS.length) return
    setDirection(to > page ? 1 : -1)
    turned.current = true
    setPeek(null)
    setPage(to)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (next) turn(page + 1)
    else onDone()
  }

  function color(part: Part, tincture: Tincture) {
    if (part === 'symbolColor') return onArms({ ...arms, symbolColor: tincture })
    // The field and its ordinary never share a tincture: the other side steps to a contrast.
    const other = part === 'field' ? 'charge' : 'field'
    onArms({ ...arms, [part]: tincture, [other]: arms[other] === tincture ? (tincture === 'or' ? 'gules' : 'or') : arms[other] })
  }

  const slide = reduced ? 0 : 28
  const leaf = {
    enter: (d: number) => ({ opacity: 0, x: d * slide }),
    center: { opacity: 1, x: 0, transition: { duration: reduced ? 0.12 : 0.28, ease: EXPO } },
    exit: (d: number) => ({ opacity: 0, x: d * -slide, transition: { duration: reduced ? 0.08 : 0.12, ease: 'easeIn' as const } }),
  }

  let body: ReactNode
  if (step.id === 'name') {
    body = (
      <input
        id={nameId}
        className="ib-input"
        name="banner-name"
        autoComplete="nickname"
        enterKeyHint="next"
        maxLength={32}
        aria-labelledby={titleId}
        aria-describedby={`${id}-hint`}
        value={name}
        onChange={(e) => onName(e.target.value)}
      />
    )
  } else if (step.id === 'ordinary') {
    body = (
      <div className="ib-tiles" role="group" aria-labelledby={titleId}>
        {ORDINARIES.map((ordinary) => (
          <button type="button" key={ordinary} className="ib-tile" aria-pressed={arms.ordinary === ordinary} onClick={() => onArms({ ...arms, ordinary })}>
            <span aria-hidden="true">
              <Shield arms={{ ...arms, ordinary, symbol: 'none' }} size={30} />
            </span>
            <span>{ORDINARY_NAMES[ordinary]}</span>
          </button>
        ))}
      </div>
    )
  } else if (step.id === 'charge') {
    body = (
      <div className="ib-tiles" role="group" aria-labelledby={titleId}>
        {CHARGE_ORDER.map((charge) => (
          <button type="button" key={charge} className="ib-tile ib-tile--charge" aria-pressed={arms.symbol === charge} onClick={() => onArms({ ...arms, symbol: charge })}>
            <ChargeGlyph charge={charge} />
            <span>{CHARGE_NAMES[charge]}</span>
          </button>
        ))}
      </div>
    )
  } else {
    body = (
      <div className="ib-palettes">
        {PARTS.map(({ part, label }) => {
          const absent = part === 'charge' ? arms.ordinary === 'plain' : part === 'symbolColor' ? arms.symbol === 'none' : false
          const shown = TINCTURES[peek?.part === part ? peek.tincture : arms[part]]
          return (
            <fieldset key={part} className="ib-palette">
              <legend>
                {label}
                {!absent && (
                  <span>
                    {shown.plain} · {shown.name}
                  </span>
                )}
              </legend>
              {absent ? (
                <p className="ib-palette-note">{part === 'charge' ? 'A plain field has no ordinary to color.' : 'No charge chosen. Add one on the Charge page.'}</p>
              ) : (
                <div className="ib-swatches">
                  {TINCTURE_KEYS.map((tincture) => (
                    <button
                      type="button"
                      key={tincture}
                      className="ib-tile ib-swatch"
                      aria-label={`${label}: ${TINCTURES[tincture].plain} (${TINCTURES[tincture].name})`}
                      aria-pressed={arms[part] === tincture}
                      onClick={() => color(part, tincture)}
                      onPointerEnter={() => setPeek({ part, tincture })}
                      onPointerLeave={() => setPeek(null)}
                      onFocus={() => setPeek({ part, tincture })}
                      onBlur={() => setPeek(null)}
                    >
                      <svg viewBox="0 0 32 40" aria-hidden="true">
                        <path d="M3 3h26v16c0 9-6 14-13 18C9 33 3 28 3 19Z" fill={TINCTURES[tincture].fill} stroke="var(--color-bone-400)" strokeWidth="1" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          )
        })}
      </div>
    )
  }

  return (
    <form className="ib-book" onSubmit={submit}>
      <ol className="ib-book-steps" aria-label="Pattern book pages">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button type="button" className="ib-book-step" aria-current={i === page ? 'step' : undefined} onClick={() => turn(i)}>
              <span className="tabular" aria-hidden="true">
                {i + 1}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="ib-book-page">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={step.id} className="ib-book-leaf" custom={direction} variants={leaf} initial="enter" animate="center" exit="exit">
            <h2 ref={arrive} id={titleId} tabIndex={-1} className="ib-book-title">
              {step.title}
            </h2>
            <p id={`${id}-hint`} className="ib-book-hint">
              {step.hint}
            </p>
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="ib-book-actions">
        {page > 0 ? (
          <Button type="button" variant="ghost" size={size} onClick={() => turn(page - 1)}>
            Back
          </Button>
        ) : (
          lead
        )}
        <div className="ib-book-forward">
          {saveAnyPage && next && (
            <button type="button" className="ib-book-save" onClick={onDone}>
              Save
            </button>
          )}
          <Button type="submit" size={size}>
            {next ? (
              <>
                Next: {next.label} <ArrowRight size={18} weight="light" aria-hidden="true" />
              </>
            ) : (
              doneLabel
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** A charge on its own, in bone, for the pattern book's tiles. */
function ChargeGlyph({ charge }: { charge: Charge }) {
  if (charge === 'none') {
    return (
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeWidth="22" strokeDasharray="28 28" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d={CHARGES[charge].d} fill="currentColor" />
    </svg>
  )
}
