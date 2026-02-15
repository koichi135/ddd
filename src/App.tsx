import { useState, useCallback, useEffect } from 'react'
import './App.css'
import CampScene3D from './CampScene3D'
import DungeonScene3D, { type Direction } from './DungeonScene3D'

const DUNGEON_MAP = [
  '##########',
  '#........#',
  '#..####..#',
  '#..#..B..#',
  '#..#..#..#',
  '#.....#..#',
  '#..####..#',
  '#.B......#',
  '##########',
]

const MAX_HP = 100
const MOVE_COST = 5

type GameMode = 'dungeon' | 'camp' | 'gameover'

type Command = 'build' | 'search' | 'status'
type CampCommand = 'rest' | 'fish' | 'depart'

const DUNGEON_COMMANDS: { id: Command; label: string }[] = [
  { id: 'build', label: 'きょてんをつくる' },
  { id: 'search', label: 'しらべる' },
  { id: 'status', label: 'つよさ' },
]

const CAMP_COMMANDS: { id: CampCommand; label: string }[] = [
  { id: 'rest', label: 'やすむ' },
  { id: 'fish', label: 'つりをする' },
  { id: 'depart', label: 'しゅっぱつ' },
]

/* Direction helpers */
const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
}

const TURN_LEFT: Record<Direction, Direction> = {
  N: 'W',
  W: 'S',
  S: 'E',
  E: 'N',
}

const TURN_RIGHT: Record<Direction, Direction> = {
  N: 'E',
  E: 'S',
  S: 'W',
  W: 'N',
}

const DIR_ARROW: Record<Direction, string> = {
  N: '↑',
  S: '↓',
  E: '→',
  W: '←',
}

function isBaseSpot(x: number, y: number) {
  return DUNGEON_MAP[y]?.[x] === 'B'
}

function isWalkable(x: number, y: number) {
  const cell = DUNGEON_MAP[y]?.[x]
  return cell === '.' || cell === 'B'
}

