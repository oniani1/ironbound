import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, GoogleLogo, Wallet } from '@phosphor-icons/react'
import { actions, getState, useStore } from '../../lib/store'
import type { State } from '../../lib/store'
import { sfx } from '../../lib/audio'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { Shield, DEFAULT_ARMS } from '../ui/Heraldry'
import { CoinBurst, EXPO, Reveal, SoundToggle } from '../vault/Experience'
import type { StepProps } from '../vault/Experience'

export default function ClaimStep({ onNext, onBack }: StepProps) {
  const signedIn = useStore((s) => s.signedIn)
  const profile = useStore((s) => s.profile)
  const [email, setEmail] = useState('')
  const [wallets, setWallets] = useState(false)
  const [granted, setGranted] = useState(false)
  const signing = useRef(false)
  const reduced = useReducedMotion()

  function signIn(method: NonNullable<State['signInMethod']>) {
    if (signing.current || getState().signedIn) return
    signing.current = true
    sfx.unlock()
    actions.signIn(method)
    sfx.coins()
    setGranted(true)
  }
  function emailSignIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); signIn('email') }

  return <section className="ib-step ib-claim" aria-labelledby="claim-title"><div className="ib-step-top"><p className="ib-kicker m-0">Make it yours · demo</p><SoundToggle /></div>
    <AnimatePresence mode="wait">{signedIn ? <motion.div key="success" className="ib-claim-success" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0.15 : 0.45, ease: EXPO }} role="status"><Shield arms={profile?.arms ?? DEFAULT_ARMS} size={92} /><h1 id="claim-title" tabIndex={-1} className="ib-title ib-step-title">{granted ? 'Your purse is ready.' : 'Your demo account is ready.'}</h1><div className="ib-credit-moment">{granted && <CoinBurst />}{granted ? <><span aria-hidden="true" className="ib-credit-number font-display tabular"><CountUp to={1000} format={(n) => `+$${Math.round(n).toLocaleString('en-US')}`} /></span><span aria-hidden="true" className="caps">demo credit</span><span className="sr-only">$1,000 demo credit added.</span></> : <span>Your demo credit has already been claimed.</span>}</div><p className="ib-copy">{granted ? 'Put it toward your next chest. Your collection stays in this browser.' : 'Continue with your current collection and balance.'} All items and payouts are simulated.</p><Button size="lg" onClick={onNext}>Enter the armory <ArrowRight size={18} weight="light" aria-hidden="true" /></Button></motion.div> : <Reveal key="signin"><h1 id="claim-title" tabIndex={-1} className="ib-title ib-step-title">Claim demo credit.</h1><p className="ib-copy tabular">Choose a demo sign-in and receive $1,000 in demo credit.</p><div className="ib-demo-notice"><span className="ib-kicker">Demo only</span><p>No real account is created. No wallet is connected. No payment is required.</p></div>
      <form onSubmit={emailSignIn} className="ib-email-form"><label className="ib-field">Email address<input className="ib-input" type="email" autoComplete="email" name="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label><Button type="submit" size="lg" className="w-full">Continue with email</Button></form>
      <div className="ib-signin-divider"><span>or</span></div>
      <div className="ib-signin-options"><Button variant="secondary" size="lg" onClick={() => signIn('google')} icon={<GoogleLogo size={20} weight="light" aria-hidden="true" />}>Continue with Google</Button><Button variant="secondary" size="lg" aria-expanded={wallets} aria-controls="demo-wallet-picker" onClick={() => setWallets(!wallets)} icon={<Wallet size={20} weight="light" aria-hidden="true" />}>Connect a Solana wallet</Button></div>
      <AnimatePresence>{wallets && <motion.div id="demo-wallet-picker" className="ib-wallet-picker plate" initial={{ opacity: 0, y: reduced ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.2, ease: EXPO }}><p className="text-[13px] text-bone-400">Choose a wallet to simulate sign-in.</p>{['Phantom', 'Solflare', 'Backpack'].map((wallet, index) => <button type="button" key={wallet} onClick={() => signIn('wallet')}><span className="ib-wallet-initial" aria-hidden="true">{wallet[0]}</span><span>{wallet}</span><span className="ib-wallet-demo caps">Demo</span><ArrowUpRight size={16} weight="light" aria-hidden="true" /><span className="sr-only">, option {index + 1}</span></button>)}</motion.div>}</AnimatePresence>
      <div className="ib-step-footer">{onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}<Button variant="ghost" onClick={onNext}>Keep exploring as a guest</Button></div>
    </Reveal>}</AnimatePresence>
  </section>
}
