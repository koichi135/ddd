import { useState, useCallback, useEffect } from 'react'
import './App.css'

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

const CAMP_ART = [
  '        🌙          ',
  '    ✦       ✦       ',
  '                    ',
  '      ⛺             ',
  '    🔥  🧑           ',
  '  ～～～～～～～～～～',
]

function isBaseSpot(x: number, y: number) {
  return DUNGEON_MAP[y]?.[x] === 'B'
}

function isWalkable(x: number, y: number) {
  const cell = DUNGEON_MAP[y]?.[x]
  return cell === '.' || cell === 'B'
}

function App() {
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 })
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

  const move = useCallback(
    (dx: number, dy: number) => {
      if (mode !== 'dungeon') return

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
    },
    [playerPos, hp, mode, builtBases, addMessage],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          move(0, -1)
          break
        case 'ArrowDown':
          e.preventDefault()
          move(0, 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          move(-1, 0)
          break
        case 'ArrowRight':
          e.preventDefault()
          move(1, 0)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [move])

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
              {CAMP_ART.map((line, i) => (
                <pre key={i} className="camp-line">
                  {line}
                </pre>
              ))}
            </div>
          ) : (
            <div className="dungeon">
              {DUNGEON_MAP.map((row, y) => (
                <div key={y} className="row">
                  {row.split('').map((cell, x) => {
                    const isPlayer =
                      playerPos.x === x && playerPos.y === y
                    const isBase = cell === 'B'
                    const built = builtBases.has(`${x},${y}`)
                    let cls = 'cell '
                    if (isPlayer) cls += 'player'
                    else if (cell === '#') cls += 'wall'
                    else if (isBase && built) cls += 'base-built'
                    else if (isBase) cls += 'base-spot'
                    else cls += 'floor'
                    return <span key={x} className={cls} />
                  })}
                </div>
              ))}
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

          {/* Direction pad — always visible in dungeon mode */}
          {mode === 'dungeon' && (
            <div className="direction-pad">
              <div className="dir-row">
                <button className="dir-btn" onClick={() => move(0, -1)}>
                  ↑
                </button>
              </div>
              <div className="dir-row">
                <button className="dir-btn" onClick={() => move(-1, 0)}>
                  ←
                </button>
                <button className="dir-btn" onClick={() => move(0, 1)}>
                  ↓
                </button>
                <button className="dir-btn" onClick={() => move(1, 0)}>
                  →
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
