import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const addSkillToScenario = vi.fn()
const refreshManagedSkills = vi.fn().mockResolvedValue(undefined)
const toastInfo = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()
let managedSkills: Array<{ id: string; scenario_ids: string[] }>

vi.mock('../lib/tauri', () => ({
  addSkillToScenario: (...a: unknown[]) => addSkillToScenario(...a),
}))
vi.mock('../context/AppContext', () => ({
  useApp: () => ({ managedSkills, refreshManagedSkills }),
}))
vi.mock('sonner', () => ({
  toast: {
    info: (...a: unknown[]) => toastInfo(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

import { useTagSkillToPreset } from '../hooks/useTagSkillToPreset'

beforeEach(() => {
  vi.clearAllMocks()
  managedSkills = [{ id: 's1', scenario_ids: [] }]
})

describe('useTagSkillToPreset', () => {
  it('tags a skill and refreshes on success', async () => {
    addSkillToScenario.mockResolvedValue(undefined)
    const { result } = renderHook(() => useTagSkillToPreset())
    await act(async () => {
      await result.current('s1', 'p1')
    })
    expect(addSkillToScenario).toHaveBeenCalledWith('s1', 'p1')
    expect(toastSuccess).toHaveBeenCalledWith(
      'presetActions.addedToPresetToast',
    )
    expect(refreshManagedSkills).toHaveBeenCalledOnce()
  })

  it('short-circuits when already a member (no API call)', async () => {
    managedSkills = [{ id: 's1', scenario_ids: ['p1'] }]
    const { result } = renderHook(() => useTagSkillToPreset())
    await act(async () => {
      await result.current('s1', 'p1')
    })
    expect(addSkillToScenario).not.toHaveBeenCalled()
    expect(toastInfo).toHaveBeenCalledWith('presetActions.alreadyInPreset')
    expect(refreshManagedSkills).not.toHaveBeenCalled()
  })

  it('silently returns when skill id is unknown', async () => {
    const { result } = renderHook(() => useTagSkillToPreset())
    await act(async () => {
      await result.current('missing', 'p1')
    })
    expect(addSkillToScenario).not.toHaveBeenCalled()
    expect(toastInfo).not.toHaveBeenCalled()
  })

  it('shows error toast and skips refresh when the API throws', async () => {
    addSkillToScenario.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useTagSkillToPreset())
    await act(async () => {
      await result.current('s1', 'p1')
    })
    expect(toastError).toHaveBeenCalled()
    expect(refreshManagedSkills).not.toHaveBeenCalled()
  })
})
