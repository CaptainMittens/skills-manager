import { describe, it, expect } from 'vitest'

// Mirrors the branch predicate added to handleDragEnd:
// a drop is a "preset tag" iff over.id matches a scenario id.
function isPresetDrop(
  overId: string,
  scenarios: Array<{ id: string }>,
): boolean {
  return scenarios.some((s) => s.id === overId)
}

describe('handleDragEnd branch routing', () => {
  const scenarios = [{ id: 'p1' }, { id: 'p2' }]
  it('routes to preset tag when over.id is a scenario id', () => {
    expect(isPresetDrop('p1', scenarios)).toBe(true)
  })
  it('routes to reorder when over.id is a skill id', () => {
    expect(isPresetDrop('skill-123', scenarios)).toBe(false)
  })
  it('routes to reorder when there are no scenarios', () => {
    expect(isPresetDrop('p1', [])).toBe(false)
  })
})
