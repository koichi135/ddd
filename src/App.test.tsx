import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the game panels', () => {
    render(<App />)
    expect(screen.getByText('Dungeon')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('moves player with arrow keys', () => {
    render(<App />)
    // Player starts at (1,1). Press ArrowRight to move to (2,1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('ダンジョンを進んだ...')).toBeInTheDocument()
  })

  it('shows wall message when blocked by arrow key', () => {
    render(<App />)
    // Player starts at (1,1). Press ArrowUp to hit wall at (1,0)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText('壁があって進めない！')).toBeInTheDocument()
  })
})
