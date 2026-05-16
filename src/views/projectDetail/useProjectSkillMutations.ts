import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useApp } from '../../context/AppContext'
import * as api from '../../lib/tauri'
import type { ManagedSkill, ProjectAgentTarget } from '../../lib/tauri'
import { getErrorMessage } from '../../lib/error'
import type { ProjectSkillGroup } from './projectSkillUtils'
import type { ProjectSkill } from '../../lib/tauri'

interface UseProjectSkillMutationsParams {
  id: string | undefined
  // from useProjectSkills hook
  loadSkills: () => Promise<void>
  exportTargets: ProjectAgentTarget[]
  findProjectPresetVariant: (
    skill: ManagedSkill,
    agentKey: string,
  ) => ProjectSkill | null
  setDetailSkill: Dispatch<SetStateAction<ProjectSkillGroup | null>>
  selectedExportAgents: string[]
  // from ProjectDetail UI state
  getSkillKey: (skill: Pick<ProjectSkillGroup, 'id'>) => string
  selectedSkills: ProjectSkillGroup[]
  selectedTaggableSkills: ProjectSkillGroup[]
  anyDisabled: boolean
  deleteTarget: ProjectSkillGroup | null
  setShowExportDialog: Dispatch<SetStateAction<boolean>>
  setBatchDeleteConfirm: Dispatch<SetStateAction<boolean>>
  exitMultiSelect: () => void
}

