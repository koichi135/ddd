import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'

/* Fully mock GameDatabase to avoid WASM/sql.js in jsdom */
vi.mock('./db/database', () => {
  class MockGameDatabase {
    private saves = new Map<
      number,
      {
        name: string
        level: number
        exp: number
        hp: number
        gold: number
        steps: number
        potions: number
        floor: number
        player_x: number
        player_y: number
        player_dir: string
        boss_defeated: boolean
        built_bases: string[]
        last_rested_base: { x: number; y: number; floor: number } | null
        settings: { key: string; value: string | null }[]
      }
    >()

    static async open() {
      return new MockGameDatabase()
    }

    static openWith() {
      return new MockGameDatabase()
    }

    persist() {}
    close() {}

    createSave(slot: number) {
      if (!this.saves.has(slot)) {
        this.saves.set(slot, {
          name: '冒険者',
          level: 1,
          exp: 0,
          hp: 100,
          gold: 0,
          steps: 0,
          potions: 3,
          floor: 0,
          player_x: 1,
          player_y: 1,
          player_dir: 'N',
          boss_defeated: false,
          built_bases: [],
          last_rested_base: null,
          settings: [],
        })
      }
      return slot
    }

    deleteSave(slot: number) {
      this.saves.delete(slot)
    }

    listSaves() {
      return Array.from(this.saves.entries()).map(([slot, s]) => ({
        slot,
        name: s.name,
        level: s.level,
        updatedAt: new Date().toISOString(),
      }))
    }

    getPlayer(slot: number) {
      const s = this.saves.get(slot)
      if (!s) return null
      return {
        name: s.name,
        level: s.level,
        exp: s.exp,
        hp: s.hp,
        gold: s.gold,
        steps: s.steps,
      }
    }

    updatePlayer(
      slot: number,
      data: Partial<{
        name: string
        level: number
        exp: number
        hp: number
        gold: number
        steps: number
      }>,
    ) {
      const s = this.saves.get(slot)
      if (!s) return
      Object.assign(s, data)
    }

    getItems(slot: number) {
      const s = this.saves.get(slot)
      if (!s) return []
      return [{ item_type: 'potion', quantity: s.potions }]
    }

    setItem(slot: number, itemType: string, quantity: number) {
      const s = this.saves.get(slot)
      if (!s) return
      if (itemType === 'potion') s.potions = quantity
    }

    getProgress(slot: number) {
      const s = this.saves.get(slot)
      if (!s) return null
      return {
        floor: s.floor,
        player_x: s.player_x,
        player_y: s.player_y,
        player_dir: s.player_dir,
        boss_defeated: s.boss_defeated,
        built_bases: s.built_bases,
        last_rested_base: s.last_rested_base,
      }
    }

    updateProgress(slot: number, data: Record<string, unknown>) {
      const s = this.saves.get(slot)
      if (!s) return
      Object.assign(s, data)
    }

    getSettings(slot: number) {
      return this.saves.get(slot)?.settings ?? []
    }

    getSetting() {
      return null
    }

    setSetting() {}
    deleteSetting() {}

    loadFull(slot: number) {
      const s = this.saves.get(slot)
      if (!s) return null
      return {
        slot,
        player: {
          name: s.name,
          level: s.level,
          exp: s.exp,
          hp: s.hp,
          gold: s.gold,
          steps: s.steps,
        },
        items: [{ item_type: 'potion', quantity: s.potions }],
        progress: {
          floor: s.floor,
          player_x: s.player_x,
          player_y: s.player_y,
          player_dir: s.player_dir,
          boss_defeated: s.boss_defeated,
          built_bases: s.built_bases,
          last_rested_base: s.last_rested_base,
        },
        settings: s.settings,
        updatedAt: new Date().toISOString(),
      }
    }

    saveFull(
      slot: number,
      data: {
        player: Record<string, unknown>
        items: { item_type: string; quantity: number }[]
        progress: Record<string, unknown>
        settings: { key: string; value: string | null }[]
      },
    ) {
      this.createSave(slot)
      const s = this.saves.get(slot)!
      Object.assign(s, data.player, data.progress)
      const potion = data.items.find(
        (i: { item_type: string }) => i.item_type === 'potion',
      )
      if (potion) s.potions = potion.quantity
      s.settings = data.settings
    }
  }

  return { GameDatabase: MockGameDatabase }
})

