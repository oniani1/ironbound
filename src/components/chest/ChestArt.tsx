import { useState } from 'react'
import type { Chest } from '../../types'

/** Pre-rendered still of the 3D chest in its tier finish, with a light pool underneath. */
export function ChestArt({ chest, className = '', glow = 1 }: { chest: Chest; className?: string; glow?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-x-[8%] bottom-[2%] h-[38%] rounded-[50%] blur-2xl transition-opacity duration-500"
        style={{ background: `radial-gradient(closest-side, ${chest.theme.glow}, transparent)`, opacity: 0.32 * glow }}
      />
      {!failed ? (
        <img
          src={`/chests/${chest.id}.webp`}
          alt={`${chest.name}`}
          className="relative h-full w-full object-contain drop-shadow-[0_24px_30px_oklch(0%_0_0/.65)]"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <div className="relative mx-auto mt-[18%] aspect-[1.6] w-[70%] rounded-t-[40%] rounded-b-md" style={{ background: `linear-gradient(180deg, ${chest.theme.metal}, ${chest.theme.wood})` }} />
      )}
    </div>
  )
}
