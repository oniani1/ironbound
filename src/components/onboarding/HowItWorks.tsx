import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CHEST_BY_ID, VISIBLE_CHESTS } from '../../config/chests'
import { ITEMS } from '../../data/items'
import { money, pct } from '../../lib/format'
import { Button } from '../ui/Button'
import { ItemArtwork } from '../vault/ItemArtwork'
import { EXPO, SoundToggle } from '../vault/Experience'
import type { StepProps } from '../vault/Experience'
import { OddsBar } from '../landing/OddsBar'

const STORIES = [
  { label: 'The object', title: 'Real steel. Yours to keep.', copy: 'Every chest holds a physical piece. Authenticated, vaulted and insured. All simulated in this demo.' },
  { label: 'The odds', title: 'The odds are on the lid.', copy: 'Read each rarity’s chance before you open. High value is possible. It is never promised.' },
  { label: 'The choice', title: 'Your steel. Your call.', copy: 'Keep it in your vault, request insured shipping, or sell it back instantly for demo credit.' },
] as const
const STORY_MS = 4500

export default function HowItWorks({ onNext, onBack }: StepProps) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [held, setHeld] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [focusPaused, setFocusPaused] = useState(false)
  const [cycle, setCycle] = useState(0)
  const elapsed = useRef(0)
  const press = useRef(0)
  const suppressClick = useRef(false)
  const story = STORIES[index] ?? STORIES[0]
  const sample = CHEST_BY_ID.squire ?? VISIBLE_CHESTS[0]
  const illustrationItem = ITEMS.find((item) => item.category === 'sword') ?? ITEMS[0]
  const minBuyback = Math.min(...VISIBLE_CHESTS.map((chest) => chest.buyback))
  const maxBuyback = Math.max(...VISIBLE_CHESTS.map((chest) => chest.buyback))
  const storyCopy = index === 2 ? `Keep it vaulted, ship it insured, or sell it back instantly for ${pct(minBuyback)} to ${pct(maxBuyback)} of value in demo credit.` : story.copy
  const stop = paused || held || hidden || focusPaused || !!reduced

  useEffect(() => { const change = () => setHidden(document.hidden); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change) }, [])
  useEffect(() => {
    if (stop || elapsed.current >= STORY_MS) return
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      elapsed.current = Math.min(STORY_MS, elapsed.current + now - previous)
      previous = now
      setProgress(elapsed.current / STORY_MS)
      if (elapsed.current >= STORY_MS) { window.clearInterval(timer); if (index < STORIES.length - 1) { elapsed.current = 0; setProgress(0); setIndex((i) => i + 1) } }
    }, 50)
    return () => window.clearInterval(timer)
  }, [index, stop, cycle])

  function go(next: number) { elapsed.current = 0; setProgress(0); setIndex(Math.max(0, Math.min(STORIES.length - 1, next))); setCycle((value) => value + 1) }
  function advance() { if (index < STORIES.length - 1) go(index + 1); else onNext() }

  return <section className="ib-step ib-stories" aria-labelledby="story-title"><div className="ib-step-top"><p className="ib-kicker m-0">Know your steel · 02</p><SoundToggle /></div>
    <div className="ib-story-bars" aria-label="Story progress">{STORIES.map((entry, i) => <button key={entry.label} type="button" aria-label={`Read story ${i + 1}: ${entry.label}`} aria-current={index === i ? 'step' : undefined} onClick={() => go(i)}><span className="ib-story-track"><span style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})` }} /></span></button>)}</div>
    <article className="ib-story-surface" tabIndex={0} aria-labelledby="story-title" aria-describedby="story-copy story-controls-help" onFocus={(event) => setFocusPaused(event.currentTarget.matches(':focus-visible'))} onBlur={() => setFocusPaused(false)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1) } if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); advance() } if (event.key === 'ArrowRight') { event.preventDefault(); advance() } }} onPointerDown={(event) => { press.current = performance.now(); suppressClick.current = false; setHeld(true); setFocusPaused(false); event.currentTarget.setPointerCapture(event.pointerId) }} onPointerUp={() => { suppressClick.current = performance.now() - press.current > 220; setHeld(false) }} onPointerCancel={() => { suppressClick.current = true; setHeld(false) }} onLostPointerCapture={() => setHeld(false)} onClick={() => { if (!suppressClick.current) advance() }}>
      <AnimatePresence mode="wait"><motion.div key={index} initial={{ opacity: 0, x: reduced ? 0 : 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: reduced ? 0.12 : 0.3, ease: EXPO }} className="ib-story-content">
        <div className="ib-story-illustration" aria-hidden={index === 0 ? true : undefined}>
          {index === 0 && <><div className="ib-story-vault-frame" />{illustrationItem && <ItemArtwork item={illustrationItem} rarity="rare" eager />}<motion.span className="ib-story-stamp" initial={{ opacity: 0, scale: reduced ? 1 : 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, delay: reduced ? 0 : 0.2, ease: EXPO }}>Authenticated<br /><span>Vaulted · Insured</span></motion.span></>}
          {index === 1 && sample && <div className="ib-story-lid"><svg viewBox="0 0 300 150" className="ib-lid-svg" fill="none" aria-hidden="true"><path d="m28 120 22-80h200l22 80H28Z" stroke="var(--color-brass-600)" strokeWidth="2" /><path d="M58 40 46 120M96 40l-5 80m59-80v80m54-80 5 80m33-80 12 80" stroke="var(--color-ink-500)" strokeWidth="9" /><path d="M132 100h36v30h-36z" fill="var(--color-brass-600)" /></svg><p className="ib-kicker">{sample.name} · {money(sample.price)}</p><OddsBar chest={sample} showLegend /></div>}
          {index === 2 && <div className="ib-story-choices">{[['01', 'Keep', 'A place on your wall'], ['02', 'Ship', 'Insured to your door'], ['03', 'Sell back', `${pct(minBuyback)} to ${pct(maxBuyback)} of value`]].map(([number, title, copy], i) => <motion.div key={number} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: reduced ? 0 : i * 0.12, ease: EXPO }}><span className="font-display text-3xl text-brass-300">{number}</span><span><strong>{title}</strong><small>{copy}</small></span><span aria-hidden="true">↗</span></motion.div>)}</div>}
        </div>
        <div><p className="ib-kicker">{String(index + 1).padStart(2, '0')} / 03 · {story.label}</p><h1 id="story-title" className="ib-title ib-step-title">{story.title}</h1><p id="story-copy" className="ib-copy">{storyCopy}</p></div>
      </motion.div></AnimatePresence>
    </article>
    <div className="ib-story-tools"><span id="story-controls-help">{held ? 'Paused while held' : reduced ? 'Read at your pace' : 'Tap to advance. Hold to pause.'}</span>{!reduced && <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Resume stories' : 'Pause stories'}</button>}</div>
    <div className="ib-step-footer">{index > 0 ? <Button variant="ghost" onClick={() => go(index - 1)}>Previous</Button> : onBack ? <Button variant="ghost" onClick={onBack}>Back</Button> : <Button variant="ghost" onClick={onNext}>Skip stories</Button>}<Button size="lg" onClick={advance}>{index === 2 ? 'Open my free chest' : 'Next'} <span aria-hidden="true">→</span></Button></div>
    <button type="button" className="ib-story-skip" onClick={onNext}>Skip to my free chest</button>
  </section>
}
