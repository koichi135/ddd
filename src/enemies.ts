export interface EnemyData {
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  color: string
  type: 'slime' | 'bat' | 'skeleton'
}

export const ENEMY_TYPES: Omit<EnemyData, 'hp'>[] = [
  {
    name: 'スライム',
    maxHp: 30,
    attack: 8,
    defense: 2,
    color: '#44cc88',
    type: 'slime',
  },
  {
    name: 'コウモリ',
    maxHp: 20,
    attack: 12,
    defense: 1,
    color: '#8844aa',
    type: 'bat',
  },
  {
    name: 'スケルトン',
    maxHp: 50,
    attack: 14,
    defense: 5,
    color: '#ccccaa',
    type: 'skeleton',
  },
]

export function spawnEnemy(): EnemyData {
  const template = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]
  return { ...template, hp: template.maxHp }
}
