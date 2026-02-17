import potionSvg from './assets/items/potion.svg'
import swordSvg from './assets/items/sword.svg'
import keySvg from './assets/items/key.svg'

const items = [
  { name: 'ポーション', src: potionSvg },
  { name: '剣', src: swordSvg },
  { name: 'カギ', src: keySvg },
]

export default function PixelArtPreview() {
  return (
    <div
      style={{
        background: '#0a0a1e',
        padding: '2rem',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        fontFamily: "'Courier New', monospace",
        color: '#ccc',
      }}
    >
      <h1 style={{ color: '#8888cc' }}>Pixel Art Items</h1>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map((item) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {/* 16x16 を 128x128 に拡大表示（ドット感を保持） */}
            <img
              src={item.src}
              alt={item.name}
              style={{
                width: 128,
                height: 128,
                imageRendering: 'pixelated',
                border: '2px solid #8888cc',
                borderRadius: 4,
                background: '#111133',
              }}
            />
            <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
