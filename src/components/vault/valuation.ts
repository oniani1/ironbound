export const VALUED_ON = '14 Oct 2026'

export function itemHash(id: string): number {
  let hash = 2166136261
  for (const char of id) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}

export function comparableSales(itemId: string, value: number) {
  const seed = itemHash(itemId)
  return [0, 1, 2].map((index) => ({
    id: `${itemId}-comp-${index}`,
    label: ['Private collection', 'Arms auction', 'Specialist dealer'][index] ?? 'Study sale',
    date: ['Jul 2026', 'Aug 2026', 'Sep 2026'][index] ?? '2026',
    value: Math.round(value * (0.78 + ((seed >>> (index * 7)) % 45) / 100)),
  }))
}
