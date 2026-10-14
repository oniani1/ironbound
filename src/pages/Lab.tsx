import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { applyCharge, introTimeline, revealTimeline, type Phase } from '../components/chest3d/timeline'
import { CHEST_BY_ID } from '../config/chests'
import { RARITIES, RARITY_ORDER } from '../config/rarity'
import { revealFacts } from '../lib/facts'
import type { Item, RarityId } from '../types'
import { ITEMS, ITEM_BY_ID } from '../data/items'

function pickItem(id: string | null): Item {
  return (id && ITEM_BY_ID[id]) || ITEMS.find((i) => i.category === 'sword' && i.value > 40000) || ITEMS[ITEMS.length - 1]!
}

/** Dev page to tune the 3D opening without the rest of the app. */
export default function Lab() {
  const anim = useMemo(() => new ChestAnim(), [])
  const [phase, setPhase] = useState<Phase | 'idle'>('idle')
  const [rarity, setRarity] = useState<RarityId>('legendary')
  const [chestId, setChestId] = useState('knight')
  const tl = useRef<gsap.core.Timeline | null>(null)
  const chest = CHEST_BY_ID[chestId]!
  const item = pickItem(new URLSearchParams(location.search).get('item'))

  useEffect(() => () => void tl.current?.kill(), [])

  const run = (fast: boolean) => {
    tl.current?.kill()
    setPhase('intro')
    tl.current = introTimeline(anim, () => {
      // Auto-charge for the lab.
      const o = { p: 0 }
      {
        gsap.to(o, {
          p: 1,
          duration: fast ? 0.3 : 1.2,
          ease: 'power1.in',
          onUpdate: () => applyCharge(anim, o.p),
          onComplete: () => {
            tl.current = revealTimeline(anim, { rarity, fast, onPhase: setPhase, beats: revealFacts(item).length })
          },
        })
      }
    }, fast)
  }

  return (
    <div className="fixed inset-0 bg-ink-950">
      <ChestScene theme={chest.theme} anim={anim} item={item} rarityHex={RARITIES[rarity].hex} className="!absolute inset-0" />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-xs">
        {RARITY_ORDER.map((r) => (
          <button key={r} onClick={() => setRarity(r)} className={`rounded px-2 py-1 ${r === rarity ? 'bg-bone-100 text-ink-950' : 'bg-ink-800'}`}>
            {r}
          </button>
        ))}
        {['squire', 'knight', 'shogun', 'warlord', 'king'].map((c) => (
          <button key={c} onClick={() => setChestId(c)} className={`rounded px-2 py-1 ${c === chestId ? 'bg-brass-500 text-ink-950' : 'bg-ink-800'}`}>
            {c}
          </button>
        ))}
        <button data-testid="run" onClick={() => run(false)} className="rounded bg-ember-500 px-3 py-1 text-ink-950">Open</button>
        <button data-testid="run-fast" onClick={() => run(true)} className="rounded bg-ember-600 px-3 py-1 text-ink-950">Fast</button>
        <span className="px-2 py-1 text-bone-300" data-testid="phase">{phase}</span>
      </div>
    </div>
  )
}
