import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { PresetDropChips } from '../components/PresetDropChips'

const wrap = (ui: React.ReactNode) => <DndContext>{ui}</DndContext>

describe('PresetDropChips', () => {
  it('renders one chip per scenario', () => {
    render(
      wrap(
        <PresetDropChips
          scenarios={[
            { id: 'p1', name: 'Alpha' },
            { id: 'p2', name: 'Beta' },
          ]}
        />,
      ),
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('renders nothing when scenarios is empty', () => {
    const { container } = render(<PresetDropChips scenarios={[]} />)
    expect(container.textContent).toBe('')
  })
})