export function useProjectSkillMutations({
  id,
  loadSkills,
  exportTargets,
  findProjectPresetVariant,
  selectedExportAgents,
  getSkillKey,
  selectedSkills,
  selectedTaggableSkills,
  anyDisabled,
  deleteTarget,
  setShowExportDialog,
  setBatchDeleteConfirm,
  exitMultiSelect,
}: UseProjectSkillMutationsParams) {
  const { t } = useTranslation()
  const {
    managedSkills,
    refreshManagedSkills,
    refreshScenarios,
    refreshProjects,
  } = useApp()

  const [updatingCenterSkill, setUpdatingCenterSkill] = useState<string | null>(
    null,
  )
  const [updatingProjectSkill, setUpdatingProjectSkill] = useState<
    string | null
  >(null)
  const [batchUpdatingCenter, setBatchUpdatingCenter] = useState(false)
  const [batchUpdatingProject, setBatchUpdatingProject] = useState(false)
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null)
  const [togglingAgentTarget, setTogglingAgentTarget] = useState<{
    skillKey: string
    agent: string
  } | null>(null)

  const handleUpdateCenter = async (skill: ProjectSkillGroup) => {
    if (!id) return
    setUpdatingCenterSkill(getSkillKey(skill))
    try {
      await api.updateProjectSkillToCenter(
        id,
        skill.primaryVariant.relative_path,
        skill.primaryVariant.agent,
      )
      toast.success(t('project.updateCenterSuccess', { name: skill.name }))
      await Promise.all([
        refreshManagedSkills(),
        refreshScenarios(),
        loadSkills(),
      ])
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    } finally {
      setUpdatingCenterSkill(null)
    }
  }

  const handleUpdateProject = async (skill: ProjectSkillGroup) => {
    if (!id) return
    setUpdatingProjectSkill(getSkillKey(skill))
    try {
      await Promise.all(
        skill.variants.map((variant) =>
          api.updateProjectSkillFromCenter(
            id,
            variant.relative_path,
            variant.agent,
          ),
        ),
      )
      if (skill.status === 'project_newer') {
        toast.success(t('project.resetFromCenterSuccess', { name: skill.name }))
      } else {
        toast.success(t('project.updateProjectSuccess', { name: skill.name }))
      }
      await Promise.all([loadSkills(), refreshProjects()])
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    } finally {
      setUpdatingProjectSkill(null)
    }
  }

  const handleToggleSkill = async (skill: ProjectSkillGroup) => {
    if (!id) return
    setTogglingSkill(getSkillKey(skill))
    try {
      const nextEnabled = skill.enabledCount !== skill.totalCount
      await Promise.all(
        skill.variants.map((variant) =>
          api.toggleProjectSkill(
            id,
            variant.relative_path,
            variant.agent,
            nextEnabled,
          ),
        ),
      )
      if (skill.enabledCount === skill.totalCount) {
        toast.success(t('project.skillDisabled', { name: skill.name }))
      } else {
        toast.success(t('project.skillEnabled', { name: skill.name }))
      }
      await loadSkills()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    } finally {
      setTogglingSkill(null)
    }
  }

  const handleToggleDetailAgent = async (
    skill: ProjectSkillGroup,
    agentKey: string,
    enabled: boolean,
  ) => {
    if (!id) return
    if (togglingAgentTarget) return
    const target = exportTargets.find((item) => item.key === agentKey)
    const displayName = target?.display_name ?? agentKey
    const existingVariant = skill.variants.find(
      (variant) => variant.agent === agentKey,
    )

    setTogglingAgentTarget({ skillKey: getSkillKey(skill), agent: agentKey })
    try {
      if (enabled) {
        const centerSkillId = skill.centerSkillIds[0]
        if (!centerSkillId) {
          toast.error(
            t('project.agentAddRequiresCenter', { agent: displayName }),
          )
          return
        }
        await api.exportSkillToProject(centerSkillId, id, [agentKey])
        toast.success(
          t('project.agentAdded', { agent: displayName, name: skill.name }),
        )
      } else {
        if (!existingVariant) return
        await api.deleteProjectSkill(
          id,
          existingVariant.relative_path,
          agentKey,
        )
        toast.success(
          t('project.agentRemoved', { agent: displayName, name: skill.name }),
        )
      }
      await Promise.all([loadSkills(), refreshProjects()])
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    } finally {
      setTogglingAgentTarget(null)
    }
  }

  const handleExportFromCenter = async (managedSkill: ManagedSkill) => {
    if (!id) return
    if (selectedExportAgents.length === 0) {
      toast.error(t('project.selectTargetAgents'))
      return
    }
    try {
      await api.exportSkillToProject(managedSkill.id, id, selectedExportAgents)
      toast.success(
        t('project.importFromCenterSuccess', {
          name: managedSkill.name,
          count: selectedExportAgents.length,
        }),
      )
      setShowExportDialog(false)
      await Promise.all([loadSkills(), refreshProjects()])
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    }
  }

  const handleBatchExportFromCenter = async (skills: ManagedSkill[]) => {
    if (!id) return
    if (selectedExportAgents.length === 0) {
      toast.error(t('project.selectTargetAgents'))
      return
    }
    let imported = 0
    let failed = 0
    for (const skill of skills) {
      try {
        await api.exportSkillToProject(skill.id, id, selectedExportAgents)
        imported++
      } catch {
        failed++
        // continue with remaining
      }
    }
    if (imported > 0) {
      toast.success(t('project.batchImported', { count: imported }))
    }
    if (failed > 0) {
      toast.error(t('project.batchImportFailed', { count: failed }))
    }
    if (imported > 0) {
      setShowExportDialog(false)
    }
    await Promise.all([loadSkills(), refreshProjects()])
  }

  const handleDeleteSkill = async () => {
    if (!id || !deleteTarget) return
    try {
      await Promise.all(
        deleteTarget.variants.map((variant) =>
          api.deleteProjectSkill(id, variant.relative_path, variant.agent),
        ),
      )
      toast.success(t('project.skillDeleted', { name: deleteTarget.name }))
      await Promise.all([loadSkills(), refreshProjects()])
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('common.error')))
    }
  }

  const handleBatchDeleteProject = async () => {
    if (!id) return
    let deleted = 0
    let failed = 0
    for (const skill of selectedSkills) {
      try {
        await Promise.all(
          skill.variants.map((variant) =>
            api.deleteProjectSkill(id, variant.relative_path, variant.agent),
          ),
        )
        deleted++
      } catch {
        failed++
        // continue deleting remaining
      }
    }
    if (deleted > 0) {
      toast.success(t('project.batchDeleted', { count: deleted }))
    }
    if (failed > 0) {
      toast.error(t('project.batchDeleteFailed', { count: failed }))
    }
    exitMultiSelect()
    setBatchDeleteConfirm(false)
    await Promise.all([loadSkills(), refreshProjects()])
  }

  const handleBatchToggleProject = async () => {
    if (!id) return
    const enabling = anyDisabled
    let count = 0
    let failed = 0
    for (const skill of selectedSkills) {
      try {
        if (enabling && skill.enabledCount !== skill.totalCount) {
          await Promise.all(
            skill.variants.map((variant) =>
              api.toggleProjectSkill(
                id,
                variant.relative_path,
                variant.agent,
                true,
              ),
            ),
          )
          count++
        } else if (!enabling && skill.enabledCount > 0) {
          await Promise.all(
            skill.variants.map((variant) =>
              api.toggleProjectSkill(
                id,
                variant.relative_path,
                variant.agent,
                false,
              ),
            ),
          )
          count++
        }
      } catch {
        failed++
        // continue with remaining
      }
    }
    if (count > 0) {
      toast.success(
        enabling
          ? t('project.batchEnabled', { count })
          : t('project.batchDisabled', { count }),
      )
    }
    if (failed > 0) {
      toast.error(t('project.batchToggleFailed', { count: failed }))
    }
    await loadSkills()
  }

  const handleBatchUpdateCenter = async () => {
    if (!id) return
    setBatchUpdatingCenter(true)
    try {
      let updated = 0
      let failed = 0
      for (const skill of selectedSkills) {
        const canUpdateCenter =
          skill.status === 'project_only' ||
          skill.status === 'project_newer' ||
          skill.status === 'diverged'
        if (!canUpdateCenter) continue
        try {
          await api.updateProjectSkillToCenter(
            id,
            skill.primaryVariant.relative_path,
            skill.primaryVariant.agent,
          )
          updated++
        } catch {
          failed++
        }
      }
      if (updated > 0) {
        toast.success(t('project.batchUpdatedCenter', { count: updated }))
      }
      if (failed > 0) {
        toast.error(t('project.batchUpdateCenterFailed', { count: failed }))
      }
      await Promise.all([
        refreshManagedSkills(),
        refreshScenarios(),
        loadSkills(),
      ])
    } finally {
      setBatchUpdatingCenter(false)
    }
  }

  const handleBatchUpdateProject = async () => {
    if (!id) return
    setBatchUpdatingProject(true)
    try {
      let updated = 0
      let failed = 0
      for (const skill of selectedSkills) {
        const canUpdateProject =
          skill.status === 'project_newer' ||
          skill.status === 'center_newer' ||
          skill.status === 'diverged'
        if (!canUpdateProject) continue
        try {
          await Promise.all(
            skill.variants.map((variant) =>
              api.updateProjectSkillFromCenter(
                id,
                variant.relative_path,
                variant.agent,
              ),
            ),
          )
          updated++
        } catch {
          failed++
        }
      }
      if (updated > 0) {
        toast.success(t('project.batchUpdatedProject', { count: updated }))
      }
      if (failed > 0) {
        toast.error(t('project.batchUpdateProjectFailed', { count: failed }))
      }
      await Promise.all([loadSkills(), refreshProjects()])
    } finally {
      setBatchUpdatingProject(false)
    }
  }

  const handleBatchEditTags = async (adds: string[], removes: string[]) => {
    const skillMap = new Map(managedSkills.map((skill) => [skill.id, skill]))
    const centerIds = Array.from(
      new Set(selectedTaggableSkills.flatMap((skill) => skill.centerSkillIds)),
    )
    let updated = 0
    let failed = 0

    for (const centerSkillId of centerIds) {
      const centerSkill = skillMap.get(centerSkillId)
      if (!centerSkill) continue
      const removeSet = new Set(removes)
      const nextTags = centerSkill.tags.filter((tag) => !removeSet.has(tag))
      for (const tag of adds) {
        if (!nextTags.includes(tag)) nextTags.push(tag)
      }
      const changed =
        nextTags.length !== centerSkill.tags.length ||
        nextTags.some((tag, index) => tag !== centerSkill.tags[index])
      if (!changed) continue

      try {
        await api.setSkillTags(centerSkillId, nextTags)
        updated++
      } catch {
        failed++
      }
    }

    if (updated > 0) {
      toast.success(t('project.batchTagsUpdated', { count: updated }))
    }
    if (failed > 0) {
      toast.error(t('project.batchTagsFailed', { count: failed }))
    }
    await Promise.all([refreshManagedSkills(), loadSkills()])
  }

  const presetSkillExistsInProject = useCallback(
    (skill: ManagedSkill, agentKey: string) => {
      return findProjectPresetVariant(skill, agentKey) !== null
    },
    [findProjectPresetVariant],
  )

  const handleAddPresetSkillToProject = useCallback(
    async (skill: ManagedSkill, agentKey: string) => {
      if (!id) return
      await api.exportSkillToProject(skill.id, id, [agentKey])
    },
    [id],
  )

  const handleRemovePresetSkillFromProject = useCallback(
    async (skill: ManagedSkill, agentKey: string) => {
      if (!id) return
      const projectVariant = findProjectPresetVariant(skill, agentKey)
      if (!projectVariant) throw new Error(t('project.skillDirectoryNotFound'))
      await api.deleteProjectSkill(id, projectVariant.relative_path, agentKey)
    },
    [findProjectPresetVariant, id, t],
  )

  const handlePresetActionComplete = useCallback(async () => {
    await Promise.all([loadSkills(), refreshProjects()])
  }, [loadSkills, refreshProjects])

  return {
    updatingCenterSkill,
    updatingProjectSkill,
    batchUpdatingCenter,
    batchUpdatingProject,
    togglingSkill,
    togglingAgentTarget,
    handleUpdateCenter,
    handleUpdateProject,
    handleToggleSkill,
    handleToggleDetailAgent,
    handleExportFromCenter,
    handleBatchExportFromCenter,
    handleDeleteSkill,
    handleBatchDeleteProject,
    handleBatchToggleProject,
    handleBatchUpdateCenter,
    handleBatchUpdateProject,
    handleBatchEditTags,
    presetSkillExistsInProject,
    handleAddPresetSkillToProject,
    handleRemovePresetSkillFromProject,
    handlePresetActionComplete,
  }
}