/**
 * Helper: render App, wait for DB init, then start a new game
 * so tests can exercise dungeon / battle screens.
 */
async function renderAndStartGame() {
  render(<App />)

  // Wait for DB to initialise – title screen shows save slots
  await waitFor(() =>
    expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument(),
  )

  // Click "はじめから" on slot 1
  const newGameBtns = screen.getAllByText('はじめから')
  fireEvent.click(newGameBtns[0])

  // Should show name input screen
  expect(screen.getByPlaceholderText('冒険者')).toBeInTheDocument()

  // Submit with default name
  fireEvent.click(screen.getByText('冒険に出る'))

  // Now we should be in the dungeon
  await waitFor(() =>
    expect(screen.getByText('Dungeon B1F')).toBeInTheDocument(),
  )
}

describe('Title Screen', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the title screen on startup', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument(),
    )
    expect(screen.getByText(/地下迷宮の冒険者/)).toBeInTheDocument()
  })

  it('shows save slots with はじめから buttons', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getAllByText('はじめから').length).toBeGreaterThanOrEqual(1),
    )
  })

  it('navigates to name input when はじめから is clicked', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getAllByText('はじめから').length).toBeGreaterThanOrEqual(1),
    )
    fireEvent.click(screen.getAllByText('はじめから')[0])
    expect(
      screen.getByText('冒険者の名前を入力してください'),
    ).toBeInTheDocument()
  })

  it('can go back from name input to title', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getAllByText('はじめから').length).toBeGreaterThanOrEqual(1),
    )
    fireEvent.click(screen.getAllByText('はじめから')[0])
    fireEvent.click(screen.getByText('もどる'))
    expect(screen.getByText('Dungeon Crawler')).toBeInTheDocument()
  })
})

describe('Name Input', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts the game with a custom name', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getAllByText('はじめから').length).toBeGreaterThanOrEqual(1),
    )
    fireEvent.click(screen.getAllByText('はじめから')[0])

    const input = screen.getByPlaceholderText('冒険者')
    fireEvent.change(input, { target: { value: 'テスト勇者' } })
    fireEvent.click(screen.getByText('冒険に出る'))

    await waitFor(() =>
      expect(screen.getByText('Dungeon B1F')).toBeInTheDocument(),
    )
    expect(
      screen.getByText(/テスト勇者はダンジョンに足を踏み入れた/),
    ).toBeInTheDocument()
  })

  it('uses default name when empty', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getAllByText('はじめから').length).toBeGreaterThanOrEqual(1),
    )
    fireEvent.click(screen.getAllByText('はじめから')[0])
    fireEvent.click(screen.getByText('冒険に出る'))

    await waitFor(() =>
      expect(screen.getByText('Dungeon B1F')).toBeInTheDocument(),
    )
    expect(
      screen.getByText(/冒険者はダンジョンに足を踏み入れた/),
    ).toBeInTheDocument()
  })
})

describe('Game (after starting)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the game panels', async () => {
    await renderAndStartGame()
    expect(screen.getByText('Dungeon B1F')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('moves player forward with ArrowUp (facing south by default)', async () => {
    await renderAndStartGame()
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText(/ダンジョンを進んだ/)).toBeInTheDocument()
  })

  it('shows wall message when moving into a wall', async () => {
    await renderAndStartGame()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText('壁があって進めない！')).toBeInTheDocument()
  })

  it('triggers a battle encounter on movement', async () => {
    await renderAndStartGame()

    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) /* encounter check */
      .mockReturnValueOnce(0.0) /* spawnEnemy */

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Battle')).toBeInTheDocument()
    expect(screen.getByText('こうげき')).toBeInTheDocument()
    expect(screen.getByText('ぼうぎょ')).toBeInTheDocument()
    expect(screen.getByText('にげる')).toBeInTheDocument()
  })

  it('displays player level in status bar', async () => {
    await renderAndStartGame()
    expect(screen.getByText(/Lv\.1/)).toBeInTheDocument()
  })

  it('displays gold counter', async () => {
    await renderAndStartGame()
    expect(screen.getByText('0G')).toBeInTheDocument()
  })
})
