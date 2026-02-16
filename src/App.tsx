import { useState, useCallback, useEffect } from 'react'
import './App.css'
import CampScene3D from './CampScene3D'
import DungeonScene3D, { type Direction } from './DungeonScene3D'
import BattleScene3D from './BattleScene3D'
import { type EnemyData, spawnEnemy, spawnBoss } from './enemies'

/* ── Floor maps ── */
const NORMAL_FLOORS: string[][] = [
  [
    '##########',
    '#........#',
    '#..####..#',
    '#..#..B..#',
    '#..#..#..#',
    '#.....#..#',
    '#..####..#',
    '#.B...S..#',
    '##########',
  ],
  [
    '##########',
    '#.....B..#',
    '#.####.#.#',
    '#.#....#.#',
    '#.#.##.#.#',
    '#......#.#',
    '#.####...#',
    '#.S..B...#',
    '##########',
  ],
  [
    '##########',
    '#........#',
    '#.##.###.#',
    '#..#...#.#',
    '#.B#.#.#.#',
    '#..#.#...#',
    '#.##.###.#',
    '#....S.B.#',
    '##########',
  ],
  [
    '##########',
    '#........#',
    '#.#.####.#',
    '#.#......#',
    '#.###.##.#',
    '#......#.#',
    '#.####.#.#',
    '#.B..S...#',
    '##########',
  ],
]

const BOSS_FLOOR: string[] = [
  '##########',
  '#........#',
  '#.######.#',
  '#.#....#.#',
  '#.#.K..#.#',
  '#.#....#.#',
  '#.#..#...#',
  '#.B......#',
  '##########',
]

const BOSS_FLOOR_INDEX = 4

const BASE_MAX_HP = 100
const MOVE_COST = 5
const BASE_ATK = 15
const BASE_DEF = 5
const ENCOUNTER_RATE = 0.25
const MAX_POTIONS = 3
const POTION_HEAL = 30
const EXP_TABLE = [0, 10, 25, 50, 80, 120, 170, 230, 300, 380]
const TREASURE_RATE = 0.35
const SAVE_KEY = 'dungeon-crawler-save'

interface SaveData {
  floor: number
  playerPos: { x: number; y: number }
  playerDir: Direction
  level: number
  exp: number
  gold: number
  hp: number
  steps: number
  potions: number
  builtBases: string[]
  lastRestedBase: { x: number; y: number; floor: number } | null
  bossDefeated: boolean
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SaveData
  } catch {
    return null
  }
}

function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    /* quota exceeded – silently ignore */
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}

type GameMode = 'dungeon' | 'camp' | 'battle' | 'gameover'
type BattlePhase = 'player' | 'enemy' | 'win' | 'lose'

type Command = 'build' | 'search' | 'status'
type CampCommand = 'rest' | 'cook' | 'fish' | 'depart'
type BattleCommand = 'attack' | 'defend' | 'item' | 'run'

const DUNGEON_COMMANDS: { id: Command; label: string }[] = [
  { id: 'build', label: 'キャンプする' },
  { id: 'search', label: 'しらべる' },
  { id: 'status', label: 'つよさ' },
]

const COOK_COST = 15
const RECIPES = [
  { name: 'スライム汁', heal: 40 },
  { name: '焼き魚定食', heal: 50 },
  { name: '冒険者カレー', heal: 60 },
  { name: 'きのこのスープ', heal: 45 },
]

const CAMP_COMMANDS: { id: CampCommand; label: string }[] = [
  { id: 'rest', label: 'やすむ' },
  { id: 'cook', label: 'りょうりする' },
  { id: 'fish', label: 'つりをする' },
  { id: 'depart', label: 'しゅっぱつ' },
]

