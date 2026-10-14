import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CaretDown, Check } from '@phosphor-icons/react'
import './QuietSelect.css'

interface Option<T extends string> { value: T; label: string }
interface Props<T extends string> {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}

/** A quiet single-select listbox. Focus follows the option until selection or Escape. */
export function QuietSelect<T extends string>({ label, value, options, onChange }: Props<T>) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const search = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const selected = Math.max(0, options.findIndex((option) => option.value === value))
  const [active, setActive] = useState(selected)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (open) optionRefs.current[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close() { setOpen(false); trigger.current?.focus() }
  function choose(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    close()
  }
  function show(index = selected) { search.current = { text: '', at: 0 }; setActive(index); setOpen(true) }
  function keyboard(event: KeyboardEvent<HTMLUListElement>) {
    // Let native Tab pick its destination before removing the focused option.
    if (event.key === 'Tab') { window.setTimeout(() => setOpen(false), 0); return }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault()
    if (event.key === 'ArrowDown') setActive((index) => Math.min(options.length - 1, index + 1))
    else if (event.key === 'ArrowUp') setActive((index) => Math.max(0, index - 1))
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(options.length - 1)
    else if (event.key === 'Enter' || event.key === ' ') choose(active)
    else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now()
      const key = event.key.toLowerCase()
      const typed = now - search.current.at > 700 ? key : search.current.text + key
      search.current = { text: typed, at: now }
      const prefix = [...typed].every((letter) => letter === key) ? key : typed
      const match = options.findIndex((_, offset) => options[(active + 1 + offset) % options.length]?.label.toLowerCase().startsWith(prefix))
      if (match >= 0) setActive((active + 1 + match) % options.length)
    }
  }

  return <div className="ib-quiet-select" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <span id={`${id}-label`} className="caps ib-select-label">{label}</span>
    <button type="button" ref={trigger} className="ib-select-trigger caps" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-labelledby={`${id}-label ${id}-value`} onClick={() => open ? close() : show()} onKeyDown={(event) => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        show(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : selected)
      }
    }}><span id={`${id}-value`}>{options[selected]?.label}</span><CaretDown size={16} weight="light" aria-hidden="true" /></button>
    {open && <motion.ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="ib-select-list plate" initial={{ opacity: 0, y: reduced ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onKeyDown={keyboard}>
      {options.map((option, index) => <li key={option.value} ref={(node) => { optionRefs.current[index] = node }} role="option" aria-selected={option.value === value} tabIndex={index === active ? 0 : -1} onFocus={() => setActive(index)} onClick={() => choose(index)}>{option.label}{option.value === value && <Check size={16} weight="light" aria-hidden="true" />}</li>)}
    </motion.ul>}
  </div>
}
