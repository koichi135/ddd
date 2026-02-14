import { useState, useCallback } from 'react'
import './App.css'

const DUNGEON_MAP = [
  '##########',
  '#........#',
  '#..####..#',
  '#..#.....#',
  '#..#..#..#',
  '#.....#..#',
  '#..####..#',
  '#........#',
  '##########',
]

type Command = 'move' | 'search' | 'status' | 'rest'

const COMMANDS: { id: Command; label: string }[] = [
  { id: 'move', label: 'いどう' },
  { id: 'search', label: 'しらべる' },
  { id: 'status', label: 'つよさ' },
  { id: 'rest', label: 'やすむ' },
]

function App() {
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 })
  const [steps, setSteps] = useState(0)
  const [messages, setMessages] = useState<string[]>([
    'ダンジョンに足を踏み入れた...',
  ])
  const [selectedCommand, setSelectedCommand] = useState<Command>('move')
  const [showDirections, setShowDirections] = useState(false)

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev.slice(-4), msg])
  }, [])

  const move = useCallback(
    (dx: number, dy: number) => {
      const nx = playerPos.x + dx
      const ny = playerPos.y + dy
      if (DUNGEON_MAP[ny]?.[nx] === '.') {
        setPlayerPos({ x: nx, y: ny })
        setSteps((s) => s + 1)
        addMessage('ダンジョンを進んだ...')
      } else {
        addMessage('壁があって進めない！')
      }
      setShowDirections(false)
    },
    [playerPos, addMessage],
  )

  const handleCommand = useCallback(
    (cmd: Command) => {
      setSelectedCommand(cmd)
      switch (cmd) {
        case 'move':
          setShowDirections(true)
          addMessage('どの方向に進む？')
          break
        case 'search':
          addMessage('あたりを調べた... しかし何も見つからなかった。')
          setShowDirections(false)
          break
        case 'status':
          addMessage(`冒険者 ── HP: 100  MP: 30  Steps: ${steps}`)
          setShowDirections(false)
          break
        case 'rest':
          addMessage('少し休憩した。体力が回復した。')
          setShowDirections(false)
          break
      }
    },
    [steps, addMessage],
  )

  return (
    <div className="game-container">
      <div className="top-panel">
        <div className="panel dungeon-panel">
          <div className="panel-title">Dungeon</div>
          <div className="dungeon">
            {DUNGEON_MAP.map((row, y) => (
              <div key={y} className="row">
                {row.split('').map((cell, x) => (
                  <span
                    key={x}
                    className={`cell ${cell === '#' ? 'wall' : 'floor'} ${
                      playerPos.x === x && playerPos.y === y ? 'player' : ''
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="panel command-panel">
          <div className="panel-title">Command</div>
          <div className="command-list">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.id}
                className={`command-btn ${selectedCommand === cmd.id ? 'selected' : ''}`}
                onClick={() => handleCommand(cmd.id)}
              >
                {cmd.label}
              </button>
            ))}
          </div>
          {showDirections && (
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
