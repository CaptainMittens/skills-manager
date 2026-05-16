import { type Dispatch, type SetStateAction } from 'react'
import {
  FileText,
  Upload,
  Download,
  RotateCcw,
  Loader2,
  Trash2,
  SquareCheck,
  Square,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'
import { getTagColor } from '../../lib/skillTags'
import { ProjectAgentDots } from '../../components/ProjectAgentDots'
import {
  getSyncStatusMeta,
  getAssignedAgents,
  type ProjectSkillGroup,
} from './projectSkillUtils'
import { type Project, type ProjectAgentTarget } from '../../lib/tauri'

interface ProjectSkillGridProps {
  filtered: ProjectSkillGroup[]
  viewMode: 'grid' | 'list'
  getSkillKey: (skill: Pick<ProjectSkillGroup, 'id'>) => string
  selectedIds: Set<string>
  isMultiSelect: boolean
  updatingCenterSkill: string | null
  updatingProjectSkill: string | null
  togglingSkill: string | null
  togglingAgentTarget: { skillKey: string; agent: string } | null
  allTags: string[]
  exportTargets: ProjectAgentTarget[]
  project: Project
  toggleSelect: (key: string) => void
  handleOpenDetail: (skill: ProjectSkillGroup) => void
  handleToggleSkill: (skill: ProjectSkillGroup) => Promise<void>
  handleUpdateCenter: (skill: ProjectSkillGroup) => Promise<void>
  handleUpdateProject: (skill: ProjectSkillGroup) => Promise<void>
  handleToggleDetailAgent: (
    skill: ProjectSkillGroup,
    agentKey: string,
    enabled: boolean,
  ) => Promise<void>
  setDeleteTarget: Dispatch<SetStateAction<ProjectSkillGroup | null>>
}

export function ProjectSkillGrid({
  filtered,
  viewMode,
  getSkillKey,
  selectedIds,
  isMultiSelect,
  updatingCenterSkill,
  updatingProjectSkill,
  togglingSkill,
  togglingAgentTarget,
  allTags,
  exportTargets,
  project,
  toggleSelect,
  handleOpenDetail,
  handleToggleSkill,
  handleUpdateCenter,
  handleUpdateProject,
  handleToggleDetailAgent,
  setDeleteTarget,
}: ProjectSkillGridProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'pb-8',
        viewMode === 'grid'
          ? 'grid grid-cols-2 gap-3 lg:grid-cols-3'
          : 'flex flex-col gap-0.5',
      )}
    >
      {filtered.map((skill) => {
        const skillKey = getSkillKey(skill)
        const isSelected = selectedIds.has(skillKey)
        const isUpdatingCenter = updatingCenterSkill === skillKey
        const isUpdatingProject = updatingProjectSkill === skillKey
        const isToggling = togglingSkill === skillKey
        const canUpdateCenter =
          skill.status === 'project_only' ||
          skill.status === 'project_newer' ||
          skill.status === 'diverged'
        const canUpdateProject =
          skill.status === 'project_newer' ||
          skill.status === 'center_newer' ||
          skill.status === 'diverged'
        const statusMeta = getSyncStatusMeta(t, skill.status)
        const assignedAgents = getAssignedAgents(skill.variants)

        if (viewMode === 'grid') {
          return (
            <div
              key={skillKey}
              className={cn(
                'app-panel group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all hover:border-border hover:bg-surface-hover',
                skill.enabledCount > 0 && 'border-l-2 border-l-accent',
                skill.enabledCount === 0 && 'opacity-60',
                isMultiSelect &&
                  isSelected &&
                  'ring-1 ring-accent border-accent/40',
              )}
              onClick={() =>
                isMultiSelect ? toggleSelect(skillKey) : handleOpenDetail(skill)
              }
            >
              <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
                {isMultiSelect &&
                  (isSelected ? (
                    <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
                  ))}
                <h3
                  className="flex-1 truncate text-[14px] font-semibold text-primary"
                  title={skill.name}
                >
                  {skill.name}
                </h3>
                {skill.files.length > 0 && (
                  <span className="flex items-center gap-1 text-[12px] text-faint shrink-0">
                    <FileText className="w-3 h-3" />
                    {skill.files.length}
                  </span>
                )}
              </div>

              <div className="px-3.5 pb-3">
                <p className="text-[13px] leading-[18px] text-muted truncate">
                  {skill.description || '—'}
                </p>
                {skill.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          getTagColor(tag, allTags),
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[12px] font-medium',
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                  {skill.enabledCount === 0 && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[12px] font-medium text-red-600 dark:text-red-300">
                      {t('project.disabled')}
                    </span>
                  )}
                </div>
                {!isMultiSelect && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ProjectAgentDots
                      assignedAgents={assignedAgents}
                      targets={exportTargets}
                      limit={4}
                      size="sm"
                      onToggle={(agentKey, enabled) =>
                        handleToggleDetailAgent(skill, agentKey, enabled)
                      }
                      pendingKey={
                        togglingAgentTarget?.skillKey === skillKey
                          ? togglingAgentTarget.agent
                          : null
                      }
                    />
                    {canUpdateCenter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateCenter(skill)
                        }}
                        disabled={isUpdatingCenter || isUpdatingProject}
                        className="rounded px-2 py-1 text-[13px] font-medium text-muted transition-colors outline-none hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                        title={t('project.updateCenter')}
                      >
                        {isUpdatingCenter ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {canUpdateProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateProject(skill)
                        }}
                        disabled={isUpdatingCenter || isUpdatingProject}
                        className="rounded px-2 py-1 text-[13px] font-medium text-muted transition-colors outline-none hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                        title={
                          skill.status === 'project_newer'
                            ? t('project.resetFromCenter')
                            : t('project.updateProject')
                        }
                      >
                        {isUpdatingProject ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : skill.status === 'project_newer' ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    {project.supports_skill_toggle ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSkill(skill)
                        }}
                        disabled={isToggling}
                        className={cn(
                          'rounded px-2 py-1 text-[13px] font-medium transition-colors outline-none',
                          skill.enabledCount > 0
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-muted hover:bg-surface-hover hover:text-secondary',
                        )}
                      >
                        {isToggling ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : skill.enabledCount === skill.totalCount ? (
                          t('project.enabled')
                        ) : (
                          t('project.enableSkill')
                        )}
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(skill)
                      }}
                      className="rounded px-2 py-1 text-muted transition-colors outline-none opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                      title={t('project.deleteSkill')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }

        // List view
        return (
          <div
            key={skillKey}
            className={cn(
              'app-panel group flex cursor-pointer items-center gap-3.5 rounded-xl border-transparent px-3.5 py-3 transition-all hover:border-border hover:bg-surface-hover',
              skill.enabledCount > 0 && 'border-l-2 border-l-accent',
              skill.enabledCount === 0 && 'opacity-60',
              isMultiSelect &&
                isSelected &&
                'ring-1 ring-accent border-accent/40',
            )}
            onClick={() =>
              isMultiSelect ? toggleSelect(skillKey) : handleOpenDetail(skill)
            }
          >
            {isMultiSelect &&
              (isSelected ? (
                <SquareCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
              ) : (
                <Square className="h-3.5 w-3.5 shrink-0 text-faint" />
              ))}
            <h3
              className="w-[180px] shrink-0 truncate text-[14px] font-semibold text-secondary"
              title={skill.name}
            >
              {skill.name}
            </h3>

            <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
              {skill.description || '—'}
            </p>

            {skill.tags.length > 0 && (
              <div className="flex shrink-0 items-center gap-1.5">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                      getTagColor(tag, allTags),
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[12px] font-medium',
                  statusMeta.className,
                )}
              >
                {statusMeta.label}
              </span>
              {skill.enabledCount === 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[12px] font-medium text-red-600 dark:text-red-300">
                  {t('project.disabled')}
                </span>
              )}
              {skill.files.length > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-faint">
                  <FileText className="w-3 h-3" />
                  {skill.files.length}
                </span>
              )}
              <ProjectAgentDots
                assignedAgents={assignedAgents}
                targets={exportTargets}
                limit={4}
                size="sm"
                onToggle={
                  isMultiSelect
                    ? undefined
                    : (agentKey, enabled) =>
                        handleToggleDetailAgent(skill, agentKey, enabled)
                }
                pendingKey={
                  togglingAgentTarget?.skillKey === skillKey
                    ? togglingAgentTarget.agent
                    : null
                }
              />
            </div>

            {!isMultiSelect && (
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {canUpdateCenter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpdateCenter(skill)
                    }}
                    disabled={isUpdatingCenter || isUpdatingProject}
                    className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                    title={t('project.updateCenter')}
                  >
                    {isUpdatingCenter ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {canUpdateProject && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpdateProject(skill)
                    }}
                    disabled={isUpdatingCenter || isUpdatingProject}
                    className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-secondary disabled:opacity-50"
                    title={
                      skill.status === 'project_newer'
                        ? t('project.resetFromCenter')
                        : t('project.updateProject')
                    }
                  >
                    {isUpdatingProject ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : skill.status === 'project_newer' ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {project.supports_skill_toggle ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleSkill(skill)
                    }}
                    disabled={isToggling}
                    className={cn(
                      'rounded px-2 py-0.5 text-[13px] font-medium transition-colors outline-none',
                      skill.enabledCount > 0
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-muted hover:bg-surface-hover hover:text-secondary',
                    )}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : skill.enabledCount === skill.totalCount ? (
                      t('project.enabled')
                    ) : (
                      t('project.enableSkill')
                    )}
                  </button>
                ) : null}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(skill)
                  }}
                  className="rounded p-0.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                  title={t('project.deleteSkill')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
