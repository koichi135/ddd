import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    /* Suppress random encounters by default */
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the game panels', () => {
    render(<App />)
    expect(screen.getByText('Dungeon')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('moves player forward with ArrowUp (facing south by default)', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText(/ダンジョンを進んだ/)).toBeInTheDocument()
  })

  it('shows wall message when moving into a wall', () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText('壁があって進めない！')).toBeInTheDocument()
  })

  it('triggers a battle encounter on movement', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) /* encounter check */
      .mockReturnValueOnce(0.0) /* spawnEnemy */

    render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Battle')).toBeInTheDocument()
    expect(screen.getByText('こうげき')).toBeInTheDocument()
    expect(screen.getByText('ぼうぎょ')).toBeInTheDocument()
    expect(screen.getByText('にげる')).toBeInTheDocument()
  })

  it('shows battle commands: attack, defend, item, run', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.0)

    render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('こうげき')).toBeInTheDocument()
    expect(screen.getByText('ぼうぎょ')).toBeInTheDocument()
    expect(screen.getByText(/アイテム/)).toBeInTheDocument()
    expect(screen.getByText('にげる')).toBeInTheDocument()
  })
})
