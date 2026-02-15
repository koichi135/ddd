export interface EnemyData {
  name: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  color: string
  type: 'slime' | 'bat' | 'skeleton'
  expReward: number
  goldReward: number
}

export const ENEMY_TYPES: Omit<EnemyData, 'hp'>[] = [
  {
    name: 'スライム',
    maxHp: 30,
    attack: 8,
    defense: 2,
    color: '#44cc88',
    type: 'slime',
    expReward: 5,
    goldReward: 3,
  },
  {
    name: 'コウモリ',
    maxHp: 20,
    attack: 12,
    defense: 1,
    color: '#8844aa',
    type: 'bat',
    expReward: 7,
    goldReward: 5,
  },
  {
    name: 'スケルトン',
    maxHp: 50,
    attack: 14,
    defense: 5,
    color: '#ccccaa',
    type: 'skeleton',
    expReward: 12,
    goldReward: 10,
  },
]

export function spawnEnemy(floor: number = 0): EnemyData {
  const template = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]
  const scale = 1 + floor * 0.3
  return {
    ...template,
    hp: Math.floor(template.maxHp * scale),
    maxHp: Math.floor(template.maxHp * scale),
    attack: Math.floor(template.attack * scale),
    defense: Math.floor(template.defense * scale),
    expReward: Math.floor(template.expReward * scale),
    goldReward: Math.floor(template.goldReward * scale),
  }
}
