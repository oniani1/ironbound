// Searches value bands and odds for every chest: Common near half the pulls, each band filled
// with real pieces, expected value near 90% of the price. Prints the best set per chest as
// lines for src/config/chests.ts. Run: node scripts/odds-tune.mjs
import { readFileSync } from 'node:fs'

const antiques = JSON.parse(readFileSync(new URL('../src/data/items.json', import.meta.url), 'utf8'))
const cleveland = JSON.parse(readFileSync(new URL('../src/data/cleveland.json', import.meta.url), 'utf8'))
const modern = JSON.parse(readFileSync(new URL('../src/data/modern.json', import.meta.url), 'utf8')).items
const ITEMS = [...antiques, ...cleveland, ...modern]

const japan = (i) => i.origin.toLowerCase().includes('japan')
const CHESTS = [
  { id: 'squire', price: 100 },
  { id: 'knight', price: 250 },
  { id: 'warlord', price: 1000 },
  // The Japanese pool has few cheap pieces, so the limited box is tried at several prices.
  { id: 'shogun', price: 1900, filter: japan },
  { id: 'shogun', price: 2500, filter: japan },
  // The King's top band reaches the grails, the field armor included.
  { id: 'king', price: 5000, top: 1250000 },
]
const NAMES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'relic']
// The founder's shape: Common about half, Uncommon often, Rare and Epic within reach.
const TARGET = [0.5, 0.3, 0.13, 0.05, 0.016, 0.004]
const NICE = []
for (let k = 0; k <= 7; k++) for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5]) NICE.push(+(m * 10 ** k).toFixed(4))

function between(lo, hi) {
  return NICE.filter((v) => v >= lo && v <= hi)
}

function tune(chest) {
  const P = chest.price
  const values = ITEMS.filter((i) => !chest.filter || chest.filter(i)).map((i) => i.value).sort((a, b) => a - b)
  const prefix = [0]
  for (const v of values) prefix.push(prefix[prefix.length - 1] + v)
  // Index of the first value >= x.
  const lower = (x) => {
    let lo = 0
    let hi = values.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (values[mid] < x) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  const band = (a, b) => {
    const i = lower(a)
    const j = lower(b)
    return { n: j - i, mean: j > i ? (prefix[j] - prefix[i]) / (j - i) : 0 }
  }
  const ranges = [
    between(0.15 * P, 0.5 * P),
    between(0.45 * P, 0.9 * P),
    between(0.85 * P, 1.5 * P),
    between(1.4 * P, 4 * P),
    between(3 * P, 12 * P),
    between(6 * P, 80 * P),
    chest.top ? NICE.filter((v) => v >= chest.top && v <= chest.top * 2) : between(30 * P, 400 * P),
  ]
  const oddsSets = []
  for (const pr of [0.004, 0.002, 0.001, 0.0005, 0.0002, 0.0001])
    for (const pl of [0.016, 0.012, 0.008, 0.005, 0.003, 0.002])
      for (const pe of [0.05, 0.04, 0.03])
        for (const prr of [0.13, 0.11, 0.09])
          for (const pu of [0.3, 0.27, 0.24]) {
            const pc = 1 - pu - prr - pe - pl - pr
            if (pc > 0.6 || pc < 0.45) continue
            oddsSets.push([pc, pu, prr, pe, pl, pr])
          }
  let best = null
  for (const e0 of ranges[0])
    for (const e1 of ranges[1]) {
      if (e1 <= e0) continue
      const c = band(e0, e1)
      if (c.n < 3) continue
      for (const e2 of ranges[2]) {
        if (e2 <= e1) continue
        const u = band(e1, e2)
        if (u.n < 3) continue
        for (const e3 of ranges[3]) {
          if (e3 <= e2) continue
          const r = band(e2, e3)
          if (r.n < 3) continue
          for (const e4 of ranges[4]) {
            if (e4 <= e3) continue
            const ep = band(e3, e4)
            if (ep.n < 2) continue
            for (const e5 of ranges[5]) {
              if (e5 <= e4) continue
              const l = band(e4, e5)
              if (l.n < 2) continue
              for (const e6 of ranges[6]) {
                if (e6 <= e5) continue
                const rl = band(e5, e6)
                if (rl.n < 2) continue
                const bands = [c, u, r, ep, l, rl]
                for (const odds of oddsSets) {
                  const ev = bands.reduce((s, b, i) => s + odds[i] * b.mean, 0) / P
                  if (ev < 0.86 || ev > 0.94) continue
                  // The common tiers matter most to how a chest feels; the top two can be scarcer.
                  const shape = odds.reduce((s, p, i) => s + (Math.abs(p - TARGET[i]) / TARGET[i]) * [1, 1, 1, 0.8, 0.3, 0.15][i], 0)
                  const thin = bands.reduce((s, b) => s + (b.n < 4 ? (4 - b.n) * 0.15 : 0), 0)
                  // A Common should still be worth a real share of the price.
                  const cheap = Math.max(0, 0.38 - c.mean / P) * 6
                  const score = Math.abs(ev - 0.9) * 8 + shape + thin + cheap
                  if (!best || score < best.score) best = { score, ev, odds, edges: [e0, e1, e2, e3, e4, e5, e6], bands }
                }
              }
            }
          }
        }
      }
    }
  return best
}

for (const chest of CHESTS) {
  const b = tune(chest)
  if (!b) {
    console.log(`${chest.id}: no solution`)
    continue
  }
  console.log(`\n${chest.id} $${chest.price}: EV ${(b.ev * 100).toFixed(1)}%  score ${b.score.toFixed(3)}  common worth ${((b.bands[0].mean / chest.price) * 100).toFixed(0)}% of the price`)
  b.bands.forEach((band, i) => {
    console.log(`  ${NAMES[i].padEnd(9)} ${(b.odds[i] * 100).toFixed(2).padStart(6)}%  $${b.edges[i]} to $${b.edges[i + 1]}  items ${String(band.n).padStart(3)}  mean $${Math.round(band.mean)}`)
  })
  console.log('  ' + b.bands.map((_, i) => `B('${NAMES[i]}', ${+b.odds[i].toFixed(4)}, ${b.edges[i]}, ${b.edges[i + 1]})`).join(',\n  '))
}
