import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ChestScene } from '../components/chest3d/ChestScene'
import { ChestAnim } from '../components/chest3d/animState'
import { CHEST_BY_ID } from '../config/chests'

/** Dev page: renders one chest on a transparent canvas so Playwright can save card art. */
export default function RenderChest() {
  const { id = 'knight' } = useParams()
  const chest = CHEST_BY_ID[id] ?? CHEST_BY_ID.knight!
  const anim = useMemo(() => {
    const a = new ChestAnim()
    a.glow = 0.9
    a.glowColor.set(chest.theme.glow)
    return a
  }, [chest])
  useEffect(() => {
    const els = [document.documentElement, document.body]
    els.forEach((el) => el.style.setProperty('background', 'transparent', 'important'))
    return () => els.forEach((el) => el.style.removeProperty('background'))
  }, [])
  return (
    <div style={{ width: 1200, height: 900, background: 'transparent' }} data-testid="render-root">
      <ChestScene render theme={chest.theme} anim={anim} className="!h-[900px] !w-[1200px]" />
    </div>
  )
}
