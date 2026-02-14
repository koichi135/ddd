import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the game panels', () => {
    render(<App />)
    expect(screen.getByText('Dungeon')).toBeInTheDocument()
    expect(screen.getByText('Command')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })
})
