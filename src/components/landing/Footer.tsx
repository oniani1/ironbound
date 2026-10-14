import { Link } from 'react-router-dom'
import './sections.css'

export default function Footer() {
  return <footer className="ib-footer"><div className="ib-shell"><div className="ib-footer-top"><Link to="/" className="ib-wordmark">Ironbound</Link><p className="font-display">Fortune favors the forged.</p><nav aria-label="Footer"><Link to="/chests">Chests</Link><Link to="/vault">Your vault</Link><a href="#faq">Questions</a></nav></div><div className="ib-footer-bottom"><p>Demo. All items, prices and payouts are simulated.</p><p>Item photographs: <a href="https://www.metmuseum.org/art/collection" target="_blank" rel="noreferrer">The Metropolitan Museum of Art Open Access</a>, CC0.<br />3D chest: “Treasure Chest” by Rico Cilliers, <a href="https://polyhaven.com/a/treasure_chest" target="_blank" rel="noreferrer">Poly Haven</a>, CC0.</p></div></div></footer>
}
