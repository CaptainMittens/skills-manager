import type { ProjectSkill, ProjectAgentTarget } from '../../lib/tauri'

export const PROJECT_DEFAULT_EXPORT_AGENTS_KEY = 'project_default_export_agents'
export const PROJECT_EXPORT_AGENT_PRIORITY = [
  'claude_code',
  'codex',
  'cursor',
  'gemini_cli',
  'github_copilot',
]

export interface ProjectSkillGroup {
  id: string
  name: string
  dir_name: string
  relative_path: string
  description: string | null
  files: string[]
  variants: ProjectSkill[]
  enabledCount: number
  totalCount: number
  primaryVariant: ProjectSkill
  status: ProjectSkill['sync_status']
  tags: string[]
  centerSkillIds: string[]
}

export function getDefaultExportAgents(
  targets: ProjectAgentTarget[],
  savedValue?: string | null,
) {
  const availableKeys = new Set(targets.map((target) => target.key))
  if (savedValue) {
    try {
      const parsed = JSON.parse(savedValue)
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (item): item is string =>
            typeof item === 'string' && availableKeys.has(item),
        )
        if (filtered.length > 0) {
          return Array.from(new Set(filtered))
        }
      }
    } catch {
      // Ignore invalid persisted settings and fall back to built-in defaults.
    }
  }

  const prioritized = PROJECT_EXPORT_AGENT_PRIORITY.filter((key) =>
    availableKeys.has(key),
  )
  const fallback = targets.map((target) => target.key)
  return Array.from(
    new Set((prioritized.length > 0 ? prioritized : fallback).slice(0, 3)),
  )
}

export function getSyncStatusMeta(
  t: (key: string) => string,
  status: ProjectSkill['sync_status'],
) {
  switch (status) {
    case 'in_sync':
      return {
        label: t('project.syncStatus.inSync'),
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      }
    case 'project_newer':
      return {
        label: t('project.syncStatus.projectNewer'),
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      }
    case 'center_newer':
      return {
        label: t('project.syncStatus.centerNewer'),
        className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
      }
    case 'diverged':
      return {
        label: t('project.syncStatus.diverged'),
        className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
      }
    default:
      return {
        label: t('project.syncStatus.projectOnly'),
        className: 'bg-surface-hover text-muted',
      }
  }
}

export function getAssignedAgents(variants: ProjectSkill[]) {
  return Array.from(new Set(variants.map((variant) => variant.agent))).sort()
}

export function getAgentDotTargets(variants: ProjectSkill[]) {
  const seen = new Set<string>()
  const targets: { key: string; display_name: string }[] = []
  for (const v of variants) {
    if (!seen.has(v.agent)) {
      seen.add(v.agent)
      targets.push({ key: v.agent, display_name: v.agent_display_name })
    }
  }
  return targets
}

export function getGroupStatus(
  variants: ProjectSkill[],
): ProjectSkill['sync_status'] {
  const priority: ProjectSkill['sync_status'][] = [
    'diverged',
    'project_newer',
    'center_newer',
    'project_only',
    'in_sync',
  ]
  for (const status of priority) {
    if (variants.some((variant) => variant.sync_status === status)) {
      return status
    }
  }
  return 'project_only'
}
