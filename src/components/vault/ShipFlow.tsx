import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Pull } from '../../types'
import { actions, getState, useStore } from '../../lib/store'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio'
import { Button } from '../ui/Button'
import { itemHash } from './valuation'

export const SHIPPING = { standard: { label: 'Insured standard', price: 28, days: '5 to 8 business days' }, express: { label: 'Insured express', price: 65, days: '2 to 3 business days' } } as const
type Address = { name: string; street: string; line2: string; city: string; postal: string; country: string }

export function ShipmentTimeline({ pull, autoFocus = false }: { pull: Pull; autoFocus?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (autoFocus) heading.current?.focus() }, [autoFocus])
  const dispatched = pull.status === 'shipped'
  const currentStep = dispatched ? 3 : 0
  const milestones = [
    ['Requested', 'Demo request saved'], ['Packed', 'Protective packing and insurance check'], ['Picked up', 'Awaiting courier acceptance'], ['In transit', 'Tracking updates appear here'], ['Delivered', 'Signature on arrival'],
  ]
  return <div className="ib-transaction" aria-live="polite">
    <p className="ib-kicker">Dispatch ledger · demo</p>
    <h2 ref={heading} tabIndex={-1} className="ib-transaction-heading">{dispatched ? 'Shipment dispatched' : 'Shipping requested'}</h2>
    <p className="ib-copy">{pull.shipment?.method === 'express' ? 'Insured express' : 'Insured standard'} to {pull.shipment?.city ?? 'your destination'}{pull.shipment?.country ? `, ${pull.shipment.country}` : ''}.</p>
    {pull.shipment && <p className="text-sm text-bone-300">Demo reference <span className="tabular text-bone-100">{pull.shipment.tracking}</span><br />Estimated delivery: {pull.shipment.eta}</p>}
    <ol className="ib-timeline">{milestones.map(([title, detail], index) => <li key={title} data-complete={index <= currentStep} aria-current={index === currentStep ? 'step' : undefined}><span>{title}</span><small>{dispatched && index < currentStep ? 'Marked complete in demo' : detail}</small></li>)}</ol>
    <p className="text-sm text-bone-300">Simulated shipment. No parcel will be dispatched.</p>
  </div>
}

export function ShipFlow({ pull, onCancel }: { pull: Pull; onCancel: () => void }) {
  const profile = useStore((s) => s.profile)
  const balance = useStore((s) => s.balance)
  const [address, setAddress] = useState<Address>({ name: profile?.name ?? '', street: '', line2: '', city: '', postal: '', country: '' })
  const [method, setMethod] = useState<'standard' | 'express'>('standard')
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const committed = useRef(false)
  const service = SHIPPING[method]
  useEffect(() => { heading.current?.focus() }, [review])

  function reviewAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = Object.fromEntries(Object.entries(address).map(([key, value]) => [key, value.trim()])) as Address
    if (!cleaned.name || !cleaned.street || !cleaned.city || !cleaned.country) { setError('Enter a name, street address, city and country.'); return }
    setAddress(cleaned)
    setError('')
    setReview(true)
  }

  function confirm() {
    if (committed.current) return
    const state = getState()
    if (state.pulls.find((p) => p.uid === pull.uid)?.status !== 'vaulted') { setError('This item is no longer available for shipping.'); return }
    if (state.balance < service.price) { setError(`Shipping needs ${money(service.price)} in demo credit. Your balance is ${money(state.balance)}.`); return }
    committed.current = true
    if (!actions.spend(service.price)) { committed.current = false; setError('Your demo balance changed. Choose a service and try again.'); return }
    actions.ship(pull.uid, { name: address.name, city: address.city, country: address.country, method, eta: service.days, tracking: `DEMO-${itemHash(pull.uid).toString(16).toUpperCase().padStart(8, '0')}` })
    sfx.unlock()
    sfx.stamp()
  }

  return <section className="ib-transaction" aria-labelledby="ship-heading">
    <p className="ib-kicker">Dispatch ledger · demo</p>
    <h2 id="ship-heading" ref={heading} tabIndex={-1} className="ib-transaction-heading">{review ? 'Review your shipment' : 'Where should your steel go?'}</h2>
    {review ? <>
      <div className="ib-shipment-review"><address>{address.name}<br />{address.street}<br />{address.line2 && <>{address.line2}<br /></>}{address.city}{address.postal ? `, ${address.postal}` : ''}<br />{address.country}</address>
        <dl><div><dt>{service.label}</dt><dd className="tabular">{money(service.price)}</dd></div><div><dt>Insurance</dt><dd>Included to {money(pull.value)}</dd></div><div><dt>Estimated delivery</dt><dd>{service.days}</dd></div><div><dt>Demo balance after shipping</dt><dd className="tabular">{money(balance - service.price, {})}</dd></div></dl>
      </div>
      <p className="text-sm text-bone-300">{money(service.price)} will be deducted from demo credit. This is a simulated request.</p>
      {error && <p role="alert" className="ib-error">{error}</p>}
      <div className="ib-transaction-buttons"><Button onClick={confirm} disabled={balance < service.price}>Confirm demo shipment</Button><Button variant="ghost" onClick={() => { setReview(false); setError('') }}>Edit address</Button></div>
      {balance < service.price && <p className="ib-error">You need {money(service.price - balance, {})} more demo credit. Keep this item in the vault or choose another service.</p>}
      <Button variant="ghost" onClick={onCancel} className="mt-3">Keep in vault</Button>
    </> : <form onSubmit={reviewAddress}>
      <div className="ib-address">
        <label className="ib-field">Full name<input className="ib-input" name="name" autoComplete="name" required maxLength={80} value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} /></label>
        <label className="ib-field">Street address<input className="ib-input" name="street" autoComplete="address-line1" required maxLength={140} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} /></label>
        <label className="ib-field">Apartment or unit <span className="sr-only">optional</span><input className="ib-input" name="line2" autoComplete="address-line2" placeholder="Optional" maxLength={100} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} /></label>
        <div className="ib-address-row"><label className="ib-field">City<input className="ib-input" name="city" autoComplete="address-level2" required maxLength={80} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></label><label className="ib-field">Postal code<input className="ib-input" name="postal" autoComplete="postal-code" maxLength={20} value={address.postal} onChange={(e) => setAddress({ ...address, postal: e.target.value })} /></label></div>
        <label className="ib-field">Country<input className="ib-input" name="country" autoComplete="country-name" required maxLength={80} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} /></label>
        <fieldset className="ib-couriers"><legend>Insured delivery</legend>{(['standard', 'express'] as const).map((key) => <label className="ib-courier" key={key}><input type="radio" name="method" value={key} checked={method === key} onChange={() => setMethod(key)} /><span>{SHIPPING[key].label}<small>{SHIPPING[key].days}</small></span><span className="ib-courier-price tabular">{money(SHIPPING[key].price)}</span></label>)}</fieldset>
        {error && <p role="alert" className="ib-error">{error}</p>}
      </div>
      <div className="ib-transaction-buttons"><Button type="submit">Review shipment</Button><Button type="button" variant="ghost" onClick={onCancel}>Keep in vault</Button></div>
      <p className="text-sm text-bone-300 mt-4">Demo only. No address is sent to a courier.</p>
    </form>}
  </section>
}
