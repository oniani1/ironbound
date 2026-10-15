/**
 * A lookup by id with no prototype, so an id read from a saved state or a link, such as
 * "__proto__" or "constructor", finds nothing instead of a built-in.
 */
export function byId<T extends { id: string }>(list: readonly T[]): Record<string, T> {
  const out = Object.create(null) as Record<string, T>
  for (const entry of list) out[entry.id] = entry
  return out
}
