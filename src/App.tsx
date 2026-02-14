import { useState } from 'react'
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

function App() {
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 })

  const move = (dx: number, dy: number) => {
    const nx = playerPos.x + dx
    const ny = playerPos.y + dy
    if (DUNGEON_MAP[ny]?.[nx] === '.') {
      setPlayerPos({ x: nx, y: ny })
    }
  }

  return (
    <div className="game">
      <h1>Dungeon Game</h1>
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
      <div className="controls">
        <div className="controls-row">
          <button onClick={() => move(0, -1)}>↑</button>
        </div>
        <div className="controls-row">
          <button onClick={() => move(-1, 0)}>←</button>
          <button onClick={() => move(0, 1)}>↓</button>
          <button onClick={() => move(1, 0)}>→</button>
        </div>
      </div>
      <p className="hint">ボタンで移動できます</p>
    </div>
  )
}

export default App
