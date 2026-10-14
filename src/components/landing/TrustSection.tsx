import { Seal } from '../vault/Experience'
import './sections.css'

const ENTRIES = [
  { label: 'Vault & insurance', title: 'Steel deserves a keeper.', copy: 'Your collection stays in the vault until you choose to ship or sell. Storage and insurance are simulated in this demo.' },
  { label: 'Authentication', title: 'Know the object.', copy: 'Era, origin, maker and materials sit beside every piece. Antique and forged reproduction are stated separately. Certificates are mock records.' },
  { label: 'Odds & fairness', title: 'Read before you open.', copy: 'Every chest prints its rarity odds and value bands. Past pulls do not change the odds. No invented near misses or claims of an audited draw.' },
  { label: 'Instant buyback', title: 'An offer you can count.', copy: 'The exact sell-back offer appears beside estimated value. Confirm once and receive demo credit at the original chest’s buyback rate.' },
  { label: 'Insured shipping', title: 'From vault to doorstep.', copy: 'Choose standard or express. See the cost and insured value before confirming. A request and courier acceptance are separate steps in the demo timeline.' },
]

export default function TrustSection() {
  return <section className="ib-landing-section ib-trust-section" id="trust" aria-labelledby="trust-title"><div className="ib-shell ib-trust-layout"><div className="ib-trust-intro"><Seal /><p className="ib-kicker">The armorer’s word</p><h2 id="trust-title" className="ib-title ib-section-title">Wonder in the pull.<br /><em>Clarity in the ledger.</em></h2><p className="ib-copy">The object, the offer and the next step. In plain sight.</p><p className="ib-trust-demo">This is a front-end demo. Custody, authentication, insurance and shipping are simulated.</p></div><dl className="ib-trust-entries">{ENTRIES.map((entry, index) => <div key={entry.label}><dt><span className="ib-kicker">{String(index + 1).padStart(2, '0')} · {entry.label}</span><span className="ib-trust-title">{entry.title}</span></dt><dd>{entry.copy}</dd></div>)}</dl></div></section>
}