const BATTLE_COMMANDS: { id: BattleCommand; label: string }[] = [
  { id: 'attack', label: 'こうげき' },
  { id: 'defend', label: 'ぼうぎょ' },
  { id: 'item', label: 'アイテム' },
  { id: 'run', label: 'にげる' },
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

function getFloorMap(floor: number, bossDefeated: boolean): string[] {
  if (floor === BOSS_FLOOR_INDEX) {
    if (bossDefeated) {
      /* Replace boss marker with stairs after boss defeated */
      return BOSS_FLOOR.map((row) => row.replace('K', 'S'))
    }
    return BOSS_FLOOR
  }
  return NORMAL_FLOORS[floor % NORMAL_FLOORS.length]
}

function isBaseSpot(map: string[], x: number, y: number) {
  return map[y]?.[x] === 'B'
}

function isStairs(map: string[], x: number, y: number) {
  return map[y]?.[x] === 'S'
}

function isBossSpot(map: string[], x: number, y: number) {
  return map[y]?.[x] === 'K'
}

function isWalkable(map: string[], x: number, y: number) {
  const cell = map[y]?.[x]
  return cell === '.' || cell === 'B' || cell === 'S' || cell === 'K'
}

function calcDamage(atk: number, def: number): number {
  const base = Math.max(1, atk - def)
  const variance = Math.floor(Math.random() * 5) - 2
  return Math.max(1, base + variance)
}

function expForNextLevel(level: number): number {
  if (level - 1 < EXP_TABLE.length) return EXP_TABLE[level - 1]
  return EXP_TABLE[EXP_TABLE.length - 1] + (level - EXP_TABLE.length) * 60
}

function getMaxHp(level: number): number {
  return BASE_MAX_HP + (level - 1) * 10
}

function getAtk(level: number): number {
  return BASE_ATK + (level - 1) * 3
}

function getDef(level: number): number {
  return BASE_DEF + (level - 1) * 2
}

const INITIAL_SAVE = loadSave()

function App() {
  const [floor, setFloor] = useState(INITIAL_SAVE?.floor ?? 0)
  const [playerPos, setPlayerPos] = useState(
    INITIAL_SAVE?.playerPos ?? { x: 1, y: 1 },
  )
  const [playerDir, setPlayerDir] = useState<Direction>(
    INITIAL_SAVE?.playerDir ?? 'S',
  )
  const [level, setLevel] = useState(INITIAL_SAVE?.level ?? 1)
  const [exp, setExp] = useState(INITIAL_SAVE?.exp ?? 0)
  const [gold, setGold] = useState(INITIAL_SAVE?.gold ?? 0)
  const [hp, setHp] = useState(INITIAL_SAVE?.hp ?? getMaxHp(1))
  const [steps, setSteps] = useState(INITIAL_SAVE?.steps ?? 0)
  const [potions, setPotions] = useState(INITIAL_SAVE?.potions ?? MAX_POTIONS)
  const [mode, setMode] = useState<GameMode>('dungeon')
  const [builtBases, setBuiltBases] = useState<Set<string>>(
    new Set(INITIAL_SAVE?.builtBases ?? []),
  )
  const [lastRestedBase, setLastRestedBase] = useState<{
    x: number
    y: number
    floor: number
  } | null>(INITIAL_SAVE?.lastRestedBase ?? null)
  const [bossDefeated, setBossDefeated] = useState(INITIAL_SAVE?.bossDefeated ?? false)
  const [messages, setMessages] = useState<string[]>(
    INITIAL_SAVE
      ? ['セーブデータをロードした。冒険を続けよう！']
      : ['ダンジョンに足を踏み入れた...', `体力: ${getMaxHp(1)}/${getMaxHp(1)}`],
  )

  /* Battle state */
  const [enemy, setEnemy] = useState<EnemyData | null>(null)
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('player')
  const [defending, setDefending] = useState(false)

  const dungeonMap = getFloorMap(floor, bossDefeated)
  const maxHp = getMaxHp(level)
  const playerAtk = getAtk(level)
  const playerDef = getDef(level)

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev.slice(-4), msg])
  }, [])

  /* ── Auto-save to localStorage ── */
  useEffect(() => {
    writeSave({
      floor,
      playerPos,
      playerDir,
      level,
      exp,
      gold,
      hp,
      steps,
      potions,
      builtBases: Array.from(builtBases),
      lastRestedBase,
      bossDefeated,
    })
  }, [
    floor,
    playerPos,
    playerDir,
    level,
    exp,
    gold,
    hp,
    steps,
    potions,
    builtBases,
    lastRestedBase,
    bossDefeated,
  ])

  const onBaseSpot = isBaseSpot(dungeonMap, playerPos.x, playerPos.y)
  const onStairs = isStairs(dungeonMap, playerPos.x, playerPos.y)
  const baseKey = `${floor}:${playerPos.x},${playerPos.y}`
  const baseBuiltHere = builtBases.has(baseKey)

  /* ── Level up check ── */
  const checkLevelUp = useCallback(
    (currentExp: number, currentLevel: number) => {
      let lv = currentLevel
      let ex = currentExp
      const msgs: string[] = []
      while (ex >= expForNextLevel(lv)) {
        ex -= expForNextLevel(lv)
        lv += 1
        msgs.push(
          `レベルアップ！ Lv.${lv} (HP+10, ATK+3, DEF+2)`,
        )
      }
      if (lv !== currentLevel) {
        setLevel(lv)
        setExp(ex)
        const newMaxHp = getMaxHp(lv)
        setHp((prev) => Math.min(prev + 10 * (lv - currentLevel), newMaxHp))
        msgs.forEach((m) => addMessage(m))
      }
      return { level: lv, exp: ex }
    },
    [addMessage],
  )

  /* ── Start encounter ── */
  const startBattle = useCallback(() => {
    const e = spawnEnemy(floor)
    setEnemy(e)
    setBattlePhase('player')
    setDefending(false)
    setMode('battle')
    addMessage(`${e.name}が現れた！`)
  }, [addMessage, floor])

  /* ── Start boss battle ── */
  const startBossBattle = useCallback(() => {
    const boss = spawnBoss()
    setEnemy(boss)
    setBattlePhase('player')
    setDefending(false)
    setMode('battle')
    addMessage('地面が揺れている...')
    addMessage(`${boss.name}が立ちはだかった！`)
  }, [addMessage])

  /* ── Go to next floor via stairs ── */
  const descendStairs = useCallback(() => {
    const nextFloor = floor + 1
    setFloor(nextFloor)
    setPlayerPos({ x: 1, y: 1 })
    setPlayerDir('S')
    addMessage(`階段を降りた... 地下${nextFloor + 1}階に到達！`)
  }, [floor, addMessage])

  /* ── Movement (may trigger encounter) ── */
  const moveForward = useCallback(() => {
    if (mode !== 'dungeon') return
    const { dx, dy } = DIR_DELTA[playerDir]
    const nx = playerPos.x + dx
    const ny = playerPos.y + dy
    if (isWalkable(dungeonMap, nx, ny)) {
      const newHp = Math.max(0, hp - MOVE_COST)
      setPlayerPos({ x: nx, y: ny })
      setSteps((s) => s + 1)
      setHp(newHp)

      if (newHp <= 0) {
        setMode('gameover')
        addMessage('体力が尽きた... 冒険者は倒れた。')
        return
      }

      const msgs: string[] = [`ダンジョンを進んだ... (HP: ${newHp}/${maxHp})`]
      if (isBaseSpot(dungeonMap, nx, ny)) {
        if (builtBases.has(`${floor}:${nx},${ny}`)) {
          setHp(maxHp)
          msgs.push(`キャンプ地だ！ HPが全回復した！ (HP: ${maxHp}/${maxHp})`)
        } else {
          msgs.push('キャンプできそうな場所だ！')
        }
      }
      if (isStairs(dungeonMap, nx, ny)) {
        msgs.push('階段がある！ 次の階へ降りられる。')
      }
      if (isBossSpot(dungeonMap, nx, ny)) {
        msgs.push('強大な気配を感じる...！')
      }
      msgs.forEach((m) => addMessage(m))

      /* Boss encounter (immediate) */
      if (isBossSpot(dungeonMap, nx, ny) && !bossDefeated) {
        setTimeout(() => startBossBattle(), 300)
        return
      }

      /* Random encounter check */
      if (
        !isBaseSpot(dungeonMap, nx, ny) &&
        !isStairs(dungeonMap, nx, ny) &&
        Math.random() < ENCOUNTER_RATE
      ) {
        setTimeout(() => startBattle(), 300)
      }
    } else {
      addMessage('壁があって進めない！')
    }
  }, [
    playerPos,
    playerDir,
    hp,
    maxHp,
    mode,
    dungeonMap,
    floor,
    builtBases,
    bossDefeated,
    addMessage,
    startBattle,
    startBossBattle,
  ])

  const moveBackward = useCallback(() => {
    if (mode !== 'dungeon') return
    const { dx, dy } = DIR_DELTA[playerDir]
    const nx = playerPos.x - dx
    const ny = playerPos.y - dy
    if (isWalkable(dungeonMap, nx, ny)) {
      const newHp = Math.max(0, hp - MOVE_COST)
      setPlayerPos({ x: nx, y: ny })
      setSteps((s) => s + 1)
      setHp(newHp)

      if (newHp <= 0) {
        setMode('gameover')
        addMessage('体力が尽きた... 冒険者は倒れた。')
        return
      }

      addMessage(`後退した... (HP: ${newHp}/${maxHp})`)

      if (
        isBaseSpot(dungeonMap, nx, ny) &&
        builtBases.has(`${floor}:${nx},${ny}`)
      ) {
        setHp(maxHp)
        addMessage(`キャンプ地だ！ HPが全回復した！ (HP: ${maxHp}/${maxHp})`)
      }

      /* Boss encounter (immediate) */
      if (isBossSpot(dungeonMap, nx, ny) && !bossDefeated) {
        setTimeout(() => startBossBattle(), 300)
        return
      }

      if (
        !isBaseSpot(dungeonMap, nx, ny) &&
        !isStairs(dungeonMap, nx, ny) &&
        Math.random() < ENCOUNTER_RATE
      ) {
        setTimeout(() => startBattle(), 300)
      }
    } else {
      addMessage('壁があって進めない！')
    }
  }, [
    playerPos,
    playerDir,
    hp,
    maxHp,
    mode,
    dungeonMap,
    floor,
    builtBases,
    bossDefeated,
    addMessage,
    startBattle,
    startBossBattle,
  ])

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

  /* ── Enemy turn ── */
  const enemyTurn = useCallback(
    (currentHp: number, currentEnemy: EnemyData) => {
      const defMultiplier = defending ? 0.5 : 1
      const rawDmg = calcDamage(currentEnemy.attack, playerDef)
      const dmg = Math.max(1, Math.floor(rawDmg * defMultiplier))
      const newHp = Math.max(0, currentHp - dmg)
      setHp(newHp)
      setDefending(false)

      if (defending) {
        addMessage(
          `${currentEnemy.name}の攻撃！ 防御で${dmg}ダメージに軽減！ (HP: ${newHp}/${maxHp})`,
        )
      } else {
        addMessage(
          `${currentEnemy.name}の攻撃！ ${dmg}のダメージ！ (HP: ${newHp}/${maxHp})`,
        )
      }

      if (newHp <= 0) {
        setBattlePhase('lose')
        addMessage('冒険者は倒れた...')
      } else {
        setBattlePhase('player')
      }
    },
    [defending, playerDef, maxHp, addMessage],
  )

  /* ── Battle commands ── */
  const handleBattleCommand = useCallback(
    (cmd: BattleCommand) => {
      if (battlePhase !== 'player' || !enemy) return

      switch (cmd) {
        case 'attack': {
          const dmg = calcDamage(playerAtk, enemy.defense)
          const newEnemyHp = Math.max(0, enemy.hp - dmg)
          const updatedEnemy = { ...enemy, hp: newEnemyHp }
          setEnemy(updatedEnemy)
          addMessage(`冒険者の攻撃！ ${enemy.name}に${dmg}のダメージ！`)

          if (newEnemyHp <= 0) {
            setBattlePhase('win')
            const earnedExp = enemy.expReward
            const earnedGold = enemy.goldReward
            const newExp = exp + earnedExp
            const newGold = gold + earnedGold
            setExp(newExp)
            setGold(newGold)
            addMessage(
              `${enemy.name}を倒した！ (EXP+${earnedExp}, Gold+${earnedGold})`,
            )
            checkLevelUp(newExp, level)
          } else {
            setBattlePhase('enemy')
            setTimeout(() => enemyTurn(hp, updatedEnemy), 600)
          }
          break
        }

        case 'defend': {
          setDefending(true)
          addMessage('冒険者は身を守っている...')
          setBattlePhase('enemy')
          setTimeout(() => enemyTurn(hp, enemy), 600)
          break
        }

        case 'item': {
          if (potions <= 0) {
            addMessage('ポーションがない！')
            return
          }
          const healAmount = Math.min(POTION_HEAL, maxHp - hp)
          const newHp = hp + healAmount
          setHp(newHp)
          setPotions((p) => p - 1)
          addMessage(
            `ポーションを使った！ HPが${healAmount}回復！ (HP: ${newHp}/${maxHp})`,
          )
          setBattlePhase('enemy')
          setTimeout(() => enemyTurn(newHp, enemy), 600)
          break
        }

        case 'run': {
          if (Math.random() < 0.5) {
            addMessage('うまく逃げ切った！')
            setEnemy(null)
            setMode('dungeon')
          } else {
            addMessage('逃げられなかった！')
            setBattlePhase('enemy')
            setTimeout(() => enemyTurn(hp, enemy), 600)
          }
          break
        }
      }
    },
    [
      battlePhase,
      enemy,
      hp,
      potions,
      exp,
      gold,
      level,
      maxHp,
      playerAtk,
      addMessage,
      enemyTurn,
      checkLevelUp,
    ],
  )

  /* ── Battle end handlers ── */
  const handleBattleWin = useCallback(() => {
    const wasBoss = enemy?.isBoss
    setEnemy(null)
    setMode('dungeon')
    if (wasBoss) {
      setBossDefeated(true)
      addMessage('ボスを討伐した！！ 階段が現れた...')
    } else {
      addMessage('戦闘に勝利した！ ダンジョンを進もう。')
    }
  }, [addMessage, enemy])

  const handleBattleLose = useCallback(() => {
    setMode('gameover')
    addMessage('体力が尽きた... 冒険者は倒れた。')
  }, [addMessage])

  const handleDungeonCommand = useCallback(
    (cmd: Command) => {
      switch (cmd) {
        case 'build':
          if (onStairs) {
            descendStairs()
          } else if (!onBaseSpot) {
            addMessage('ここではキャンプできない。')
          } else if (baseBuiltHere) {
            setMode('camp')
            addMessage('キャンプ地に入った。ゆっくり休もう。')
          } else {
            setBuiltBases((prev) => new Set(prev).add(baseKey))
            setMode('camp')
            addMessage('キャンプを設営した！')
          }
          break
        case 'search': {
          if (Math.random() < TREASURE_RATE) {
            const foundGold = 5 + Math.floor(Math.random() * 10) * (floor + 1)
            setGold((g) => g + foundGold)
            addMessage(`宝箱を見つけた！ ${foundGold}ゴールドを手に入れた！`)
            if (Math.random() < 0.3) {
              setPotions((p) => Math.min(p + 1, MAX_POTIONS))
              addMessage('ポーションも見つけた！')
            }
          } else {
            addMessage('あたりを調べた... しかし何も見つからなかった。')
          }
          break
        }
        case 'status':
          addMessage(
            `Lv.${level} 冒険者 ── HP: ${hp}/${maxHp}  ATK: ${playerAtk}  DEF: ${playerDef}  EXP: ${exp}/${expForNextLevel(level)}  Gold: ${gold}  地下${floor + 1}階  歩数: ${steps}  ポーション: ${potions}`,
          )
          break
      }
    },
    [
      onBaseSpot,
      onStairs,
      baseBuiltHere,
      baseKey,
      hp,
      maxHp,
      steps,
      potions,
      level,
      exp,
      gold,
      floor,
      playerAtk,
      playerDef,
      addMessage,
      descendStairs,
    ],
  )

  const handleCampCommand = useCallback(
    (cmd: CampCommand) => {
      switch (cmd) {
        case 'rest':
          setHp(maxHp)
          setLastRestedBase({ x: playerPos.x, y: playerPos.y, floor })
          addMessage(
            `ぐっすり眠った... HPが全回復した！ (HP: ${maxHp}/${maxHp})`,
          )
          break
        case 'cook': {
          if (gold < COOK_COST) {
            addMessage(`材料費が足りない！ (${COOK_COST}G必要)`)
            break
          }
          const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)]
          const cookHeal = Math.min(recipe.heal, maxHp - hp)
          setGold((g) => g - COOK_COST)
          setHp((h) => Math.min(h + recipe.heal, maxHp))
          addMessage(
            `${recipe.name}を作った！ HPが${cookHeal}回復！ (-${COOK_COST}G)`,
          )
          break
        }
        case 'fish':
          if (Math.random() < 0.6) {
            const healAmount = Math.min(15, maxHp - hp)
            setHp((h) => Math.min(h + 15, maxHp))
            addMessage(
              `魚が釣れた！ おいしく食べた。HPが${healAmount}回復した。`,
            )
          } else {
            addMessage('...釣れなかった。')
          }
          break
        case 'depart':
          setMode('dungeon')
          addMessage('キャンプ地を出発した。ダンジョンを進もう。')
          break
      }
    },
    [maxHp, hp, gold, playerPos, floor, addMessage],
  )

  /* ── Game over / restart ── */
  const restart = useCallback(() => {
    if (lastRestedBase) {
      /* Return to last rested base */
      setFloor(lastRestedBase.floor)
      setPlayerPos({ x: lastRestedBase.x, y: lastRestedBase.y })
      setPlayerDir('S')
      const respawnHp = Math.floor(maxHp * 0.5)
      setHp(respawnHp)
      const lostGold = Math.floor(gold * 0.3)
      setGold((g) => g - lostGold)
      setMode('dungeon')
      setEnemy(null)
      setMessages([
        'キャンプ地で目を覚ました...',
        `ゴールドを${lostGold}失ったようだ。`,
        `体力: ${respawnHp}/${maxHp}`,
      ])
    } else {
      /* Full reset (no base ever rested at) */
      setFloor(0)
      setPlayerPos({ x: 1, y: 1 })
      setPlayerDir('S')
      setLevel(1)
      setExp(0)
      setGold(0)
      setHp(getMaxHp(1))
      setSteps(0)
      setPotions(MAX_POTIONS)
      setMode('dungeon')
      setBuiltBases(new Set())
      setLastRestedBase(null)
      setBossDefeated(false)
      setEnemy(null)
      setMessages([
        '目を覚ました... もう一度挑戦だ。',
        `体力: ${getMaxHp(1)}/${getMaxHp(1)}`,
      ])
    }
  }, [lastRestedBase, maxHp, gold])

  /* ── Full reset (clear save) ── */
  const fullReset = () => {
    clearSave()
    setFloor(0)
    setPlayerPos({ x: 1, y: 1 })
    setPlayerDir('S')
    setLevel(1)
    setExp(0)
    setGold(0)
    setHp(getMaxHp(1))
    setSteps(0)
    setPotions(MAX_POTIONS)
    setMode('dungeon')
    setBuiltBases(new Set())
    setLastRestedBase(null)
    setBossDefeated(false)
    setEnemy(null)
    setMessages([
      'セーブデータをリセットした。',
      'ダンジョンに足を踏み入れた...',
      `体力: ${getMaxHp(1)}/${getMaxHp(1)}`,
    ])
  }

  const buildLabel = onStairs
    ? 'かいだんを降りる'
    : !onBaseSpot
      ? 'キャンプする'
      : baseBuiltHere
        ? 'キャンプに入る'
        : 'キャンプする'

  const buildDisabled = !onBaseSpot && !onStairs

  /* Panel title */
  const panelTitle =
    mode === 'camp'
      ? 'Camp'
      : mode === 'battle'
        ? 'Battle'
        : `Dungeon B${floor + 1}F`

  return (
    <div className="game-container">
      <div className="top-panel">
        {/* ===== Left: Scene view ===== */}
        <div className="panel dungeon-panel">
          <div className="panel-title">{panelTitle}</div>
          {mode === 'camp' ? (
            <div className="camp-view">
              <CampScene3D />
            </div>
          ) : mode === 'battle' && enemy ? (
            <div className="battle-view">
              <BattleScene3D enemy={enemy} />
              {/* Enemy HP bar overlay */}
              <div className="enemy-status">
                <span className="enemy-name">{enemy.name}</span>
                <div className="enemy-hp-bar">
                  <div
                    className="enemy-hp-fill"
                    style={{
                      width: `${(enemy.hp / enemy.maxHp) * 100}%`,
                    }}
                  />
                </div>
                <span className="enemy-hp-text">
                  {enemy.hp}/{enemy.maxHp}
                </span>
              </div>
            </div>
          ) : (
            <div className="dungeon-3d-container">
              <DungeonScene3D
                dungeonMap={dungeonMap}
                playerPos={playerPos}
                playerDir={playerDir}
                builtBases={builtBases}
                floor={floor}
              />
              {/* Minimap overlay */}
              <div className="minimap">
                {dungeonMap.map((row, y) => (
                  <div key={y} className="minimap-row">
                    {row.split('').map((cell, x) => {
                      const isPlayer =
                        playerPos.x === x && playerPos.y === y
                      const isBase = cell === 'B'
                      const isStairCell = cell === 'S'
                      const isBossCell = cell === 'K'
                      const built = builtBases.has(`${floor}:${x},${y}`)
                      let cls = 'minimap-cell '
                      if (isPlayer) cls += 'minimap-player'
                      else if (cell === '#') cls += 'minimap-wall'
                      else if (isBossCell) cls += 'minimap-boss'
                      else if (isStairCell) cls += 'minimap-stairs'
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
          {/* Status bar */}
          <div className="hp-bar-container">
            <span className="hp-label">
              Lv.{level}
            </span>
            <div className="hp-bar">
              <div
                className="hp-fill"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
            <span className="hp-text">
              {hp}/{maxHp}
            </span>
            <span className="gold-text">{gold}G</span>
          </div>
        </div>

        {/* ===== Right: Command + Direction ===== */}
        <div className="panel command-panel">
          <div className="panel-title">Command</div>
          {mode === 'gameover' ? (
            <div className="command-list">
              <p className="gameover-text">GAME OVER</p>
              <button className="command-btn selected" onClick={restart}>
                {lastRestedBase ? 'キャンプに戻る' : 'もういちど'}
              </button>
            </div>
          ) : mode === 'camp' ? (
            <div className="command-list">
              {CAMP_COMMANDS.map((cmd) => {
                const isCookDisabled = cmd.id === 'cook' && gold < COOK_COST
                return (
                  <button
                    key={cmd.id}
                    className={`command-btn ${isCookDisabled ? 'disabled' : ''}`}
                    onClick={() => handleCampCommand(cmd.id)}
                    disabled={isCookDisabled}
                  >
                    {cmd.id === 'cook'
                      ? `りょうりする (${COOK_COST}G)`
                      : cmd.label}
                  </button>
                )
              })}
            </div>
          ) : mode === 'battle' ? (
            <div className="command-list">
              {battlePhase === 'win' ? (
                <button
                  className="command-btn selected"
                  onClick={handleBattleWin}
                >
                  すすむ
                </button>
              ) : battlePhase === 'lose' ? (
                <button
                  className="command-btn selected"
                  onClick={handleBattleLose}
                >
                  つづく...
                </button>
              ) : (
                BATTLE_COMMANDS.map((cmd) => {
                  const isBoss = enemy?.isBoss
                  const isRunDisabled = cmd.id === 'run' && isBoss
                  const isItemDisabled = cmd.id === 'item' && potions <= 0
                  const isDisabled =
                    battlePhase !== 'player' || isItemDisabled || isRunDisabled
                  return (
                    <button
                      key={cmd.id}
                      className={`command-btn ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => handleBattleCommand(cmd.id)}
                      disabled={isDisabled}
                    >
                      {cmd.id === 'item'
                        ? `アイテム (${potions})`
                        : cmd.label}
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <div className="command-list">
              {DUNGEON_COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  className={`command-btn ${cmd.id === 'build' && buildDisabled ? 'disabled' : ''}`}
                  onClick={() => handleDungeonCommand(cmd.id)}
                  disabled={cmd.id === 'build' && buildDisabled}
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
        <div className="panel-title">
          Message
          <button className="reset-btn" onClick={fullReset}>
            Reset
          </button>
        </div>
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
