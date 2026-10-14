import { useState } from 'react'
import { actions } from '../../lib/store'
import { Button } from '../ui/Button'
import { DEFAULT_ARMS, Shield } from '../ui/Heraldry'

/** Temporary steps until the designed versions land; same props contract. */
function Arms({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('Wanderer')
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <Shield arms={DEFAULT_ARMS} size={120} />
      <h2 className="font-display text-4xl font-semibold">Raise your banner</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-bone-100/15 bg-ink-900 px-4 text-bone-50" />
      <Button
        size="lg"
        onClick={() => {
          actions.setProfile({ name: name.trim() || 'Wanderer', arms: DEFAULT_ARMS })
          onNext()
        }}
      >
        Continue
      </Button>
    </div>
  )
}

function How({ onNext }: { onNext: () => void; onBack?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <h2 className="font-display text-4xl font-semibold">Every chest holds real steel</h2>
      <Button size="lg" onClick={onNext}>
        Continue
      </Button>
    </div>
  )
}

function Claim({ onNext }: { onNext: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <h2 className="font-display text-4xl font-semibold">Claim your purse</h2>
      <Button
        size="lg"
        onClick={() => {
          actions.signIn('email')
          onNext()
        }}
      >
        Continue with email
      </Button>
    </div>
  )
}

export const Steps = { Arms, How, Claim }
