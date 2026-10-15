import type { Item } from '../../types'
import { photoCredit } from '../../lib/format'

/** The photo's author and license, the license linked to its terms, and the change made to it. */
export function PhotoCredit({ item, tabIndex }: { item: Item; tabIndex?: number }) {
  const c = photoCredit(item)
  return (
    <>
      {c.label}: {c.by}
      {c.license && (
        <>
          ,{' '}
          {c.licenseUrl ? (
            <a href={c.licenseUrl} target="_blank" rel="noreferrer" tabIndex={tabIndex} className="underline decoration-bone-100/25 underline-offset-2 hover:text-bone-100">
              {c.license}
            </a>
          ) : (
            c.license
          )}
        </>
      )}
      . {c.changes}
    </>
  )
}
