import { useEffect, useState } from 'react'
import type { EnemyData } from './enemies'
import slimeSvg from './assets/enemies/slime.svg'
import batSvg from './assets/enemies/bat.svg'
import skeletonSvg from './assets/enemies/skeleton.svg'
import dragonSvg from './assets/enemies/dragon.svg'

const ENEMY_SPRITES: Record<string, string> = {
  slime: slimeSvg,
  bat: batSvg,
  skeleton: skeletonSvg,
  boss: dragonSvg,
}

/* ── Pixel Art Battle Scene ── */
export default function BattleScene3D({ enemy }: { enemy: EnemyData }) {
  const sprite = ENEMY_SPRITES[enemy.type]
  const isBoss = enemy.type === 'boss'

  /* Simple idle animation: oscillate translateY */
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 120)
    return () => clearInterval(id)
  }, [])

  const bobY = Math.sin(frame * 0.3) * 4

  return (
    <div className="battle-pixel-scene">
      {/* Ground */}
      <div className="battle-pixel-ground" />

      {/* Enemy sprite */}
      <div
        className="battle-pixel-sprite-wrap"
        style={{ transform: `translateY(${bobY}px)` }}
      >
        <img
          className={`battle-pixel-sprite ${isBoss ? 'battle-pixel-boss' : ''}`}
          src={sprite}
          alt={enemy.name}
        />
      </div>

      {/* Ambient particles */}
      {isBoss && (
        <div className="battle-pixel-aura">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="battle-pixel-ember"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
