import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import { GameDatabase } from './database'
import type { PlayerRow, GameProgressRow } from './database'

let db: GameDatabase

beforeEach(async () => {
  const SQL = await initSqlJs()
  db = GameDatabase.openWith(new SQL.Database())
})

describe('Save slot management', () => {
  it('creates a save slot and returns an id', () => {
    const id = db.createSave(1)
    expect(id).toBeGreaterThan(0)
  })

  it('lists save slots', () => {
    db.createSave(1)
    db.createSave(2)
    const saves = db.listSaves()
    expect(saves).toHaveLength(2)
    expect(saves[0].slot).toBe(1)
    expect(saves[1].slot).toBe(2)
  })

  it('deletes a save and cascades related data', () => {
    db.createSave(1)
    db.updatePlayer(1, { name: 'テスト勇者', level: 5 })
    db.setItem(1, 'potion', 3)
    db.setSetting(1, 'bgm_volume', '80')

    db.deleteSave(1)

    expect(db.getPlayer(1)).toBeNull()
    expect(db.getItems(1)).toEqual([])
    expect(db.getProgress(1)).toBeNull()
    expect(db.getSettings(1)).toEqual([])
  })
})

describe('Player CRUD', () => {
  beforeEach(() => {
    db.createSave(1)
  })

  it('returns default player for a new save', () => {
    const player = db.getPlayer(1)
    expect(player).toEqual<PlayerRow>({
      name: '冒険者',
      level: 1,
      exp: 0,
      hp: 100,
      gold: 0,
      steps: 0,
    })
  })

  it('updates player fields partially', () => {
    db.updatePlayer(1, { level: 5, gold: 200 })
    const player = db.getPlayer(1)!
    expect(player.level).toBe(5)
    expect(player.gold).toBe(200)
    expect(player.name).toBe('冒険者') // unchanged
  })
})

describe('Items CRUD', () => {
  beforeEach(() => {
    db.createSave(1)
  })

  it('has default potions after createSave', () => {
    const items = db.getItems(1)
    expect(items).toContainEqual({ item_type: 'potion', quantity: 3 })
  })

  it('upserts item quantity', () => {
    db.setItem(1, 'potion', 1)
    db.setItem(1, 'key', 2)
    const items = db.getItems(1)
    expect(items).toContainEqual({ item_type: 'potion', quantity: 1 })
    expect(items).toContainEqual({ item_type: 'key', quantity: 2 })
  })
})

describe('Game progress CRUD', () => {
  beforeEach(() => {
    db.createSave(1)
  })

  it('returns default progress for a new save', () => {
    const progress = db.getProgress(1)!
    expect(progress.floor).toBe(0)
    expect(progress.player_dir).toBe('N')
    expect(progress.boss_defeated).toBe(false)
    expect(progress.built_bases).toEqual([])
    expect(progress.last_rested_base).toBeNull()
  })

  it('updates progress partially', () => {
    db.updateProgress(1, {
      floor: 3,
      player_x: 5,
      player_y: 7,
      player_dir: 'E',
      boss_defeated: true,
      built_bases: ['0:3,4', '1:2,5'],
      last_rested_base: { x: 3, y: 4, floor: 0 },
    })
    const p = db.getProgress(1)!
    expect(p).toEqual<GameProgressRow>({
      floor: 3,
      player_x: 5,
      player_y: 7,
      player_dir: 'E',
      boss_defeated: true,
      built_bases: ['0:3,4', '1:2,5'],
      opened_chests: [],
      last_rested_base: { x: 3, y: 4, floor: 0 },
    })
  })

  it('can set last_rested_base back to null', () => {
    db.updateProgress(1, {
      last_rested_base: { x: 1, y: 2, floor: 0 },
    })
    expect(db.getProgress(1)!.last_rested_base).not.toBeNull()

    db.updateProgress(1, { last_rested_base: null })
    expect(db.getProgress(1)!.last_rested_base).toBeNull()
  })
})

describe('Settings CRUD', () => {
  beforeEach(() => {
    db.createSave(1)
  })

  it('returns null for unset key', () => {
    expect(db.getSetting(1, 'bgm_volume')).toBeNull()
  })

  it('sets and gets a setting', () => {
    db.setSetting(1, 'bgm_volume', '80')
    expect(db.getSetting(1, 'bgm_volume')).toBe('80')
  })

  it('overwrites existing setting', () => {
    db.setSetting(1, 'bgm_volume', '80')
    db.setSetting(1, 'bgm_volume', '50')
    expect(db.getSetting(1, 'bgm_volume')).toBe('50')
  })

  it('deletes a setting', () => {
    db.setSetting(1, 'bgm_volume', '80')
    db.deleteSetting(1, 'bgm_volume')
    expect(db.getSetting(1, 'bgm_volume')).toBeNull()
  })

  it('lists all settings', () => {
    db.setSetting(1, 'bgm_volume', '80')
    db.setSetting(1, 'se_volume', '100')
    const settings = db.getSettings(1)
    expect(settings).toHaveLength(2)
  })
})

describe('Full save / load', () => {
  it('round-trips full save data', () => {
    db.saveFull(1, {
      player: { name: 'テスト勇者', level: 10, exp: 300, hp: 190, gold: 500, steps: 1234 },
      items: [
        { item_type: 'potion', quantity: 2 },
        { item_type: 'key', quantity: 1 },
      ],
      progress: {
        floor: 4,
        player_x: 5,
        player_y: 3,
        player_dir: 'S',
        boss_defeated: false,
        built_bases: ['0:3,4'],
        opened_chests: ['0:8,1'],
        last_rested_base: { x: 3, y: 4, floor: 0 },
      },
      settings: [
        { key: 'bgm_volume', value: '70' },
        { key: 'se_volume', value: '100' },
      ],
    })

    const loaded = db.loadFull(1)!
    expect(loaded.slot).toBe(1)
    expect(loaded.player.name).toBe('テスト勇者')
    expect(loaded.player.level).toBe(10)
    expect(loaded.items).toContainEqual({ item_type: 'potion', quantity: 2 })
    expect(loaded.items).toContainEqual({ item_type: 'key', quantity: 1 })
    expect(loaded.progress.floor).toBe(4)
    expect(loaded.progress.boss_defeated).toBe(false)
    expect(loaded.progress.opened_chests).toEqual(['0:8,1'])
    expect(loaded.progress.last_rested_base).toEqual({ x: 3, y: 4, floor: 0 })
    expect(loaded.settings).toHaveLength(2)
  })

  it('returns null for non-existent slot', () => {
    expect(db.loadFull(1)).toBeNull()
  })
})
