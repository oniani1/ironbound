import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { FLEUR, TIE } from './fleur'

/**
 * The crown on the King's Reliquary, built to the same design as the one embroidered on the
 * niche banner: a jeweled circlet with beaded rims, cabochon stones in gold bezels (a garnet
 * at the front, sapphires at the sides, pearls between), four fleurs-de-lis cut from the
 * banner's own fleur shape, a pearled point in each gap, and a crimson velvet cap inside. No
 * cross. The stones catch the light; nothing glows. Units are the chest's; the lid's hinge
 * group places and scales the whole crown. The front of the crown faces +z.
 */
export function buildCrown(metal: string): THREE.Group {
  const g = new THREE.Group()
  // Rougher than the chest's straps and brighter to the hall's light, so a fleur seen edge-on
  // still reads as gold and not as a dark stick.
  const gold = new THREE.MeshPhysicalMaterial({ color: metal, metalness: 1, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 1.6 })
  const garnet = new THREE.MeshPhysicalMaterial({ color: '#8e1020', metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, emissive: '#2a0309', emissiveIntensity: 0.5 })
  const sapphire = new THREE.MeshPhysicalMaterial({ color: '#173c80', metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, emissive: '#061330', emissiveIntensity: 0.5 })
  const pearl = new THREE.MeshPhysicalMaterial({ color: '#efe6d6', metalness: 0, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color('#fff2dc') })
  const velvet = new THREE.MeshStandardMaterial({ color: '#6e0f1c', roughness: 0.96, metalness: 0 })

  const R = 0.076
  const BAND_H = 0.03
  const FRONT = Math.PI / 2

  // The circlet: a solid band with a slight flare, turned on a lathe.
  const profile = [
    new THREE.Vector2(R - 0.007, 0),
    new THREE.Vector2(R + 0.001, 0),
    new THREE.Vector2(R + 0.004, 0.004),
    new THREE.Vector2(R + 0.0045, BAND_H - 0.004),
    new THREE.Vector2(R + 0.002, BAND_H),
    new THREE.Vector2(R - 0.007, BAND_H),
    new THREE.Vector2(R - 0.007, 0),
  ]
  const band = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), gold)
  g.add(band)
  // Beaded rims: a cord along the foot and a row of beads along the head.
  const foot = new THREE.Mesh(new THREE.TorusGeometry(R + 0.002, 0.0032, 10, 72), gold)
  foot.rotation.x = Math.PI / 2
  foot.position.y = 0.0015
  g.add(foot)
  const bead = new THREE.SphereGeometry(0.0031, 10, 8)
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2
    const b = new THREE.Mesh(bead, gold)
    b.position.set(Math.cos(a) * (R + 0.002), BAND_H + 0.001, Math.sin(a) * (R + 0.002))
    g.add(b)
  }

  // Stones around the band, each in a bezel that stands off the gold: the garnet at the front,
  // sapphires at the sides, a smaller garnet at the back, and a pearl in every gap.
  const bezel = new THREE.CylinderGeometry(0.0085, 0.0095, 0.006, 20)
  bezel.rotateX(Math.PI / 2)
  const cabochon = new THREE.SphereGeometry(0.0068, 20, 14)
  const seed = new THREE.SphereGeometry(0.0042, 14, 10)
  for (let i = 0; i < 8; i++) {
    const a = FRONT + (i / 8) * Math.PI * 2
    const setting = new THREE.Group()
    setting.position.set(Math.cos(a) * (R + 0.003), BAND_H / 2, Math.sin(a) * (R + 0.003))
    setting.lookAt(Math.cos(a) * 10, BAND_H / 2, Math.sin(a) * 10)
    if (i % 2 === 0) {
      const ring = new THREE.Mesh(bezel, gold)
      ring.position.z = 0.002
      setting.add(ring)
      const stone = new THREE.Mesh(cabochon, i === 0 || i === 4 ? garnet : sapphire)
      stone.scale.set(1.15, 1, 0.8)
      stone.position.z = 0.0045
      setting.add(stone)
    } else {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0058, 0.004, 14).rotateX(Math.PI / 2), gold)
      collar.position.z = 0.001
      setting.add(collar)
      const p = new THREE.Mesh(seed, pearl)
      p.position.z = 0.004
      setting.add(p)
    }
    g.add(setting)
  }

  // Eight fleurs-de-lis on the head of the band, the banner's own shape cut in gold: four
  // large, and a smaller one in each gap (a bare point read as a candle, and candles are
  // banned from the hall).
  const fleur = fleurGeometry()
  const tie = tieGeometry()
  for (let i = 0; i < 8; i++) {
    const a = FRONT + (i / 8) * Math.PI * 2
    const large = i % 2 === 0
    const k = large ? 1 : 0.58
    const f = new THREE.Mesh(fleur, gold)
    f.position.set(Math.cos(a) * (R - 0.002), BAND_H - 0.002, Math.sin(a) * (R - 0.002))
    f.rotation.y = Math.PI / 2 - a
    // A slight outward lean, as the embroidered side fleurs turn with the ring.
    f.rotateX(-0.1)
    f.scale.setScalar(k)
    g.add(f)
    const t = new THREE.Mesh(tie, gold)
    t.position.copy(f.position)
    t.rotation.copy(f.rotation)
    t.scale.setScalar(k)
    g.add(t)
  }

  // The velvet cap inside the circlet, so the crown is not an empty ring.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R - 0.004, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), velvet)
  cap.scale.y = 0.62
  cap.position.y = 0.012
  g.add(cap)

  g.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.castShadow = true
  })
  return g
}

/** The fleur path extruded in gold: 100 units tall in the path, 0.056 here, standing on y = 0. */
const FLEUR_SCALE = 0.00056
function fleurGeometry() {
  const shapes = shapesFrom(FLEUR)
  // Thick enough to read as a chased gold leaf from the side, not a cut-out plate.
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 14, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.8, bevelSegments: 3, curveSegments: 10 })
  // The path's y runs down; the crown's runs up. Centre the thickness on the band's head.
  geo.scale(FLEUR_SCALE, -FLEUR_SCALE, FLEUR_SCALE)
  geo.translate(0, 0, -14 * FLEUR_SCALE * 0.5)
  geo.computeVertexNormals()
  return geo
}

/** The tie that binds the petals, a little proud of the fleur. */
function tieGeometry() {
  const scale = FLEUR_SCALE
  const geo = new THREE.ExtrudeGeometry(shapesFrom(TIE), { depth: 18, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 1, curveSegments: 6 })
  geo.scale(scale, -scale, scale)
  geo.translate(0, 0, -18 * scale * 0.5)
  geo.computeVertexNormals()
  return geo
}

function shapesFrom(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`)
  return data.paths.flatMap((p) => SVGLoader.createShapes(p))
}
