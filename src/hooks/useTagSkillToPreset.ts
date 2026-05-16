import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { addSkillToScenario } from '../lib/tauri'
import { getErrorMessage } from '../lib/error'
import { useApp } from '../context/AppContext'

export function useTagSkillToPreset() {
  const { t } = useTranslation()
  const { managedSkills, refreshManagedSkills } = useApp()

  return useCallback(
    async (skillId: string, presetId: string) => {
      const skill = managedSkills.find((s) => s.id === skillId)
      if (!skill) return
      if (skill.scenario_ids.includes(presetId)) {
        toast.info(t('presetActions.alreadyInPreset'))
        return
      }
      try {
        await addSkillToScenario(skill.id, presetId)
        toast.success(t('presetActions.addedToPresetToast'))
        await refreshManagedSkills()
      } catch (e) {
        toast.error(getErrorMessage(e, t('common.error')))
      }
    },
    [managedSkills, refreshManagedSkills, t],
  )
}
