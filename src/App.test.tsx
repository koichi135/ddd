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

  it('moves player forward with ArrowUp (facing south by default)', () => {
    render(<App />)
    // Player starts at (1,1) facing South. ArrowUp = move forward = move to (1,2)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByText(/ダンジョンを進んだ/)).toBeInTheDocument()
  })

  it('shows wall message when moving into a wall', () => {
    render(<App />)
    // Player starts at (1,1) facing South.
    // Turn left (now facing East), then move backward = move West to (0,1) = wall
    fireEvent.keyDown(window, { key: 'ArrowRight' }) // turn right → facing West
    fireEvent.keyDown(window, { key: 'ArrowUp' }) // move forward West → (0,1) = wall
    expect(screen.getByText('壁があって進めない！')).toBeInTheDocument()
  })
})
