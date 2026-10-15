import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { ArrowCounterClockwise, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
import type { Item, RarityId } from '../../types'
import { RARITIES } from '../../config/rarity'
import { IconButton } from '../ui/Button'
import { ItemArtwork } from './ItemArtwork'

type View = { scale: number; x: number; y: number }
type Point = { x: number; y: number }
const REST: View = { scale: 1, x: 0, y: 0 }

export function ImageViewer({ item, rarity }: { item: Item; rarity: RarityId }) {
  const stage = useRef<HTMLDivElement>(null)
  const [view, setView] = useState(REST)
  const [used, setUsed] = useState(false)
  const current = useRef(view)
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef({ center: { x: 0, y: 0 }, distance: 0, view: REST })

  const update = useCallback((next: View) => {
    setUsed(true)
    const rect = stage.current?.getBoundingClientRect()
    const scale = Math.max(1, Math.min(4, next.scale))
    const limitX = ((rect?.width ?? 300) * (scale - 1)) / 2
    const limitY = ((rect?.height ?? 400) * (scale - 1)) / 2
    const bounded = { scale, x: Math.max(-limitX, Math.min(limitX, next.x)), y: Math.max(-limitY, Math.min(limitY, next.y)) }
    current.current = bounded
    setView(bounded)
  }, [])

  const zoom = useCallback((scale: number, anchor?: Point) => {
    const old = current.current
    const nextScale = Math.max(1, Math.min(4, scale))
    const rect = stage.current?.getBoundingClientRect()
    const point = anchor && rect ? { x: anchor.x - rect.left - rect.width / 2, y: anchor.y - rect.top - rect.height / 2 } : { x: 0, y: 0 }
    const ratio = nextScale / old.scale
    update({ scale: nextScale, x: point.x - (point.x - old.x) * ratio, y: point.y - (point.y - old.y) * ratio })
  }, [update])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoom(current.current.scale * Math.exp(-event.deltaY * 0.002), { x: event.clientX, y: event.clientY })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [zoom])

  function beginGesture() {
    const points = [...pointers.current.values()]
    const a = points[0]
    const b = points[1]
    if (!a) return
    gesture.current = { center: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a, distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, view: current.current }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const [a, b] = [...pointers.current.values()]
    if (!a) return
    const start = gesture.current
    const center = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a
    const scale = b && start.distance > 0 ? start.view.scale * Math.hypot(a.x - b.x, a.y - b.y) / start.distance : start.view.scale
    const rect = stage.current?.getBoundingClientRect()
    const ratio = Math.max(1, Math.min(4, scale)) / start.view.scale
    const anchorX = start.center.x - (rect?.left ?? 0) - (rect?.width ?? 0) / 2
    const anchorY = start.center.y - (rect?.top ?? 0) - (rect?.height ?? 0) / 2
    update({ scale, x: anchorX - (anchorX - start.view.x) * ratio + center.x - start.center.x, y: anchorY - (anchorY - start.view.y) * ratio + center.y - start.center.y })
  }

  function end(event: PointerEvent<HTMLDivElement>) { pointers.current.delete(event.pointerId); beginGesture() }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const v = current.current
    if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault()
    if (event.key === '+' || event.key === '=') zoom(v.scale + 0.5)
    if (event.key === '-') zoom(v.scale - 0.5)
    if (event.key === '0') update(REST)
    if (event.key === 'ArrowLeft') update({ ...v, x: v.x + 50 })
    if (event.key === 'ArrowRight') update({ ...v, x: v.x - 50 })
    if (event.key === 'ArrowUp') update({ ...v, y: v.y + 50 })
    if (event.key === 'ArrowDown') update({ ...v, y: v.y - 50 })
  }

  return <div className="ib-viewer vitrine" data-lenis-prevent style={{ '--light': RARITIES[rarity].cssVar } as CSSProperties}>
    <div ref={stage} className="ib-viewer-stage" data-zoomed={view.scale > 1.01} tabIndex={0} role="group" aria-label={`Inspect ${item.name}`} aria-describedby="image-controls-help" onKeyDown={keyboard} onDoubleClick={(event) => zoom(current.current.scale > 1 ? 1 : 2.5, { x: event.clientX, y: event.clientY })} onPointerDown={(event) => { if (event.pointerType === 'mouse' && event.button !== 0) return; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); event.currentTarget.setPointerCapture(event.pointerId); beginGesture() }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="ib-viewer-object" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}><ItemArtwork item={item} rarity={rarity} eager full note={false} /></div>
    </div>
    <div className="ib-viewer-controls">
      <IconButton type="button" size="lg" onClick={() => zoom(current.current.scale - 0.5)} disabled={view.scale <= 1} aria-label="Zoom out" title="Zoom out"><MagnifyingGlassMinus size={20} weight="light" aria-hidden="true" /></IconButton>
      <IconButton type="button" size="lg" onClick={() => zoom(current.current.scale + 0.5)} disabled={view.scale >= 4} aria-label="Zoom in" title="Zoom in"><MagnifyingGlassPlus size={20} weight="light" aria-hidden="true" /></IconButton>
      <IconButton type="button" size="lg" onClick={() => update(REST)} aria-label="Reset view" title="Reset view"><ArrowCounterClockwise size={20} weight="light" aria-hidden="true" /></IconButton>
      <span className="ib-viewer-scale caps tabular">{Math.round(view.scale * 100)}%</span>
    </div>
    <p className="ib-viewer-help caps" id="image-controls-help" data-used={used}>Pinch or scroll to inspect. Drag when zoomed.<span className="sr-only"> Keyboard: +, -, arrows. Double tap to zoom.</span></p>
  </div>
}
