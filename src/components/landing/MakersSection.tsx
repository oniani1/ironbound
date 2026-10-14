import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { ITEMS, MAKERS } from '../../data/items'
import { money, resaleLabel } from '../../lib/format'
import { Tag } from '../ui/RarityTag'
import { ItemImg } from '../ui/ItemImg'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * New work beside the antiques: the makers whose pieces are in the chests, set as a ledger
 * with their country, what they make, what their pieces sell for and how well they resell.
 */
export function MakersSection() {
  const reduced = useReducedMotion()
  // Phones show the first four makers, then the rest on request, so the ledger does not
  // push the chests far down the page.
  const [all, setAll] = useState(false)
  const rows = useMemo(() => {
    return MAKERS.map((m) => {
      const pieces = ITEMS.filter((i) => i.makerId === m.id).sort((a, b) => b.value - a.value)
      return { maker: m, pieces, low: pieces[pieces.length - 1]?.value ?? 0, high: pieces[0]?.value ?? 0 }
    })
      .filter((r) => r.pieces.length > 0)
      .sort((a, b) => b.high - a.high)
  }, [])
  const count = rows.reduce((s, r) => s + r.pieces.length, 0)
  if (!rows.length) return null
  return (
    <section className="border-t border-bone-100/[0.06] bg-ink-950 py-16 sm:py-24" aria-labelledby="makers-title">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">From the forge</p>
          <h2 id="makers-title" className="font-display mt-3 text-[38px] font-semibold leading-[1.02] text-bone-50 sm:text-[52px]">
            New work from <em className="font-medium text-brass-300">working makers.</em>
          </h2>
          <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-bone-300">
            Beside the antiques, the chests hold {count} new pieces from {rows.length} makers: budget display steel, HEMA trainers, Albion swords and signed Japanese blades. Every piece carries its retail price and our view of how well the maker resells.
          </p>
          <p className="mt-4 text-[12px] text-bone-400">Demo catalog. Prices are retail as researched in October 2026. Resale labels are our assessment, not measured returns. Many photos show an example of the type. No affiliation with any maker.</p>
          <Link to="/chests" className="caps group mt-7 inline-flex min-h-11 items-center gap-2 text-brass-300 transition-colors hover:text-brass-300/80">
            Find them in the chests
            <ArrowRight size={15} weight="light" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
        <ul className="divide-y divide-bone-100/[0.07] border-y border-bone-100/[0.08]">
          {rows.map(({ maker, pieces, low, high }, i) => (
            <motion.li
              key={maker.id}
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : Math.min(i, 8) * 0.03, ease }}
              className={`grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-6 ${i >= 4 && !all ? 'max-sm:hidden' : ''}`}
            >
              <span className="vitrine block h-14 w-14 rounded-[2px] sm:h-16 sm:w-16" aria-hidden>
                {pieces[0] && <ItemImg item={pieces[0]} className="h-full w-full p-1.5" />}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-display text-[21px] font-semibold leading-tight text-bone-50">{maker.name}</span>
                  <span className="caps text-bone-400">{[maker.city, maker.country].filter(Boolean).join(', ')}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-bone-300">{maker.specialty}</p>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-5 sm:col-span-1 sm:block sm:text-right">
                <p className="text-[14px] font-semibold text-bone-100 tabular">
                  {low === high ? money(low) : `${money(low)} to ${money(high, { compact: true })}`}
                </p>
                <p className="mt-1 flex items-center gap-3 sm:justify-end">
                  <span className="text-[12px] text-bone-400 tabular">
                    {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
                  </span>
                  <Tag tone={maker.resale === 'strong' ? 'moss' : 'bone'}>{resaleLabel(maker.resale)}</Tag>
                </p>
              </div>
            </motion.li>
          ))}
          {!all && rows.length > 4 && (
            <li className="sm:hidden">
              <button type="button" onClick={() => setAll(true)} className="caps flex min-h-12 w-full items-center justify-between text-bone-200">
                View all {rows.length} makers
                <ArrowRight size={15} weight="light" aria-hidden />
              </button>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
