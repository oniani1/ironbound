import { Link } from 'react-router-dom'
import { Wordmark } from '../layout/Logo'
import { CHARGES } from '../ui/charges'
import './sections.css'

export default function Footer() {
  return <footer className="ib-footer"><div className="ib-shell"><div className="ib-footer-top"><Link to="/" className="ib-wordmark"><Wordmark /></Link><p className="font-display">Fortune favors the forged.</p><nav className="caps" aria-label="Footer"><Link to="/chests">Chests</Link><Link to="/vault">Your vault</Link><a href="#faq">Questions</a></nav></div><div className="ib-footer-bottom"><p><span className="eyebrow">A browser demo</span><br />All items, prices and payouts are simulated.</p><p>Antique photographs: <a href="https://www.metmuseum.org/art/collection" target="_blank" rel="noreferrer">The Metropolitan Museum of Art Open Access</a> and <a href="https://www.clevelandart.org/open-access" target="_blank" rel="noreferrer">The Cleveland Museum of Art Open Access</a>, CC0.<br />Newly forged pieces: maker names and prices are researched for the demo, with no affiliation. Photos come from Wikimedia Commons, Flickr, The Cleveland Museum of Art and the Kunsthistorisches Museum under the license credited on each piece; many show an example of the type.<br />3D chest: “Treasure Chest” by Rico Cilliers, <a href="https://polyhaven.com/a/treasure_chest" target="_blank" rel="noreferrer">Poly Haven</a>, CC0. Hall stone, floor and cloth textures: <a href="https://polyhaven.com/textures" target="_blank" rel="noreferrer">Poly Haven</a>, CC0.<br /><ChargeCredits /></p></div></div></footer>
}

const names = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join(''))

/** Who drew each charge, read from the charges' own records so the credit cannot drift from them. */
function ChargeCredits() {
  const charges = Object.values(CHARGES)
  const icons = [...new Set(charges.filter((c) => c.source.startsWith('game-icons.net')).map((c) => c.by))]
  const figures = charges.filter((c) => c.source.startsWith('commons.'))
  return (
    <>
      Charges on the shields: <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> by {names(icons)}, CC BY 3.0. Heraldic figures from Wikimedia Commons, traced, each tracing under its source&apos;s license:{' '}
      {figures.map((c, i) => (
        <span key={c.name}>
          {i ? '; ' : ''}the {c.name.toLowerCase()} by{' '}
          <a href={`https://${c.source}`} target="_blank" rel="noreferrer">
            {c.by}
          </a>
          , {c.license}
        </span>
      ))}
      . The rose is drawn for Ironbound.
    </>
  )
}