function App() {
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 })
  const [playerDir, setPlayerDir] = useState<Direction>('S')
  const [hp, setHp] = useState(MAX_HP)
  const [steps, setSteps] = useState(0)
  const [mode, setMode] = useState<GameMode>('dungeon')
  const [builtBases, setBuiltBases] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<string[]>([
    'ダンジョンに足を踏み入れた...',
    `体力: ${MAX_HP}/${MAX_HP}`,
  ])

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev.slice(-4), msg])
  }, [])

  const onBaseSpot = isBaseSpot(playerPos.x, playerPos.y)
  const baseKey = `${playerPos.x},${playerPos.y}`
  const baseBuiltHere = builtBases.has(baseKey)

  const moveForward = useCallback(() => {
    if (mode !== 'dungeon') return
    const { dx, dy } = DIR_DELTA[playerDir]
    const nx = playerPos.x + dx
    const ny = playerPos.y + dy
    if (isWalkable(nx, ny)) {
      const newHp = Math.max(0, hp - MOVE_COST)
      setPlayerPos({ x: nx, y: ny })
      setSteps((s) => s + 1)
      setHp(newHp)

      if (newHp <= 0) {
        setMode('gameover')
        addMessage('体力が尽きた... 冒険者は倒れた。')
        return
      }

      const msgs: string[] = [`ダンジョンを進んだ... (HP: ${newHp}/${MAX_HP})`]
      if (isBaseSpot(nx, ny)) {
        if (builtBases.has(`${nx},${ny}`)) {
          msgs.push('拠点だ！ ここで休める。')
        } else {
          msgs.push('拠点を作れそうな場所だ！')
        }
      }
      msgs.forEach((m) => addMessage(m))
    } else {
      addMessage('壁があって進めない！')
    }
  }, [playerPos, playerDir, hp, mode, builtBases, addMessage])

  const moveBackward = useCallback(() => {
    if (mode !== 'dungeon') return
    const { dx, dy } = DIR_DELTA[playerDir]
    const nx = playerPos.x - dx
    const ny = playerPos.y - dy
    if (isWalkable(nx, ny)) {
      const newHp = Math.max(0, hp - MOVE_COST)
      setPlayerPos({ x: nx, y: ny })
      setSteps((s) => s + 1)
      setHp(newHp)

      if (newHp <= 0) {
        setMode('gameover')
        addMessage('体力が尽きた... 冒険者は倒れた。')
        return
      }

      addMessage(`後退した... (HP: ${newHp}/${MAX_HP})`)
    } else {
      addMessage('壁があって進めない！')
    }
  }, [playerPos, playerDir, hp, mode, addMessage])

  const turnLeft = useCallback(() => {
    if (mode !== 'dungeon') return
    setPlayerDir((d) => TURN_LEFT[d])
  }, [mode])

  const turnRight = useCallback(() => {
    if (mode !== 'dungeon') return
    setPlayerDir((d) => TURN_RIGHT[d])
  }, [mode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          moveForward()
          break
        case 'ArrowDown':
          e.preventDefault()
          moveBackward()
          break
        case 'ArrowLeft':
          e.preventDefault()
          turnLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          turnRight()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveForward, moveBackward, turnLeft, turnRight])

  const handleDungeonCommand = useCallback(
    (cmd: Command) => {
      switch (cmd) {
        case 'build':
          if (!onBaseSpot) {
            addMessage('ここには拠点を作れない。')
          } else if (baseBuiltHere) {
            setMode('camp')
            addMessage('拠点に入った。ゆっくり休もう。')
          } else {
            setBuiltBases((prev) => new Set(prev).add(baseKey))
            setMode('camp')
            addMessage('拠点を建設した！ キャンプを設営する...')
          }
          break
        case 'search':
          addMessage('あたりを調べた... しかし何も見つからなかった。')
          break
        case 'status':
          addMessage(
            `冒険者 ── HP: ${hp}/${MAX_HP}  Steps: ${steps}  拠点数: ${builtBases.size}`,
          )
          break
      }
    },
    [onBaseSpot, baseBuiltHere, baseKey, hp, steps, builtBases, addMessage],
  )

  const handleCampCommand = useCallback(
    (cmd: CampCommand) => {
      switch (cmd) {
        case 'rest':
          setHp(MAX_HP)
          addMessage(`ぐっすり眠った... HPが全回復した！ (HP: ${MAX_HP}/${MAX_HP})`)
          break
        case 'fish':
          if (Math.random() < 0.6) {
            addMessage('魚が釣れた！ おいしく食べた。')
          } else {
            addMessage('...釣れなかった。')
          }
          break
        case 'depart':
          setMode('dungeon')
          addMessage('拠点を出発した。ダンジョンを進もう。')
          break
      }
    },
    [addMessage],
  )

  const restart = useCallback(() => {
    setPlayerPos({ x: 1, y: 1 })
    setPlayerDir('S')
    setHp(MAX_HP)
    setSteps(0)
    setMode('dungeon')
    setBuiltBases(new Set())
    setMessages(['目を覚ました... もう一度挑戦だ。', `体力: ${MAX_HP}/${MAX_HP}`])
  }, [])

  const buildLabel = !onBaseSpot
    ? 'きょてんをつくる'
    : baseBuiltHere
      ? 'きょてんに入る'
      : 'きょてんをつくる'

  return (
    <div className="game-container">
      <div className="top-panel">
        {/* ===== Left: Dungeon / Camp view ===== */}
        <div className="panel dungeon-panel">
          <div className="panel-title">
            {mode === 'camp' ? 'Camp' : 'Dungeon'}
          </div>
          {mode === 'camp' ? (
            <div className="camp-view">
              <CampScene3D />
            </div>
          ) : (
            <div className="dungeon-3d-container">
              <DungeonScene3D
                dungeonMap={DUNGEON_MAP}
                playerPos={playerPos}
                playerDir={playerDir}
                builtBases={builtBases}
              />
              {/* Minimap overlay */}
              <div className="minimap">
                {DUNGEON_MAP.map((row, y) => (
                  <div key={y} className="minimap-row">
                    {row.split('').map((cell, x) => {
                      const isPlayer =
                        playerPos.x === x && playerPos.y === y
                      const isBase = cell === 'B'
                      const built = builtBases.has(`${x},${y}`)
                      let cls = 'minimap-cell '
                      if (isPlayer) cls += 'minimap-player'
                      else if (cell === '#') cls += 'minimap-wall'
                      else if (isBase && built) cls += 'minimap-base-built'
                      else if (isBase) cls += 'minimap-base-spot'
                      else cls += 'minimap-floor'
                      return <span key={x} className={cls} />
                    })}
                  </div>
                ))}
                <div className="minimap-dir">{DIR_ARROW[playerDir]}</div>
              </div>
            </div>
          )}
          {/* HP bar */}
          <div className="hp-bar-container">
            <span className="hp-label">HP</span>
            <div className="hp-bar">
              <div
                className="hp-fill"
                style={{ width: `${(hp / MAX_HP) * 100}%` }}
              />
            </div>
            <span className="hp-text">
              {hp}/{MAX_HP}
            </span>
          </div>
        </div>

        {/* ===== Right: Command + Direction ===== */}
        <div className="panel command-panel">
          <div className="panel-title">Command</div>
          {mode === 'gameover' ? (
            <div className="command-list">
              <p className="gameover-text">GAME OVER</p>
              <button className="command-btn selected" onClick={restart}>
                もういちど
              </button>
            </div>
          ) : mode === 'camp' ? (
            <div className="command-list">
              {CAMP_COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  className="command-btn"
                  onClick={() => handleCampCommand(cmd.id)}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="command-list">
              {DUNGEON_COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  className={`command-btn ${cmd.id === 'build' && !onBaseSpot ? 'disabled' : ''}`}
                  onClick={() => handleDungeonCommand(cmd.id)}
                  disabled={cmd.id === 'build' && !onBaseSpot}
                >
                  {cmd.id === 'build' ? buildLabel : cmd.label}
                </button>
              ))}
            </div>
          )}

          {/* Direction pad — Wizardry style */}
          {mode === 'dungeon' && (
            <div className="direction-pad">
              <div className="dir-row">
                <button className="dir-btn" onClick={moveForward}>
                  ↑
                </button>
              </div>
              <div className="dir-row">
                <button className="dir-btn dir-turn" onClick={turnLeft}>
                  ◁
                </button>
                <button className="dir-btn" onClick={moveBackward}>
                  ↓
                </button>
                <button className="dir-btn dir-turn" onClick={turnRight}>
                  ▷
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Bottom: Message ===== */}
      <div className="panel message-panel">
        <div className="panel-title">Message</div>
        <div className="message-log">
          {messages.map((msg, i) => (
            <p key={i} className={i === messages.length - 1 ? 'latest' : ''}>
              {msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
