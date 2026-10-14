import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import type { Chest } from '../../types'
import { RARITIES } from '../../config/rarity'
import { pct, money } from '../../lib/format'
import { EXPO } from '../vault/Experience'
import './sections.css'

export function OddsBar({ chest, showLegend = false, details = false }: { chest: Chest; showLegend?: boolean; details?: boolean }) {
  const reduced = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const visible = useInView(track, { once: true })
  const total = chest.bands.reduce((sum, band) => sum + band.odds, 0)
  return <div className="ib-odds">
    <div ref={track} className="ib-odds-track" role="img" aria-hidden={showLegend ? true : undefined} aria-label={`${chest.name} rarity odds: ${chest.bands.map((band) => `${RARITIES[band.rarity].label} ${pct(band.odds, 2)}`).join(', ')}`}>
      {chest.bands.map((band, index) => <div key={band.rarity} style={{ width: `${total > 0 ? band.odds / total * 100 : 0}%`, minWidth: band.odds > 0 ? 2 : 0 }}><motion.span style={{ background: RARITIES[band.rarity].cssVar, transformOrigin: 'left' }} initial={{ scaleX: reduced ? 1 : 0 }} animate={{ scaleX: visible || reduced ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : index * 0.035, ease: EXPO }} /></div>)}
    </div>
    {showLegend && <ul className="ib-odds-legend">{chest.bands.map((band) => <li key={band.rarity}><span className="ib-odds-dot" style={{ background: RARITIES[band.rarity].cssVar }} aria-hidden="true" /><span>{RARITIES[band.rarity].label}</span><span className="tabular">{pct(band.odds, 2)}</span></li>)}</ul>}
    {details && <details className="ib-odds-details"><summary>See rarity odds <span aria-hidden="true">+</span></summary><ul>{chest.bands.map((band) => <li key={band.rarity}><span><span className="ib-odds-dot" style={{ background: RARITIES[band.rarity].cssVar }} aria-hidden="true" /> {RARITIES[band.rarity].label}<small>{money(band.min)} to under {money(band.max)}</small></span><span className="tabular">{pct(band.odds, 2)}</span></li>)}</ul></details>}
  </div>
}
