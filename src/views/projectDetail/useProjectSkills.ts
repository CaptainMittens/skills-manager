import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import * as api from '../../lib/tauri'
import type {
  ProjectSkill,
  ManagedSkill,
  ProjectAgentTarget,
} from '../../lib/tauri'
import {
  PROJECT_DEFAULT_EXPORT_AGENTS_KEY,
  type ProjectSkillGroup,
  getDefaultExportAgents,
  getGroupStatus,
} from './projectSkillUtils'

export function useProjectSkills() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects } = useApp()

  const [skills, setSkills] = useState<ProjectSkill[]>([])
  const [projectAgentTargets, setProjectAgentTargets] = useState<
    ProjectAgentTarget[]
  >([])
  const [selectedExportAgents, setSelectedExportAgents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [detailSkill, setDetailSkill] = useState<ProjectSkillGroup | null>(null)
  const [docContent, setDocContent] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [centerDocContent, setCenterDocContent] = useState<string | null>(null)
  const [centerDocLoading, setCenterDocLoading] = useState(false)

  const project = projects.find((p) => p.id === id)

  const loadSkills = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await api.getProjectSkills(id)
      setSkills(result)
    } catch (e) {
      console.error('Failed to load project skills:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  useEffect(() => {
    let cancelled = false
    const loadProjectAgentTargets = async () => {
      if (!id) return
      try {
        const result = await api.getProjectAgentTargets(id)
        if (!cancelled) {
          setProjectAgentTargets(result)
        }
      } catch (e) {
        console.error('Failed to load project agent targets:', e)
      }
    }
    loadProjectAgentTargets()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!project && !loading) {
      navigate('/')
    }
  }, [project, loading, navigate])

  const groupedSkills = useMemo<ProjectSkillGroup[]>(() => {
    const groups = new Map<string, ProjectSkillGroup>()
    for (const skill of skills) {
      const key = skill.relative_path.toLowerCase()
      const existing = groups.get(key)
      if (existing) {
        existing.variants.push(skill)
        existing.enabledCount += skill.enabled ? 1 : 0
        existing.totalCount += 1
        existing.files = Array.from(
          new Set([...existing.files, ...skill.files]),
        ).sort()
        existing.tags = Array.from(
          new Set([...existing.tags, ...skill.tags]),
        ).sort((a, b) => a.localeCompare(b))
        if (
          skill.center_skill_id &&
          !existing.centerSkillIds.includes(skill.center_skill_id)
        ) {
          existing.centerSkillIds.push(skill.center_skill_id)
          existing.centerSkillIds.sort((a, b) => a.localeCompare(b))
        }
        if (!existing.description && skill.description) {
          existing.description = skill.description
        }
        continue
      }
      groups.set(key, {
        id: key,
        name: skill.name,
        dir_name: skill.dir_name,
        relative_path: skill.relative_path,
        description: skill.description,
        files: [...skill.files],
        variants: [skill],
        enabledCount: skill.enabled ? 1 : 0,
        totalCount: 1,
        primaryVariant: skill,
        status: skill.sync_status,
        tags: [...skill.tags].sort((a, b) => a.localeCompare(b)),
        centerSkillIds: skill.center_skill_id ? [skill.center_skill_id] : [],
      })
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        variants: [...group.variants].sort((a, b) =>
          a.agent_display_name.localeCompare(b.agent_display_name),
        ),
        primaryVariant: [...group.variants].sort((a, b) =>
          a.agent_display_name.localeCompare(b.agent_display_name),
        )[0],
        status: getGroupStatus(group.variants),
      }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  }, [skills])

  useEffect(() => {
    if (!detailSkill) return
    const refreshed =
      groupedSkills.find((skill) => skill.id === detailSkill.id) ?? null
    if (!refreshed) {
      setDetailSkill(null)
      setDocContent(null)
      return
    }
    if (refreshed !== detailSkill) {
      setDetailSkill(refreshed)
    }
  }, [detailSkill, groupedSkills])

  const exportTargets = useMemo(() => {
    if (projectAgentTargets.length > 0) return projectAgentTargets
    return [
      {
        key: 'claude_code',
        display_name: 'Claude Code',
        enabled: true,
        installed: true,
        is_custom: false,
      },
    ]
  }, [projectAgentTargets])

  const projectSkillDirNamesByAgent = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const skill of skills) {
      if (!map[skill.agent]) {
        map[skill.agent] = []
      }
      map[skill.agent].push(skill.relative_path.toLowerCase())
    }
    return map
  }, [skills])

  const projectCenterSkillIdsByAgent = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const skill of skills) {
      if (!skill.center_skill_id) continue
      if (!map[skill.agent]) {
        map[skill.agent] = []
      }
      map[skill.agent].push(skill.center_skill_id)
    }
    return map
  }, [skills])

  const projectPresetVariants = useMemo(() => {
    const map = new Map<string, ProjectSkill>()
    for (const skill of skills) {
      if (!skill.center_skill_id) continue
      map.set(`${skill.center_skill_id}::${skill.agent}`, skill)
    }
    return map
  }, [skills])

  const findProjectPresetVariant = useCallback(
    (skill: ManagedSkill, agentKey: string) =>
      projectPresetVariants.get(`${skill.id}::${agentKey}`) ?? null,
    [projectPresetVariants],
  )

  useEffect(() => {
    let cancelled = false
    const loadDefaultExportAgents = async () => {
      const savedValue = await api
        .getSettings(PROJECT_DEFAULT_EXPORT_AGENTS_KEY)
        .catch(() => null)
      if (cancelled) return
      setSelectedExportAgents(getDefaultExportAgents(exportTargets, savedValue))
    }
    loadDefaultExportAgents()
    return () => {
      cancelled = true
    }
  }, [exportTargets])

  const handleOpenDetail = async (skill: ProjectSkillGroup) => {
    setDetailSkill(skill)
    setDocContent(null)
    setDocLoading(true)
    setCenterDocContent(null)
    setCenterDocLoading(false)
    if (!project || !id) return

    const centerSkillId =
      skill.centerSkillIds.length > 0 ? skill.centerSkillIds[0] : null

    if (centerSkillId) {
      setCenterDocLoading(true)
      api
        .getSkillDocument(centerSkillId)
        .then((doc) => setCenterDocContent(doc.content))
        .catch(() => setCenterDocContent(null))
        .finally(() => setCenterDocLoading(false))
    }

    try {
      const doc = await api.getProjectSkillDocument(
        id,
        skill.primaryVariant.relative_path,
        skill.primaryVariant.agent,
      )
      setDocContent(doc.content)
    } catch {
      setDocContent(null)
    } finally {
      setDocLoading(false)
    }
  }

  return {
    id,
    loading,
    project,
    selectedExportAgents,
    setSelectedExportAgents,
    groupedSkills,
    exportTargets,
    projectSkillDirNamesByAgent,
    projectCenterSkillIdsByAgent,
    findProjectPresetVariant,
    detailSkill,
    setDetailSkill,
    docContent,
    docLoading,
    centerDocContent,
    centerDocLoading,
    loadSkills,
    handleOpenDetail,
  }
}
